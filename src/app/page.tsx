import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/SignOutButton";
import { ActionPromptModal } from "@/components/ActionPromptModal";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [total, draft, submitted, checked, approved, rejected, recent] = await Promise.all([
    prisma.checklist.count(),
    prisma.checklist.count({ where: { status: "DRAFT" } }),
    prisma.checklist.count({ where: { status: "SUBMITTED" } }),
    prisma.checklist.count({ where: { status: "CHECKED" } }),
    prisma.checklist.count({ where: { status: "APPROVED" } }),
    prisma.checklist.count({ where: { status: "REJECTED" } }),
    prisma.checklist.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { branch: true },
    }),
  ]);
  return { total, draft, submitted, checked, approved, rejected, recent };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  CHECKED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { total, draft, submitted, checked, approved, rejected, recent } = await getDashboardData();
  const userRole = (session.user as any)?.role;
  const employeeId = (session.user as any)?.employeeId;
  const isTechSupport = userRole === "TECH_SUPPORT" || userRole === "INSTALLER";

  const stats = [
    { label: "Total", value: total, color: "from-slate-700 to-slate-900", icon: "📋" },
    { label: "Draft", value: draft, color: "from-gray-500 to-gray-700", icon: "📝" },
    { label: "Submitted", value: submitted, color: "from-blue-500 to-blue-700", icon: "📤" },
    { label: "Checked", value: checked, color: "from-yellow-500 to-yellow-700", icon: "🔍" },
    { label: "Approved", value: approved, color: "from-green-500 to-green-700", icon: "✅" },
    { label: "Rejected", value: rejected, color: "from-red-500 to-red-700", icon: "❌" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center">
                <span className="text-slate-900 text-lg">📋</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-none">IT Checklist System</p>
                <p className="text-slate-400 text-xs">FORM-IT-004.00</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm hidden sm:block">
                {session.user?.name || (session.user as any)?.username}
                {employeeId ? ` (${employeeId})` : ""} ·{" "}
                <span className="text-yellow-400 font-medium">
                  {userRole === "ADMIN" ? "Administrator" : "Technical Support"}
                </span>
              </span>
              {userRole === "ADMIN" && (
                <Link
                  href="/users"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5"
                >
                  <span>👥</span> Tech Support
                </Link>
              )}
              <Link
                href="/checklists/new"
                id="new-checklist-btn"
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                + New Checklist
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dynamic Action Prompt Modal (Asks What Will You Do upon login) */}
        <Suspense fallback={null}>
          <ActionPromptModal
            userName={session.user?.name || (session.user as any)?.username}
            userRole={userRole}
            employeeId={employeeId}
          />
        </Suspense>

        {/* ACTION SELECTOR CARD: Prominently asks what to do */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-blue-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400/90 text-slate-950 mb-3 shadow">
              <span>👋</span>
              <span>
                Hello, {session.user?.name || (session.user as any)?.username}! [
                {userRole === "ADMIN" ? "Administrator" : "Technical Support"}
                {employeeId ? ` · ID: ${employeeId}` : ""}]
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              What will you do today?
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-xl">
              Please choose whether you want to perform a fresh software installation on a new laptop/CPU, or double check and inspect an existing installation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              {/* Option 1: Install Application in New PC */}
              <Link
                href="/checklists/new"
                className="group relative bg-white/10 hover:bg-white/15 border-2 border-white/15 hover:border-yellow-400 rounded-2xl p-6 transition-all duration-200 flex items-start gap-4 shadow-lg hover:shadow-yellow-400/10"
              >
                <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center text-3xl shrink-0 shadow group-hover:scale-105 transition">
                  💻
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white group-hover:text-yellow-300 transition">
                      Install Application in New PC
                    </h3>
                    <span className="text-yellow-400 text-lg group-hover:translate-x-1 transition">→</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Set up a newly deployed laptop or CPU. Record PC name, O.S., HDD/SSD serial number, and check off software through all 5 installation stages.
                  </p>
                  <span className="inline-block mt-3 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-md">
                    + Start New Checklist
                  </span>
                </div>
              </Link>

              {/* Option 2: Double Check Installation */}
              <Link
                href="/checklists?filter=check"
                className="group relative bg-white/10 hover:bg-white/15 border-2 border-white/15 hover:border-blue-400 rounded-2xl p-6 transition-all duration-200 flex items-start gap-4 shadow-lg hover:shadow-blue-400/10"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-3xl shrink-0 shadow group-hover:scale-105 transition">
                  🔍
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition">
                      Double Check Installation
                    </h3>
                    <span className="text-blue-400 text-lg group-hover:translate-x-1 transition">→</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Review completed PC setups. Inspect installed software, verify configurations, double-check drivers & antivirus, and complete quality sign-offs.
                  </p>
                  <span className="inline-block mt-3 text-xs font-semibold text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-md">
                    View Checklists to Review
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white shadow`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs opacity-80 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Checklists Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Checklists</h2>
            <Link href="/checklists" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Computer Name</th>
                  <th className="px-6 py-3 text-left">Branch / Dept</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Installer</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No checklists yet.{" "}
                      <Link href="/checklists/new" className="text-blue-600 hover:underline">
                        Create the first one
                      </Link>
                    </td>
                  </tr>
                )}
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 font-medium text-slate-800">{c.computerName}</td>
                    <td className="px-6 py-3 text-slate-500">{c.branch?.name || c.department || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(c.date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-6 py-3 text-slate-500">{c.installerName || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/checklists/${c.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                        >
                          View
                        </Link>
                        <Link
                          href={`/checklists/${c.id}/print`}
                          className="text-slate-500 hover:text-slate-700 font-medium text-xs"
                          target="_blank"
                        >
                          Print
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
