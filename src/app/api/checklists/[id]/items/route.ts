import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_SECTIONS = ["FIRST", "SECOND", "THIRD", "FOURTH", "FINAL"] as const;

// GET /api/checklists/[id]/items - get items and also available catalog items not yet in checklist
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: {
      results: {
        include: { softwareItem: true },
        orderBy: [
          { softwareItem: { section: "asc" } },
          { softwareItem: { order: "asc" } },
        ],
      },
    },
  });

  if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

  const currentItemIds = new Set(checklist.results.map((r) => r.softwareItemId));

  // Fetch active catalog software items that are not in this checklist
  const availableCatalog = await prisma.softwareItem.findMany({
    where: {
      isActive: true,
      id: { notIn: Array.from(currentItemIds) },
    },
    orderBy: [
      { section: "asc" },
      { order: "asc" },
    ],
  });

  return NextResponse.json({
    results: checklist.results,
    availableCatalog,
  });
}

// POST /api/checklists/[id]/items - add an item to this specific checklist
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

  if (checklist.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Items can only be added or modified while the checklist is in DRAFT status." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    // Case 1: Adding an existing catalog item by softwareItemId
    if (body.softwareItemId) {
      const existingResult = await prisma.checklistResult.findUnique({
        where: {
          checklistId_softwareItemId: {
            checklistId: id,
            softwareItemId: body.softwareItemId,
          },
        },
      });

      if (existingResult) {
        return NextResponse.json(
          { error: "This item is already included on this checklist." },
          { status: 409 }
        );
      }

      const created = await prisma.checklistResult.create({
        data: {
          checklistId: id,
          softwareItemId: body.softwareItemId,
          isChecked: Boolean(body.isChecked),
          notes: (body.notes || "").trim() || null,
        },
        include: { softwareItem: true },
      });

      return NextResponse.json(created, { status: 201 });
    }

    // Case 2: Adding a custom new software/task
    const name = (body.name || "").trim();
    const section = body.section;
    const description = (body.description || "").trim() || null;
    const notes = (body.notes || "").trim() || null;
    const saveToCatalog = Boolean(body.saveToCatalog);

    if (!name) {
      return NextResponse.json({ error: "Software item name is required." }, { status: 400 });
    }

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: "Valid section is required (FIRST, SECOND, THIRD, FOURTH, or FINAL)." },
        { status: 400 }
      );
    }

    // Determine order
    const highest = await prisma.softwareItem.findFirst({
      where: { section },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (highest?.order || 0) + 1;

    // Check if an identical software item already exists
    let item = await prisma.softwareItem.findFirst({
      where: { name, section },
    });

    if (!item) {
      item = await prisma.softwareItem.create({
        data: {
          name,
          section,
          description,
          order,
          isActive: saveToCatalog, // if saved to catalog, it populates future checklists
        },
      });
    }

    // Check if this result is already linked to this checklist
    const existingResult = await prisma.checklistResult.findUnique({
      where: {
        checklistId_softwareItemId: {
          checklistId: id,
          softwareItemId: item.id,
        },
      },
    });

    if (existingResult) {
      return NextResponse.json(
        { error: "This item is already included on this checklist." },
        { status: 409 }
      );
    }

    const createdResult = await prisma.checklistResult.create({
      data: {
        checklistId: id,
        softwareItemId: item.id,
        isChecked: Boolean(body.isChecked),
        notes,
      },
      include: { softwareItem: true },
    });

    return NextResponse.json(createdResult, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add item to checklist." },
      { status: 500 }
    );
  }
}
