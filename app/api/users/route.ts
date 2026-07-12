import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { keyListQuerySchema } from "@/lib/key-validation";
import { listLiteLLMUsers } from "@/lib/litellm";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const result = await listLiteLLMUsers(query.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to load users" }, { status: 502 });
  }
}
