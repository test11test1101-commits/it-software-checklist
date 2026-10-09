import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/checklists/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: {
      branch: true,
      installer: { select: { name: true, username: true } },
      preparedBy: { select: { name: true, username: true } },
      checkedBy: { select: { name: true, username: true } },
      approvedBy: { select: { name: true, username: true } },
      results: {
        include: {
          softwareItem: { select: { id: true, name: true, section: true, order: true, description: true } },
        },
        orderBy: [
          { softwareItem: { section: "asc" } },
          { softwareItem: { order: "asc" } },
        ],
      },
    },
  });

  if (!checklist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(checklist);
}

// PATCH /api/checklists/[id] - update checklist (items, status, info)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Update result items if provided
  if (body.results && Array.isArray(body.results)) {
    for (const r of body.results) {
      await prisma.checklistResult.update({
        where: { id: r.id },
        data: { isChecked: r.isChecked, notes: r.notes },
      });
    }
  }

  // Build update object for checklist fields
  const updateData: any = {};
  const fields = [
    "computerName",
    "operatingSystem",
    "hddSsdSerial",
    "department",
    "installerName",
    "preparedByName",
    "checkedByName",
    "approvedByName",
    "remarks",
    "status",
    "branchId",
    "date",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  // Handle manually encoded branch name in updates
  if (body.branch !== undefined || body.branchName !== undefined) {
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
      updateData.branchId = existingBranch.id;
    } else {
      updateData.branchId = null;
    }
  }

  // Assign checker/approver/installer automatically
  const userRole = (session.user as any)?.role;
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

  // When status is CHECKED: automatically encode checkedById and checkedByName
  if (body.status === "CHECKED" && userId) {
    updateData.checkedById = userId;
    updateData.checkedByName = body.checkedByName?.trim() || userName;
  }

  // When status is APPROVED: automatically encode approvedById and approvedByName
  if (body.status === "APPROVED" && userId) {
    updateData.approvedById = userId;
    updateData.approvedByName = body.approvedByName?.trim() || userName;
  }

  // When status is SUBMITTED: ensure installer & preparedBy names exist
  if (body.status === "SUBMITTED" && userId) {
    if (!updateData.installerName && body.installerName) {
      updateData.installerName = body.installerName.trim();
    }
    if (!updateData.preparedByName && body.preparedByName) {
      updateData.preparedByName = body.preparedByName.trim();
    }
  }

  const checklist = await prisma.checklist.update({
    where: { id },
    data: updateData,
    include: {
      branch: true,
      results: { include: { softwareItem: true } },
    },
  });

  return NextResponse.json(checklist);
}

// DELETE /api/checklists/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userRole = (session.user as any)?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.checklist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
