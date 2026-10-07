import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/checklists - list all checklists
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const checklists = await prisma.checklist.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { computerName: { contains: search } },
              { installerName: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      branch: true,
      installer: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checklists);
}

// POST /api/checklists - create new checklist
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Load all active software items to create results
  const softwareItems = await prisma.softwareItem.findMany({
    where: { isActive: true },
    orderBy: [{ section: "asc" }, { order: "asc" }],
  });

  const userId = session.user?.id;
  const userName = session.user?.name;

  const checklist = await prisma.checklist.create({
    data: {
      branchId: body.branchId || undefined,
      department: body.department,
      date: body.date ? new Date(body.date) : new Date(),
      computerName: body.computerName,
      operatingSystem: body.operatingSystem,
      hddSsdSerial: body.hddSsdSerial,
      installerId: userId,
      installerName: body.installerName || userName || "IT Personnel",
      preparedByName: body.preparedByName,
      checkedByName: body.checkedByName,
      approvedByName: body.approvedByName,
      status: "DRAFT",
      results: {
        create: softwareItems.map((item: { id: string }) => ({
          softwareItemId: item.id,
          isChecked: false,
        })),
      },
    },
    include: {
      results: { include: { softwareItem: true } },
      branch: true,
    },
  });

  return NextResponse.json(checklist, { status: 201 });
}
