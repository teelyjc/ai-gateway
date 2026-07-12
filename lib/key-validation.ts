import { z } from "zod";

export const createVirtualKeySchema = z.object({
  key_alias: z
    .string()
    .trim()
    .min(1, "Alias is required")
    .max(64, "Alias must be 64 characters or fewer")
    .regex(/^[a-zA-Z0-9._ -]+$/, "Alias contains unsupported characters"),
  models: z.array(z.string().trim().min(1)).min(1, "Select at least one model").max(100),
  max_budget: z.number().positive("Budget must be greater than zero").max(1_000_000),
  budget_duration: z.enum(["1d", "1w", "1mo", "3mo"]),
});

export const keyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateBudgetSchema = z.object({
  max_budget: z
    .number()
    .positive("Budget must be greater than zero")
    .max(1000000),
  budget_duration: z.enum(["1d", "1w", "1mo", "3mo"]),
});
