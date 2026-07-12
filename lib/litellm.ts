import axios from "axios";
import {
  CreateVirtualKeyInput,
  ModelInfo,
  UsageSummary,
  VirtualKey,
  VirtualKeyList,
} from "./types";

// LITELLM_PROXY_URL may end in /v1 (OpenAI-compatible chat path). Management
// endpoints (/model/info, /spend/logs) live at the proxy root, so strip /v1.
// For server-to-server calls we prefer LITELLM_PROXY_INTERNAL_URL when the
// public URL is fronted by Cloudflare/a WAF; point it at the proxy's LAN
// address (e.g. http://litellm:4000) to bypass it.
const rawBase = (
  process.env.LITELLM_PROXY_INTERNAL_URL ??
  process.env.LITELLM_PROXY_URL ??
  "http://localhost:4000"
).replace(/\/v1\/?$/i, "");

export const proxy = axios.create({
  baseURL: rawBase,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY ?? ""}`,
    "Content-Type": "application/json",
  },
});

interface ModelInfoRaw {
  model_name: string;
  litellm_params?: {
    model?: string;
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    max_tokens?: number;
  };
  model_info?: {
    litellm_provider?: string;
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    max_tokens?: number;
  };
}

interface LiteLLMKeyRaw {
  token?: string;
  key_name?: string | null;
  key_alias?: string | null;
  models?: string[] | null;
  spend?: number | null;
  max_budget?: number | null;
  budget_duration?: string | null;
  user_id?: string | null;
  expires?: string | null;
  created_at?: string | null;
  blocked?: boolean | null;
}

interface LiteLLMKeyListResponse {
  keys?: LiteLLMKeyRaw[];
  total_count?: number;
  current_page?: number;
  total_pages?: number;
}

interface DetailedSpendLog {
  startTime?: string | null;
  spend?: number | null;
  total_tokens?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  model?: string | null;
  api_key?: string | null;
}

interface DetailedSpendLogResponse {
  data?: DetailedSpendLog[];
  total?: number;
  total_pages?: number;
}

function mapVirtualKey(key: LiteLLMKeyRaw, tokenOverride?: string): VirtualKey {
  const expires = key.expires ?? null;
  const status = key.blocked
    ? "blocked"
    : expires && new Date(expires).getTime() <= Date.now()
      ? "expired"
      : "active";

  return {
    token_id: tokenOverride ?? key.token ?? "",
    key_name: key.key_name ?? "masked key",
    key_alias: key.key_alias ?? null,
    models: key.models ?? [],
    spend: Number(key.spend ?? 0),
    max_budget: key.max_budget ?? null,
    budget_duration: key.budget_duration ?? null,
    user_id: key.user_id ?? "",
    status,
    expires,
    created_at: key.created_at ?? null,
  };
}

/**
 * Returns every model the LiteLLM proxy currently exposes (its `model_list`).
 * Pricing is taken from the proxy's own cost map — we never invent providers.
 * Cost may live in either `model_info` or `litellm_params`, so we check both.
 */
export async function fetchExposedModels(): Promise<ModelInfo[]> {
  const { data } = await proxy.get<{ data: ModelInfoRaw[] }>("/model/info");
  return (data.data ?? []).map((m) => {
    const params = m.litellm_params ?? {};
    const info = m.model_info ?? {};
    const litellmModel = params.model ?? m.model_name;
    const provider =
      info.litellm_provider ??
      (litellmModel.includes("/") ? litellmModel.split("/")[0] : "unknown");
    const inputCostPerToken = info.input_cost_per_token ?? params.input_cost_per_token ?? 0;
    const outputCostPerToken = info.output_cost_per_token ?? params.output_cost_per_token ?? 0;
    return {
      model_name: m.model_name,
      litellm_model: litellmModel,
      provider,
      context_window: info.max_tokens ?? params.max_tokens ?? 0,
      input_cost_per_1m: Number(inputCostPerToken) * 1_000_000,
      output_cost_per_1m: Number(outputCostPerToken) * 1_000_000,
    };
  });
}

export async function listVirtualKeys({
  page,
  size,
  userId,
}: {
  page: number;
  size: number;
  userId?: string;
}): Promise<VirtualKeyList> {
  const { data } = await proxy.get<LiteLLMKeyListResponse>("/key/list", {
    params: {
      page,
      size,
      return_full_object: true,
      ...(userId ? { user_id: userId } : {}),
    },
  });

  return {
    keys: (data.keys ?? []).map((key) => mapVirtualKey(key)),
    total_count: data.total_count ?? 0,
    current_page: data.current_page ?? page,
    total_pages: data.total_pages ?? 0,
  };
}

export async function countActiveVirtualKeys(userId?: string): Promise<number> {
  let page = 1;
  let totalPages = 1;
  let active = 0;

  do {
    const result = await listVirtualKeys({ page, size: 100, userId });
    active += result.keys.filter(
      (key) => key.status === "active" && (!userId || key.user_id === userId)
    ).length;
    totalPages = result.total_pages;
    page += 1;
  } while (page <= totalPages);

  return active;
}

/**
 * Total spend across keys, summed from each key's `spend` field.
 * This is the authoritative total: LiteLLM tracks per-key spend even when it
 * fails to write a row to its `/spend/logs` table (e.g. for some models), so
 * the spend-log aggregation undercounts. Use this for headline totals.
 */
export async function getTotalKeysSpend(userId?: string): Promise<number> {
  let page = 1;
  let totalPages = 1;
  let total = 0;

  do {
    const result = await listVirtualKeys({ page, size: 100, userId });
    total += result.keys.reduce((sum, key) => sum + key.spend, 0);
    totalPages = result.total_pages;
    page += 1;
  } while (page <= totalPages);

  return Number(total.toFixed(2));
}

export async function generateVirtualKey({
  input,
  userId,
  changedBy,
}: {
  input: CreateVirtualKeyInput;
  userId: string;
  changedBy: string;
}): Promise<string> {
  const { data } = await proxy.post<{ key?: string }>(
    "/key/generate",
    { ...input, user_id: userId },
    { headers: { "litellm-changed-by": changedBy } }
  );
  if (!data.key) throw new Error("LiteLLM did not return a generated key");
  return data.key;
}

export async function getVirtualKey(token: string): Promise<VirtualKey | null> {
  try {
    const { data } = await proxy.get<{ info?: LiteLLMKeyRaw }>("/key/info", {
      params: { key: token },
    });
    return data.info ? mapVirtualKey(data.info, token) : null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function deleteVirtualKey(token: string, changedBy: string): Promise<void> {
  await proxy.post(
    "/key/delete",
    { keys: [token] },
    { headers: { "litellm-changed-by": changedBy } }
  );
}

export async function updateVirtualKeyBudget({
  token,
  maxBudget,
  budgetDuration,
  changedBy,
}: {
  token: string;
  maxBudget: number;
  budgetDuration: string;
  changedBy: string;
}): Promise<void> {
  await proxy.post(
    "/key/update",
    { key: token, max_budget: maxBudget, budget_duration: budgetDuration },
    { headers: { "litellm-changed-by": changedBy } }
  );
}

interface LiteLLMUserRaw {
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  spend?: number | null;
  max_budget?: number | null;
  created_at?: string | null;
}

interface LiteLLMUserListResponse {
  users?: LiteLLMUserRaw[];
  total_count?: number;
  current_page?: number;
  total_pages?: number;
}

function mapLiteLLMUser(user: LiteLLMUserRaw): import("./types").LiteLLMUser {
  return {
    user_id: user.user_id ?? "",
    user_email: user.user_email ?? null,
    user_role: user.user_role ?? "app_user",
    spend: Number(user.spend ?? 0),
    max_budget: user.max_budget ?? null,
    created_at: user.created_at ?? null,
  };
}

/**
 * Best-effort: make sure an internal LiteLLM user exists for the given id.
 * Called on login so keys and spend can be attributed to a real LiteLLM user.
 * Never throws — a failure must not block authentication.
 */
export async function ensureLiteLLMUser({
  userId,
  email,
  role,
}: {
  userId: string;
  email?: string | null;
  role: "admin" | "user";
}): Promise<void> {
  const userRole = role === "admin" ? "app_admin" : "app_user";

  try {
    const existing = await proxy.get<{ user_id?: string }>("/user/info", {
      params: { user_id: userId },
    });
    if (existing.status === 200 && existing.data?.user_id) return;
  } catch {
    // user not found (or proxy hiccup) — fall through to create
  }

  try {
    await proxy.post("/user/new", {
      user_id: userId,
      user_email: email ?? undefined,
      user_role: userRole,
    });
  } catch (error) {
    // 400 typically means the user already exists — that's fine.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status !== 400) {
      console.warn(`ensureLiteLLMUser: failed to create user "${userId}"`, error);
    }
  }
}

export async function listLiteLLMUsers({
  page,
  size,
}: {
  page: number;
  size: number;
}): Promise<import("./types").LiteLLMUserList> {
  const { data } = await proxy.get<LiteLLMUserListResponse>("/user/list", {
    params: { page, size },
  });

  return {
    users: (data.users ?? []).map(mapLiteLLMUser),
    total_count: data.total_count ?? 0,
    current_page: data.current_page ?? page,
    total_pages: data.total_pages ?? 0,
  };
}

/** Per-customer usage aggregated from LiteLLM spend logs (master/admin view). */
export async function getUserUsage(userId: string): Promise<import("./types").UserUsage> {
  const [days, metrics, total_spend, pricing] = await Promise.all([
    fetchSpendLogs(userId),
    fetchSpendMetrics(userId),
    getTotalKeysSpend(userId),
    fetchModelPricing().catch(() => undefined),
  ]);
  const usage = aggregateSpend(days, pricing);
  return {
    user_id: userId,
    total_spend,
    total_tokens: metrics.total_tokens,
    total_requests: metrics.total_requests,
    spend_series: usage.by_day,
    top_models: usage.by_model.slice(0, 8),
  };
}

export interface SpendDay {
  startTime: string;
  spend: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  model: string;
  api_key: string;
  [key: string]: unknown;
}

export interface ModelPricing {
  input: number;
  output: number;
}

/**
 * Maps every model the proxy exposes to its per-1M-token pricing, keyed by both
 * the exposed `model_name` and the underlying `litellm_model` so lookups succeed
 * whether the log references the friendly name or the provider path.
 */
export async function fetchModelPricing(): Promise<Record<string, ModelPricing>> {
  const models = await fetchExposedModels();
  const pricing: Record<string, ModelPricing> = {};
  for (const m of models) {
    const entry = { input: m.input_cost_per_1m, output: m.output_cost_per_1m };
    // LiteLLM logs sometimes reference the model with "/" where the proxy's
    // model_name uses "-", so index both forms for reliable lookups.
    const keys = new Set([m.model_name, m.litellm_model, m.model_name.replace(/\//g, "-"), m.litellm_model.replace(/\//g, "-")]);
    for (const k of keys) if (k) pricing[k] = entry;
  }
  return pricing;
}

/**
 * Detailed spend-log rows from the LiteLLM proxy (v2 endpoint). Each row maps
 * to one request and carries the `model` used, so we can build an accurate
 * per-model breakdown (the daily v1 rollup's `models` map is not always
 * populated). Paginates through every page.
 */
export async function fetchSpendLogs(user_id?: string): Promise<SpendDay[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 86_400_000);
  let page = 1;
  let totalPages = 1;
  const rows: SpendDay[] = [];

  do {
    const { data } = await proxy.get<DetailedSpendLogResponse>("/spend/logs/v2", {
      params: {
        page,
        page_size: 100,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        ...(user_id ? { user_id } : {}),
      },
    });
  for (const r of data.data ?? []) {
       rows.push({
         startTime: r.startTime ?? "",
         spend: Number(r.spend ?? 0),
         total_tokens: Number(r.total_tokens ?? 0),
         prompt_tokens: Number(r.prompt_tokens ?? 0),
         completion_tokens: Number(r.completion_tokens ?? 0),
         model: r.model ?? "unknown",
         api_key: r.api_key ?? "",
       });
     }
    totalPages = data.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return rows;
}

export async function fetchSpendMetrics(
  user_id?: string
): Promise<{ total_tokens: number; total_requests: number }> {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 86_400_000);
  let page = 1;
  let totalPages = 1;
  let totalTokens = 0;
  let totalRequests = 0;

  do {
    const { data } = await proxy.get<DetailedSpendLogResponse>("/spend/logs/v2", {
      params: {
        page,
        page_size: 100,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        ...(user_id ? { user_id } : {}),
      },
    });
    const rows = data.data ?? [];
    totalTokens += rows.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0);
    totalRequests += rows.length;
    totalPages = data.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return { total_tokens: totalTokens, total_requests: totalRequests };
}

/** Aggregate LiteLLM spend-log rows into the dashboard/usage shape. */
export function aggregateSpend(days: SpendDay[], pricing?: Record<string, ModelPricing>) {
  const by_day_map = new Map<string, { spend: number; tokens: number; est: number }>();
  const by_model_map = new Map<string, { spend: number; tokens: number; est: number }>();
  const by_key_map = new Map<string, { spend: number; tokens: number; est: number }>();

  for (const d of days) {
    const p =
      pricing?.[d.model] ?? pricing?.[d.model.replace(/\//g, "-")];
    const est =
      p && (d.prompt_tokens || d.completion_tokens)
        ? (d.prompt_tokens / 1_000_000) * p.input +
          (d.completion_tokens / 1_000_000) * p.output
        : 0;
    // Recorded spend is authoritative when LiteLLM reports it (paid models);
    // only fall back to the token×pricing estimate for rows with $0 spend.
    const effective = d.spend > 0 ? d.spend : est;

    const date = (d.startTime ?? "").slice(0, 10);
    const dayEntry = by_day_map.get(date) ?? { spend: 0, tokens: 0, est: 0 };
    dayEntry.spend += d.spend;
    dayEntry.tokens += d.total_tokens;
    dayEntry.est += effective;
    by_day_map.set(date, dayEntry);

    if (d.model) {
      const m = by_model_map.get(d.model) ?? { spend: 0, tokens: 0, est: 0 };
      m.spend += d.spend;
      m.tokens += d.total_tokens;
      m.est += effective;
      by_model_map.set(d.model, m);
    }
    if (d.api_key) {
      const k = by_key_map.get(d.api_key) ?? { spend: 0, tokens: 0, est: 0 };
      k.spend += d.spend;
      k.tokens += d.total_tokens;
      k.est += effective;
      by_key_map.set(d.api_key, k);
    }
  }

  const by_day = [...by_day_map]
    .map(([date, value]) => ({
      date,
      spend: Number(value.spend.toFixed(4)),
      tokens: value.tokens,
      est_cost: Number(value.est.toFixed(4)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const by_model = [...by_model_map]
    .map(([model, value]) => ({
      model,
      spend: Number(value.spend.toFixed(4)),
      tokens: value.tokens,
      est_cost: Number(value.est.toFixed(4)),
    }))
    .sort((a, b) => b.est_cost - a.est_cost);
  const by_key = [...by_key_map]
    .map(([key, value]) => ({
      key,
      spend: Number(value.spend.toFixed(4)),
      tokens: value.tokens,
      est_cost: Number(value.est.toFixed(4)),
    }))
    .sort((a, b) => b.est_cost - a.est_cost);

  return { by_day, by_model, by_key };
}
