import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE /api/checklists/[id]/items/[resultId] - remove item from this specific checklist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, resultId } = await params;

  const checklist = await prisma.checklist.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

  if (checklist.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Items can only be removed while the checklist is in DRAFT status." },
      { status: 400 }
    );
  }

  try {
    await prisma.checklistResult.delete({
      where: {
        id: resultId,
        checklistId: id,
      },
    });

    return NextResponse.json({ success: true, message: "Item removed from this checklist." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove item from checklist." },
      { status: 500 }
    );
  }
}

// PATCH /api/checklists/[id]/items/[resultId] - update single item status/notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, resultId } = await params;
  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.isChecked !== undefined) updateData.isChecked = Boolean(body.isChecked);
    if (body.notes !== undefined) updateData.notes = (body.notes || "").trim() || null;

    const updated = await prisma.checklistResult.update({
      where: {
        id: resultId,
        checklistId: id,
      },
      data: updateData,
      include: { softwareItem: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update checklist item." },
      { status: 500 }
    );
  }
}
