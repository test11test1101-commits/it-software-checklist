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

  // Assign checker/approver user IDs based on role
  const userRole = (session.user as any)?.role;
  const userId = session.user?.id;
  if (body.status === "CHECKED" && (userRole === "TECH_SUPPORT" || userRole === "ADMIN" || userRole === "CHECKER") && userId) {
    updateData.checkedById = userId;
  }
  if (body.status === "APPROVED" && (userRole === "ADMIN" || userRole === "TECH_SUPPORT" || userRole === "APPROVER") && userId) {
    updateData.approvedById = userId;
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
