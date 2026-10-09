"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

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

type TabType = "departments" | "operating-systems";

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabType;
  const initialTab: TabType = tabParam === "operating-systems" ? "operating-systems" : "departments";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Multiple selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Active item for Single Edit / Delete
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; count?: number } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Endpoint helper
  const getEndpoint = (tab: TabType) => {
    switch (tab) {
      case "departments":
        return "/api/departments";
      case "operating-systems":
        return "/api/operating-systems";
    }
  };

  const getSingularLabel = (tab: TabType) => {
    switch (tab) {
      case "departments":
        return "Department";
      case "operating-systems":
        return "Operating System";
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, osRes] = await Promise.all([
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/operating-systems", { cache: "no-store" }),
      ]);

      if (dRes.status === 403 || osRes.status === 403) {
        setError("Access denied. Administrator privileges required.");
        setLoading(false);
        return;
      }

      const [dData, osData] = await Promise.all([
        dRes.ok ? dRes.json() : [],
        osRes.ok ? osRes.json() : [],
      ]);

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
    setSelectedIds(new Set());
    setError("");
    setSuccess("");
    router.replace(`/admin/settings?tab=${tab}`);
  };

  // Filtered lists based on search
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOS = operatingSystems.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const getCurrentList = () => {
    if (activeTab === "departments") return filteredDepartments;
    return filteredOS;
  };

  const currentList = getCurrentList();
  const allSelected = currentList.length > 0 && currentList.every((item) => selectedIds.has(item.id));

  // Toggle selection
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((i) => i.id)));
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

  // SINGLE DELETE item handler (with instant optimistic update)
  const handleSingleDelete = async () => {
    if (!selectedItem) return;

    const idToDelete = selectedItem.id;
    const itemName = selectedItem.name;

    setSubmitting(true);
    setError("");
    setSuccess("");

    // Optimistic UI update
    if (activeTab === "departments") {
      setDepartments((prev) => prev.filter((d) => d.id !== idToDelete));
    } else {
      setOperatingSystems((prev) => prev.filter((o) => o.id !== idToDelete));
    }

    try {
      const res = await fetch(getEndpoint(activeTab), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [idToDelete] }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to delete ${getSingularLabel(activeTab).toLowerCase()}.`);
        loadData();
        return;
      }

      setSuccess(`Deleted "${itemName}" successfully.`);
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(idToDelete);
        return next;
      });
      loadData();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // MULTIPLE / BULK DELETE handler (with instant optimistic update)
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    const count = idsToDelete.length;

    setSubmitting(true);
    setError("");
    setSuccess("");

    // Optimistic UI update
    if (activeTab === "departments") {
      setDepartments((prev) => prev.filter((d) => !selectedIds.has(d.id)));
    } else {
      setOperatingSystems((prev) => prev.filter((o) => !selectedIds.has(o.id)));
    }

    try {
      const res = await fetch(getEndpoint(activeTab), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to delete selected items.`);
        loadData();
        return;
      }

      setSuccess(`Successfully deleted ${count} ${getSingularLabel(activeTab).toLowerCase()}(s).`);
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      loadData();
    } catch {
      setError("An unexpected error occurred during bulk deletion.");
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // RESTORE DEFAULTS handler
  const handleRestoreDefaults = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${getEndpoint(activeTab)}?seed=1`, { cache: "no-store" });
      const data = await res.json();
      if (activeTab === "departments") setDepartments(data);
      else setOperatingSystems(data);
      setSuccess(`Restored standard default ${getSingularLabel(activeTab).toLowerCase()} options.`);
    } catch {
      setError("Failed to restore defaults.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
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
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between shadow-xs">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer">×</button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center justify-between shadow-xs">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 cursor-pointer">×</button>
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
                {activeTab === "departments" && "Department Dropdown Options"}
                {activeTab === "operating-systems" && "Operating System Choices"}
              </h1>
              <p className="text-purple-200 text-sm mt-1 max-w-2xl">
                {activeTab === "departments" &&
                  "Configure the official department list. Technical Support will select from these departments in the checklist form."}
                {activeTab === "operating-systems" &&
                  "Manage the operating systems catalog available to Technical Support when commissioning new PCs and laptops."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setInputValue("");
                  setError("");
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm shadow-lg transition cursor-pointer"
              >
                <span>+</span>
                <span>Add New {getSingularLabel(activeTab)}</span>
              </button>

              <button
                onClick={handleRestoreDefaults}
                title="Restore default standard entries"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition cursor-pointer"
              >
                <span>🔄</span>
                <span>Defaults</span>
              </button>
            </div>
          </div>

          {/* Master Stats Counters */}
          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
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

        {/* Content Section with Multiple Select Table */}
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

            <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-slate-500">
              <span>Showing {currentList.length} item(s)</span>
            </div>
          </div>

          {/* ── BULK ACTIONS TOOLBAR (Appears when items are checked) ── */}
          {selectedIds.size > 0 && (
            <div className="bg-purple-900 text-white px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                  ✓
                </span>
                <span className="text-sm font-semibold">
                  {selectedIds.size} of {currentList.length} {getSingularLabel(activeTab).toLowerCase()}(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-purple-100 transition cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>🗑️</span>
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {/* Table representation with Checkboxes */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="w-12 px-5 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      title="Select / Deselect all"
                    />
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Name / Designation</th>
                  <th className="px-5 py-3.5 font-semibold">Created Date</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      Loading data...
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      No {getSingularLabel(activeTab).toLowerCase()}s found. Click "+ Add New {getSingularLabel(activeTab)}" or "🔄 Defaults" above to add some!
                    </td>
                  </tr>
                ) : activeTab === "departments" ? (
                  filteredDepartments.map((d) => {
                    const isSelected = selectedIds.has(d.id);
                    return (
                      <tr
                        key={d.id}
                        className={`transition ${isSelected ? "bg-purple-50/70" : "hover:bg-slate-50/80"}`}
                      >
                        <td className="w-12 px-5 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(d.id)}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            aria-label={`Select department ${d.name}`}
                          />
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-sm">
                            📂
                          </span>
                          <span>{d.name}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {new Date(d.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
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
                    );
                  })
                ) : (
                  filteredOS.map((o) => {
                    const isSelected = selectedIds.has(o.id);
                    return (
                      <tr
                        key={o.id}
                        className={`transition ${isSelected ? "bg-purple-50/70" : "hover:bg-slate-50/80"}`}
                      >
                        <td className="w-12 px-5 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(o.id)}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            aria-label={`Select OS ${o.name}`}
                          />
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-sm">
                            💻
                          </span>
                          <span>{o.name}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {new Date(o.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
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
                    );
                  })
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
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
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
                    activeTab === "departments"
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
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
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
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

      {/* ── SINGLE DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Delete Confirmation</h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-red-200 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete{" "}
                <strong className="text-slate-900 font-bold">"{selectedItem.name}"</strong>?
              </p>



              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSingleDelete}
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

      {/* ── BULK / MULTIPLE DELETE CONFIRMATION MODAL ── */}
      {isBulkDeleteModalOpen && selectedIds.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Bulk Delete Confirmation</h3>
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-red-200 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete{" "}
                <strong className="text-red-600 font-bold">{selectedIds.size}</strong> selected{" "}
                {getSingularLabel(activeTab).toLowerCase()}(s)?
              </p>



              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {submitting ? "Deleting..." : `Yes, Delete (${selectedIds.size})`}
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
