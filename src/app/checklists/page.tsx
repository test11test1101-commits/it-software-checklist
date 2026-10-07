import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  CHECKED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function ChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedParams = await searchParams;
  const isDoubleCheckMode = resolvedParams.filter === "check";
  const activeStatus = resolvedParams.status;

  const whereClause: any = {};
  if (activeStatus) {
    whereClause.status = activeStatus;
  }

  const checklists = await prisma.checklist.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: { branch: true },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white text-sm transition">
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900">
                {isDoubleCheckMode ? "🔍" : "📋"}
              </span>
              <span className="font-semibold text-sm">
                {isDoubleCheckMode ? "Double Check Installation" : "All Checklists"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(session.user as any)?.role === "ADMIN" && (
              <Link
                href="/users"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition"
              >
                👥 Tech Support
              </Link>
            )}
            <Link
              href="/checklists/new"
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              + Install New PC
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Double Check Mode Banner */}
        {isDoubleCheckMode && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md border border-blue-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <h2 className="text-lg font-bold">Double Check & Quality Inspection Mode</h2>
              </div>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">
                Select a computer checklist below to review installed software items, verify configurations, and complete sign-off verification.
              </p>
            </div>
            <Link
              href="/checklists/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-bold rounded-xl transition shrink-0"
            >
              <span>💻</span> Need to Install New PC instead?
            </Link>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          <Link
            href={isDoubleCheckMode ? "/checklists?filter=check" : "/checklists"}
            className={`px-3 py-1.5 rounded-lg border transition ${
              !activeStatus
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            All Checklists
          </Link>
          <Link
            href={isDoubleCheckMode ? "/checklists?filter=check&status=SUBMITTED" : "/checklists?status=SUBMITTED"}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              activeStatus === "SUBMITTED"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>🔍</span> Ready to Double Check (Submitted)
          </Link>
          <Link
            href={isDoubleCheckMode ? "/checklists?filter=check&status=DRAFT" : "/checklists?status=DRAFT"}
            className={`px-3 py-1.5 rounded-lg border transition ${
              activeStatus === "DRAFT"
                ? "bg-gray-700 text-white border-gray-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Drafts (In Progress)
          </Link>
          <Link
            href={isDoubleCheckMode ? "/checklists?filter=check&status=APPROVED" : "/checklists?status=APPROVED"}
            className={`px-3 py-1.5 rounded-lg border transition ${
              activeStatus === "APPROVED"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Approved / Completed
          </Link>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h1 className="font-semibold text-slate-800 text-sm">
              {isDoubleCheckMode ? "PCs to Double Check" : "Checklists"}{" "}
              <span className="text-slate-400 font-normal">({checklists.length})</span>
            </h1>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Computer Name</th>
                  <th className="px-6 py-3 text-left">Branch / Dept</th>
                  <th className="px-6 py-3 text-left">O.S.</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Installer</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checklists.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No checklists found.{" "}
                      <Link href="/checklists/new" className="text-blue-600 hover:underline">
                        Install application in new PC
                      </Link>
                    </td>
                  </tr>
                )}
                {checklists.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{c.computerName}</td>
                    <td className="px-6 py-3.5 text-slate-500">{c.branch?.name || c.department || "—"}</td>
                    <td className="px-6 py-3.5 text-slate-500">{c.operatingSystem || "—"}</td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(c.date).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{c.installerName || "—"}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-3">
                      <Link
                        href={`/checklists/${c.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                      >
                        {isDoubleCheckMode ? "Double Check →" : "View"}
                      </Link>
                      <Link
                        href={`/checklists/${c.id}/print`}
                        target="_blank"
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                      >
                        Print
                      </Link>
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
