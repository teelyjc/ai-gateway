import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createVirtualKeySchema, keyListQuerySchema } from "@/lib/key-validation";
import {
  fetchExposedModels,
  generateVirtualKey,
  listVirtualKeys,
} from "@/lib/litellm";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = keyListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    size: url.searchParams.get("size") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json({ error: "Invalid pagination" }, { status: 422 });
  }

  try {
    const result = await listVirtualKeys({
      ...query.data,
      userId: user.role === "admin" ? undefined : user.id,
    });
    // The app uses a proxy-admin key, so enforce user ownership again locally.
    if (user.role !== "admin") {
      result.keys = result.keys.filter((key) => key.user_id === user.id);
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to load virtual keys" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const input = createVirtualKeySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json(
      { error: input.error.issues[0]?.message ?? "Invalid key configuration" },
      { status: 422 }
    );
  }

  try {
    const exposedModels = new Set(
      (await fetchExposedModels()).map((model) => model.model_name)
    );
    if (input.data.models.some((model) => !exposedModels.has(model))) {
      return NextResponse.json({ error: "One or more models are not exposed" }, { status: 422 });
    }

    const secret = await generateVirtualKey({
      input: input.data,
      userId: user.id,
      changedBy: user.id,
    });
    return NextResponse.json({ secret }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create virtual key" }, { status: 502 });
  }
}
