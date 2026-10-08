import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { checklists: true },
      },
    },
  });

  // Self-seed default branches if empty
  if (branches.length === 0) {
    const defaults = ["Head Office", "Branch 1", "Branch 2", "Warehouse", "IT Department"];
    for (const name of defaults) {
      await prisma.branch.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { checklists: true },
        },
      },
    });
  }

  return NextResponse.json(branches);
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
