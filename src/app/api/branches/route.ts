import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shouldSeed = searchParams.get("seed") === "1";

  if (shouldSeed) {
    const defaults = ["Head Office", "Branch 1", "Branch 2", "Warehouse", "IT Department"];
    for (const name of defaults) {
      await prisma.branch.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { checklists: true },
      },
    },
  });

  return NextResponse.json(branches, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
    }

    const existing = await prisma.branch.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Branch "${name}" already exists.` }, { status: 409 });
    }

    const branch = await prisma.branch.create({
      data: { name },
      include: {
        _count: {
          select: { checklists: true },
        },
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create branch." }, { status: 500 });
  }
}

// Bulk DELETE /api/branches - delete multiple branches at once
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No branch IDs provided." }, { status: 400 });
    }

    // Safely unlink checklists first
    await prisma.checklist.updateMany({
      where: { branchId: { in: ids } },
      data: { branchId: null },
    });

    const result = await prisma.branch.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete branches." }, { status: 500 });
  }
}
