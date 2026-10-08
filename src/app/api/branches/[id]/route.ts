import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
    }

    // Check if name is taken by another branch
    const existing = await prisma.branch.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Branch name "${name}" is already in use.` }, { status: 409 });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { name },
      include: {
        _count: {
          select: { checklists: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update branch." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  try {
    // Safely unlink checklists first so historical checklists are not broken
    await prisma.checklist.updateMany({
      where: { branchId: id },
      data: { branchId: null },
    });

    await prisma.branch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete branch." }, { status: 500 });
  }
}
