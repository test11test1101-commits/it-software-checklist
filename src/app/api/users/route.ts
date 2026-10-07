import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/users - list all technical support users (ADMIN only)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      employeeId: true,
      username: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          checklists: true,
          checked: true,
          approved: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST /api/users - create new technical support user (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const body = await req.json();
  const { name, employeeId, username, password, role: userRole } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Full Name is required." }, { status: 400 });
  }
  if (!employeeId || !employeeId.trim()) {
    return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
  }
  if (!username || !username.trim()) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const trimmedUsername = username.trim().toLowerCase();
  const trimmedEmployeeId = employeeId.trim().toUpperCase();

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username: trimmedUsername },
  });
  if (existingUsername) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
  }

  // Check if employeeId already exists
  const existingEmployeeId = await prisma.user.findUnique({
    where: { employeeId: trimmedEmployeeId },
  });
  if (existingEmployeeId) {
    return NextResponse.json({ error: "Employee ID is already registered." }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      employeeId: trimmedEmployeeId,
      username: trimmedUsername,
      password: hashedPassword,
      role: (userRole as any) || "INSTALLER",
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}
