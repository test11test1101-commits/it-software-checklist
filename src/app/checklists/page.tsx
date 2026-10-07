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

export default async function ChecklistsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const checklists = await prisma.checklist.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: true },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white text-sm">← Dashboard</Link>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900">📋</span>
              <span className="font-semibold text-sm">All Checklists</span>
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
            <Link href="/checklists/new" className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg transition">
              + New
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h1 className="font-semibold text-slate-800">All Checklists ({checklists.length})</h1>
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
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {checklists.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No checklists yet. <Link href="/checklists/new" className="text-blue-600 hover:underline">Create one</Link>
                    </td>
                  </tr>
                )}
                {checklists.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 font-medium text-slate-800">{c.computerName}</td>
                    <td className="px-6 py-3 text-slate-500">{c.branch?.name || c.department || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">{c.operatingSystem || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(c.date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-6 py-3 text-slate-500">{c.installerName || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-3">
                        <Link href={`/checklists/${c.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-xs">View</Link>
                        <Link href={`/checklists/${c.id}/print`} target="_blank" className="text-slate-500 hover:text-slate-700 font-medium text-xs">Print</Link>
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
