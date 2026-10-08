"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

interface BranchItem {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    checklists: number;
  };
}

interface DepartmentItem {
  id: string;
  name: string;
  createdAt: string;
}

interface OSItem {
  id: string;
  name: string;
  createdAt: string;
}

type TabType = "branches" | "departments" | "operating-systems";

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabType) || "branches";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active item for Edit / Delete
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; count?: number } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, dRes, osRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/departments"),
        fetch("/api/operating-systems"),
      ]);

      if (bRes.status === 403 || dRes.status === 403) {
        setError("Access denied. Administrator privileges required.");
        setLoading(false);
        return;
      }

      const [bData, dData, osData] = await Promise.all([
        bRes.ok ? bRes.json() : [],
        dRes.ok ? dRes.json() : [],
        osRes.ok ? osRes.json() : [],
      ]);

      if (Array.isArray(bData)) setBranches(bData);
      if (Array.isArray(dData)) setDepartments(dData);
      if (Array.isArray(osData)) setOperatingSystems(osData);
    } catch {
      setError("Failed to load master data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearch("");
    setError("");
    setSuccess("");
    router.replace(`/admin/settings?tab=${tab}`);
  };

  // Helper endpoint resolution
  const getEndpoint = (tab: TabType) => {
    switch (tab) {
      case "branches":
        return "/api/branches";
      case "departments":
        return "/api/departments";
      case "operating-systems":
        return "/api/operating-systems";
    }
  };

  const getSingularLabel = (tab: TabType) => {
    switch (tab) {
      case "branches":
        return "Branch";
      case "departments":
        return "Department";
      case "operating-systems":
        return "Operating System";
    }
  };

  // ADD item handler
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(getEndpoint(activeTab), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to add ${getSingularLabel(activeTab).toLowerCase()}.`);
        return;
      }

      setSuccess(`Added "${trimmed}" successfully.`);
      setIsAddModalOpen(false);
      setInputValue("");
      loadData();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // EDIT item handler
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${getEndpoint(activeTab)}/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to update ${getSingularLabel(activeTab).toLowerCase()}.`);
        return;
      }

      setSuccess(`Updated to "${trimmed}" successfully.`);
      setIsEditModalOpen(false);
      setSelectedItem(null);
      setInputValue("");
      loadData();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE item handler
  const handleDelete = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${getEndpoint(activeTab)}/${selectedItem.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to delete ${getSingularLabel(activeTab).toLowerCase()}.`);
        return;
      }

      setSuccess(`Deleted "${selectedItem.name}" successfully.`);
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      loadData();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered lists based on search
  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOS = operatingSystems.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white shadow-lg border-b border-purple-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
                <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 font-bold">
                  ⚙️
                </div>
                <div>
                  <p className="font-bold text-sm leading-none text-white">Administrator Center</p>
                  <p className="text-purple-200 text-xs mt-0.5">Master Data & Dropdown Configuration</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/users"
                className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5"
              >
                <span>👥</span>
                <span>Tech Support</span>
              </Link>
              <Link
                href="/"
                className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Dashboard</span>
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Module Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-2 sm:gap-4 py-3">
            <Link
              href="/users"
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap flex items-center gap-2"
            >
              <span>👥</span> Tech Support Accounts
            </Link>

            <button
              onClick={() => switchTab("branches")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === "branches"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>🏢</span> Customize Branches ({branches.length})
            </button>

            <button
              onClick={() => switchTab("departments")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === "departments"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>📂</span> Department Dropdown ({departments.length})
            </button>

            <button
              onClick={() => switchTab("operating-systems")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === "operating-systems"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>💻</span> Operating Systems ({operatingSystems.length})
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2">×</button>
          </div>
        )}

        {/* Overview Header Card */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-slate-950 mb-3 shadow">
                <span>⚡</span>
                <span>Administrator Control Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {activeTab === "branches" && "Customize Assigned Branches"}
                {activeTab === "departments" && "Department Dropdown Options"}
                {activeTab === "operating-systems" && "Operating System Choices"}
              </h1>
              <p className="text-purple-200 text-sm mt-1 max-w-2xl">
                {activeTab === "branches" &&
                  "Assign and customize company branch names. These populate the checklist Branch dropdown and header labels."}
                {activeTab === "departments" &&
                  "Configure the official department list. Technical Support will select from these departments in the checklist form."}
                {activeTab === "operating-systems" &&
                  "Manage the operating system catalog available to Technical Support when commissioning new PCs and laptops."}
              </p>
            </div>

            <button
              onClick={() => {
                setInputValue("");
                setError("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm shadow-lg transition cursor-pointer self-start md:self-auto shrink-0"
            >
              <span>+</span>
              <span>Add New {getSingularLabel(activeTab)}</span>
            </button>
          </div>

          {/* Master Stats Counters */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-purple-200 text-xs block">Assigned Branches</span>
              <span className="text-2xl font-bold text-white mt-1 block">{branches.length}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-purple-200 text-xs block">Configured Departments</span>
              <span className="text-2xl font-bold text-white mt-1 block">{departments.length}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-purple-200 text-xs block">Operating Systems</span>
              <span className="text-2xl font-bold text-white mt-1 block">{operatingSystems.length}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Search bar & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder={`Search ${getSingularLabel(activeTab).toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>

            <span className="text-xs text-slate-500 self-end sm:self-auto">
              Showing{" "}
              {activeTab === "branches" && filteredBranches.length}
              {activeTab === "departments" && filteredDepartments.length}
              {activeTab === "operating-systems" && filteredOS.length}{" "}
              item(s)
            </span>
          </div>

          {/* Table representation */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Name / Designation</th>
                  {activeTab === "branches" && (
                    <th className="px-6 py-3.5 font-semibold text-center">Linked Checklists</th>
                  )}
                  <th className="px-6 py-3.5 font-semibold">Created Date</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      Loading data...
                    </td>
                  </tr>
                ) : activeTab === "branches" ? (
                  filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        No branches found. Click "+ Add New Branch" above to customize one!
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center text-sm">
                            🏢
                          </span>
                          <span>{b.name}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {b._count?.checklists ?? 0} checklist(s)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(b.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedItem(b);
                              setInputValue(b.name);
                              setIsEditModalOpen(true);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            ✏️ Rename
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem({ id: b.id, name: b.name, count: b._count?.checklists });
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                ) : activeTab === "departments" ? (
                  filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        No departments configured yet. Click "+ Add New Department" above!
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-sm">
                            📂
                          </span>
                          <span>{d.name}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(d.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedItem(d);
                              setInputValue(d.name);
                              setIsEditModalOpen(true);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            ✏️ Rename
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(d);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  filteredOS.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        No operating systems found. Click "+ Add New Operating System" above!
                      </td>
                    </tr>
                  ) : (
                    filteredOS.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-sm">
                            💻
                          </span>
                          <span>{o.name}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(o.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedItem(o);
                              setInputValue(o.name);
                              setIsEditModalOpen(true);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(o);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── ADD MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Add New {getSingularLabel(activeTab)}</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {getSingularLabel(activeTab)} Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={
                    activeTab === "branches"
                      ? "e.g., Cebu Branch or Logistics Hub"
                      : activeTab === "departments"
                      ? "e.g., Quality Assurance"
                      : "e.g., Windows 11 Enterprise"
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {submitting ? "Adding..." : "Add to System"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT / RENAME MODAL ── */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Edit {getSingularLabel(activeTab)}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {getSingularLabel(activeTab)} Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Delete Confirmation</h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-red-200 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete{" "}
                <strong className="text-slate-900 font-bold">"{selectedItem.name}"</strong>?
              </p>

              {activeTab === "branches" && selectedItem.count && selectedItem.count > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  ⚠️ Note: {selectedItem.count} existing checklist(s) are associated with this branch.
                  Deleting it will safely disassociate them without deleting the checklist records.
                </div>
              ) : null}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {submitting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-medium">
          Loading Administrator Settings...
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  );
}
