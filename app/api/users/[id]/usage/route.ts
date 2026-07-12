import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserUsage } from "@/lib/litellm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const usage = await getUserUsage(decodeURIComponent(id));
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ error: "Unable to load customer usage" }, { status: 502 });
  }
}
