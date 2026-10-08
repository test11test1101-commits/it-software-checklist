import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let osList = await prisma.operatingSystem.findMany({
    orderBy: { name: "asc" },
  });

  // Self-seed standard default operating systems if empty
  if (osList.length === 0) {
    const defaults = [
      "Windows 11 Pro",
      "Windows 11 Home",
      "Windows 10 Pro",
      "Windows 10 Home",
      "Windows Server 2022",
      "Windows Server 2019",
      "Windows Server 2016",
    ];
    for (const name of defaults) {
      await prisma.operatingSystem.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    osList = await prisma.operatingSystem.findMany({
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json(osList);
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
      return NextResponse.json({ error: "Operating system name is required." }, { status: 400 });
    }

    const existing = await prisma.operatingSystem.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Operating system "${name}" already exists.` }, { status: 409 });
    }

    const os = await prisma.operatingSystem.create({
      data: { name },
    });

    return NextResponse.json(os, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create operating system." }, { status: 500 });
  }
}
