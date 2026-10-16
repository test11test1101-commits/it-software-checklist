import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_SECTIONS = ["FIRST", "SECOND", "THIRD", "FOURTH", "FINAL"] as const;

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
    const updateData: any = {};

    if (body.name !== undefined) {
      const name = (body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Item name cannot be empty." }, { status: 400 });
      }
      updateData.name = name;
    }

    if (body.section !== undefined) {
      if (!VALID_SECTIONS.includes(body.section)) {
        return NextResponse.json(
          { error: "Invalid section. Must be FIRST, SECOND, THIRD, FOURTH, or FINAL." },
          { status: 400 }
        );
      }
      updateData.section = body.section;
    }

    if (body.description !== undefined) {
      updateData.description = (body.description || "").trim() || null;
    }

    if (body.order !== undefined) {
      const order = typeof body.order === "number" ? body.order : parseInt(body.order, 10);
      if (!isNaN(order) && order >= 1) {
        updateData.order = order;
      }
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    const updated = await prisma.softwareItem.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update software item." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
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
    const item = await prisma.softwareItem.findUnique({
      where: { id },
      include: { _count: { select: { results: true } } },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item._count.results > 0) {
      // Deactivate instead of deleting to keep historical data intact
      await prisma.softwareItem.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        deactivated: true,
        message: `"${item.name}" was deactivated because it is linked to existing checklists. It will no longer appear on future checklists.`,
      });
    }

    await prisma.softwareItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deleted: true,
      message: `"${item.name}" was permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete software item." },
      { status: 500 }
    );
  }
}
