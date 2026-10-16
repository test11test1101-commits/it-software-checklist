import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_SECTIONS = ["FIRST", "SECOND", "THIRD", "FOURTH", "FINAL"] as const;

export const DEFAULT_SOFTWARE_ITEMS = [
  // FIRST SECTION
  { section: "FIRST", order: 1, name: "Time Zone Setting", description: "Set correct time zone (Asia/Manila)" },
  { section: "FIRST", order: 2, name: "UAC (User Account Control)", description: "Configure UAC settings" },
  { section: "FIRST", order: 3, name: "Windows Update", description: "Check and apply Windows updates" },
  { section: "FIRST", order: 4, name: "Windows Activation", description: "Verify Windows is activated" },
  { section: "FIRST", order: 5, name: "Computer Name / Domain", description: "Set computer name and join domain if required" },
  { section: "FIRST", order: 6, name: "Network / IP Configuration", description: "Configure network settings and IP address" },

  // SECOND SECTION
  { section: "SECOND", order: 1, name: "Rocketchat", description: "Install and configure Rocketchat client" },
  { section: "SECOND", order: 2, name: "7-Zip", description: "Install 7-Zip file archiver" },
  { section: "SECOND", order: 3, name: "Firefox", description: "Install Mozilla Firefox browser" },
  { section: "SECOND", order: 4, name: "Acrobat Reader", description: "Install Adobe Acrobat Reader" },
  { section: "SECOND", order: 5, name: "Teamviewer", description: "Install TeamViewer remote access" },
  { section: "SECOND", order: 6, name: "AnyDesk", description: "Install AnyDesk remote desktop" },
  { section: "SECOND", order: 7, name: "MS Office 2021", description: "Install Microsoft Office 2021" },
  { section: "SECOND", order: 8, name: "Google Chrome", description: "Install Google Chrome browser" },
  { section: "SECOND", order: 9, name: "VLC Media Player", description: "Install VLC Media Player" },
  { section: "SECOND", order: 10, name: "Notepad++", description: "Install Notepad++ text editor" },

  // THIRD SECTION
  { section: "THIRD", order: 1, name: "Printer Driver", description: "Install appropriate printer drivers" },
  { section: "THIRD", order: 2, name: "Scanner Driver", description: "Install scanner drivers if applicable" },
  { section: "THIRD", order: 3, name: "Biometric/Fingerprint Driver", description: "Install biometric device drivers" },
  { section: "THIRD", order: 4, name: "Company Software / ERP", description: "Install company-specific software or ERP system" },
  { section: "THIRD", order: 5, name: "POS Software", description: "Install POS software if applicable" },
  { section: "THIRD", order: 6, name: "Accounting Software", description: "Install accounting software if applicable" },

  // FOURTH SECTION
  { section: "FOURTH", order: 1, name: "Shared Folder / Network Drive", description: "Map network drives and shared folders" },
  { section: "FOURTH", order: 2, name: "Email Configuration", description: "Setup email client and configuration" },
  { section: "FOURTH", order: 3, name: "VPN Client", description: "Install and configure VPN client if required" },
  { section: "FOURTH", order: 4, name: "Remote Desktop (RDP)", description: "Configure Remote Desktop Protocol" },
  { section: "FOURTH", order: 5, name: "User Account Creation", description: "Create user accounts and set permissions" },

  // FINAL SECTION
  { section: "FINAL", order: 1, name: "Easy Drivers / Driver Pack", description: "Install missing drivers using Easy Drivers or Driver Pack" },
  { section: "FINAL", order: 2, name: "HDD/SSD Serial Number", description: "Record HDD/SSD serial number in checklist" },
  { section: "FINAL", order: 3, name: "Anti-Virus Installation", description: "Install and update antivirus software" },
  { section: "FINAL", order: 4, name: "Anti-Virus Update / Scan", description: "Run full antivirus scan after update" },
  { section: "FINAL", order: 5, name: "System Cleanup / Disk Cleanup", description: "Run disk cleanup and optimize startup" },
  { section: "FINAL", order: 6, name: "Final Restart & System Check", description: "Restart computer and verify all software working" },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shouldSeed = searchParams.get("seed") === "1";
  const sectionParam = searchParams.get("section");
  const activeParam = searchParams.get("active");

  if (shouldSeed) {
    const role = (session.user as any)?.role;
    if (role === "ADMIN") {
      for (const item of DEFAULT_SOFTWARE_ITEMS) {
        const existing = await prisma.softwareItem.findFirst({
          where: { name: item.name, section: item.section as any },
        });
        if (!existing) {
          await prisma.softwareItem.create({
            data: {
              section: item.section as any,
              order: item.order,
              name: item.name,
              description: item.description,
              isActive: true,
            },
          });
        }
      }
    }
  }

  const where: any = {};
  if (sectionParam && VALID_SECTIONS.includes(sectionParam as any)) {
    where.section = sectionParam;
  }
  if (activeParam === "true") {
    where.isActive = true;
  } else if (activeParam === "false") {
    where.isActive = false;
  }

  const items = await prisma.softwareItem.findMany({
    where,
    include: {
      _count: {
        select: { results: true },
      },
    },
    orderBy: [
      { section: "asc" },
      { order: "asc" },
      { name: "asc" },
    ],
  });

  return NextResponse.json(items, {
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
    const section = body.section;
    const description = (body.description || "").trim() || null;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name) {
      return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    }

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: "Valid section is required (FIRST, SECOND, THIRD, FOURTH, or FINAL)." },
        { status: 400 }
      );
    }

    // Determine order: if not provided or < 1, place at end of this section
    let order = typeof body.order === "number" ? body.order : parseInt(body.order, 10);
    if (isNaN(order) || order < 1) {
      const highest = await prisma.softwareItem.findFirst({
        where: { section },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (highest?.order || 0) + 1;
    }

    const created = await prisma.softwareItem.create({
      data: {
        name,
        section,
        description,
        order,
        isActive,
      },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create software item." },
      { status: 500 }
    );
  }
}

// Bulk DELETE or Deactivate
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
      return NextResponse.json({ error: "No software item IDs provided." }, { status: 400 });
    }

    // Check which items have linked checklist results
    const itemsWithResults = await prisma.softwareItem.findMany({
      where: {
        id: { in: ids },
        results: { some: {} },
      },
      select: { id: true, name: true },
    });

    const usedIds = new Set(itemsWithResults.map((i) => i.id));
    const unusedIds = ids.filter((id) => !usedIds.has(id));

    let deletedCount = 0;
    let deactivatedCount = 0;

    // Permanently delete items that have NO checklist results
    if (unusedIds.length > 0) {
      const del = await prisma.softwareItem.deleteMany({
        where: { id: { in: unusedIds } },
      });
      deletedCount = del.count;
    }

    // Deactivate items that have existing checklist results to maintain historical data
    if (usedIds.size > 0) {
      const deact = await prisma.softwareItem.updateMany({
        where: { id: { in: Array.from(usedIds) } },
        data: { isActive: false },
      });
      deactivatedCount = deact.count;
    }

    let message = "";
    if (deletedCount > 0 && deactivatedCount > 0) {
      message = `Permanently deleted ${deletedCount} unused item(s) and deactivated ${deactivatedCount} item(s) (preserved for historical checklist records).`;
    } else if (deactivatedCount > 0) {
      message = `Deactivated ${deactivatedCount} item(s) so they will not appear on future checklists (preserved for existing checklist records).`;
    } else {
      message = `Permanently deleted ${deletedCount} item(s).`;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      deactivatedCount,
      message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete software item(s)." },
      { status: 500 }
    );
  }
}
