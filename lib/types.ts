export type KeyStatus = "active" | "expired" | "blocked";

export interface VirtualKey {
  token_id: string;
  key_name: string;
  key_alias: string | null;
  models: string[];
  spend: number;
  max_budget: number | null;
  budget_duration: string | null;
  user_id: string;
  status: KeyStatus;
  expires: string | null;
  created_at: string | null;
}

export interface VirtualKeyList {
  keys: VirtualKey[];
  total_count: number;
  current_page: number;
  total_pages: number;
}

export interface LiteLLMUser {
  user_id: string;
  user_email: string | null;
  user_role: string;
  spend: number;
  max_budget: number | null;
  created_at: string | null;
}

export interface LiteLLMUserList {
  users: LiteLLMUser[];
  total_count: number;
  current_page: number;
  total_pages: number;
}

export interface UserUsage {
  user_id: string;
  total_spend: number;
  total_tokens: number;
  total_requests: number;
  spend_series: { date: string; spend: number }[];
  top_models: { model: string; spend: number }[];
}

export interface CreateVirtualKeyInput {
  key_alias: string;
  models: string[];
  max_budget: number;
  budget_duration: "1d" | "1w" | "1mo" | "3mo";
}

export interface UpdateBudgetInput {
  max_budget: number;
  budget_duration: "1d" | "1w" | "1mo" | "3mo";
}

export interface CreatedVirtualKey {
  secret: string;
}

export interface ModelInfo {
  model_name: string;
  litellm_model: string;
  provider: string;
  context_window: number;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
}

export interface SpendLog {
  id: string;
  model: string;
  api_key: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  spend: number;
  est_cost: number;
  startTime: string;
}

export type StatsScope = "mine" | "all";

export interface DashboardStats {
  total_spend: number;
  active_keys: number;
  total_tokens: number;
  total_requests: number;
  spend_series: { date: string; spend: number }[];
  top_models: { model: string; spend: number }[];
  scope: StatsScope;
  can_view_all: boolean;
}

export interface UsageSummary {
  by_day: { date: string; spend: number; tokens: number; est_cost: number }[];
  by_model: { model: string; spend: number; tokens: number; est_cost: number }[];
  by_key: { key: string; spend: number; tokens: number; est_cost: number }[];
  by_user: { user: string; spend: number; tokens: number }[];
  total_tokens: number;
  total_requests: number;
  scope: StatsScope;
  can_view_all: boolean;
}
