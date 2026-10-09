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
  let userName = session.user?.name || (session.user as any)?.username;
  if (!userName && userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    });
    userName = dbUser?.name || dbUser?.username || "IT Personnel";
  }
  if (!userName) userName = "IT Personnel";

  // Resolve branch: if manually encoded branch name is provided, find or create the Branch record
  let branchId = body.branchId || undefined;
  const branchNameInput = (body.branch || body.branchName)?.toString().trim();
  if (branchNameInput) {
    let existingBranch = await prisma.branch.findUnique({
      where: { name: branchNameInput },
    });
    if (!existingBranch) {
      existingBranch = await prisma.branch.create({
        data: { name: branchNameInput },
      });
    }
    branchId = existingBranch.id;
  }

  const checklist = await prisma.checklist.create({
    data: {
      branchId,
      department: body.department,
      date: body.date ? new Date(body.date) : new Date(),
      computerName: body.computerName,
      operatingSystem: body.operatingSystem,
      hddSsdSerial: body.hddSsdSerial,
      installerId: userId,
      installerName: body.installerName?.trim() || userName,
      preparedById: userId,
      preparedByName: body.preparedByName?.trim() || userName,
      checkedByName: body.checkedByName?.trim() || null,
      approvedByName: body.approvedByName?.trim() || null,
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
