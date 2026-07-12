import { NextResponse } from "next/server";
import { fetchExposedModels } from "@/lib/litellm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const models = await fetchExposedModels();
    return NextResponse.json(models);
  } catch {
    return NextResponse.json({ error: "Unable to load models" }, { status: 502 });
  }
}
