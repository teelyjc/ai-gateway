import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateBudgetSchema } from "@/lib/key-validation";
import { deleteVirtualKey, getVirtualKey, updateVirtualKeyBudget } from "@/lib/litellm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const key = await getVirtualKey(id);
    if (!key) {
      return NextResponse.json({ error: "Virtual key not found" }, { status: 404 });
    }
    if (user.role !== "admin" && key.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteVirtualKey(id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Unable to revoke virtual key" }, { status: 502 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const key = await getVirtualKey(id);
    if (!key) {
      return NextResponse.json({ error: "Virtual key not found" }, { status: 404 });
    }
    if (user.role !== "admin" && key.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = updateBudgetSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid budget" },
        { status: 422 }
      );
    }
    await updateVirtualKeyBudget({
      token: id,
      maxBudget: body.data.max_budget,
      budgetDuration: body.data.budget_duration,
      changedBy: user.id,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Unable to update key budget" }, { status: 502 });
  }
}
