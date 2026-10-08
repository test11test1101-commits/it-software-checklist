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
    const defaults = [
      "IT Department",
      "Finance",
      "Accounting",
      "Human Resources",
      "Operations",
      "Logistics",
      "Sales & Marketing",
      "Administration",
      "Customer Support",
      "Executive Office",
    ];
    for (const name of defaults) {
      await prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments, {
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
      return NextResponse.json({ error: "Department name is required." }, { status: 400 });
    }

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Department "${name}" already exists.` }, { status: 409 });
    }

    const dept = await prisma.department.create({
      data: { name },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create department." }, { status: 500 });
  }
}

// Bulk DELETE /api/departments - delete multiple departments at once
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
      return NextResponse.json({ error: "No department IDs provided." }, { status: 400 });
    }

    const result = await prisma.department.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete departments." }, { status: 500 });
  }
}
