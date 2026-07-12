import { http } from "./axios";
import {
  CreatedVirtualKey,
  CreateVirtualKeyInput,
  UpdateBudgetInput,
  VirtualKeyList,
  ModelInfo,
  DashboardStats,
  StatsScope,
  UsageSummary,
  SpendLog,
  LiteLLMUserList,
  UserUsage,
} from "./types";

export async function fetchKeys(page = 1, size = 20): Promise<VirtualKeyList> {
  const { data } = await http.get<VirtualKeyList>("/api/keys", { params: { page, size } });
  return data;
}

export async function createKey(payload: CreateVirtualKeyInput): Promise<CreatedVirtualKey> {
  const { data } = await http.post<CreatedVirtualKey>("/api/keys", payload);
  return data;
}

export async function deleteKey(tokenId: string): Promise<void> {
  await http.delete(`/api/keys/${tokenId}`);
}

export async function updateKeyBudget(
  tokenId: string,
  payload: UpdateBudgetInput
): Promise<void> {
  await http.patch(`/api/keys/${tokenId}`, payload);
}

export async function fetchUsers(page = 1, size = 20): Promise<LiteLLMUserList> {
  const { data } = await http.get<LiteLLMUserList>("/api/users", { params: { page, size } });
  return data;
}

export async function fetchUserUsage(userId: string): Promise<UserUsage> {
  const { data } = await http.get<UserUsage>(
    `/api/users/${encodeURIComponent(userId)}/usage`
  );
  return data;
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const { data } = await http.get<ModelInfo[]>("/api/models");
  return data;
}

export async function fetchDashboard(scope?: StatsScope): Promise<DashboardStats> {
  const { data } = await http.get<DashboardStats>("/api/dashboard", { params: { scope } });
  return data;
}

export async function fetchUsage(scope?: StatsScope): Promise<UsageSummary> {
  const { data } = await http.get<UsageSummary>("/api/usage/summary", { params: { scope } });
  return data;
}

export async function fetchSpendLogs(scope?: StatsScope): Promise<SpendLog[]> {
  const { data } = await http.get<SpendLog[]>("/api/usage/logs", { params: { scope } });
  return data;
}
