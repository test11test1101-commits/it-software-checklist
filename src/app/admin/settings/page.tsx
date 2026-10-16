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

type ChecklistSectionType = "FIRST" | "SECOND" | "THIRD" | "FOURTH" | "FINAL";

interface SoftwareItemRecord {
  id: string;
  name: string;
  section: ChecklistSectionType;
  order: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    results: number;
  };
}

type TabType = "departments" | "operating-systems" | "software-items";

const SECTIONS = [
  { id: "FIRST" as const, label: "FIRST — Initial Setup", short: "FIRST", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "SECOND" as const, label: "SECOND — Core Software", short: "SECOND", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "THIRD" as const, label: "THIRD — Department Software", short: "THIRD", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "FOURTH" as const, label: "FOURTH — Network & Access", short: "FOURTH", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "FINAL" as const, label: "FINAL — Completion & Verification", short: "FINAL", badge: "bg-rose-50 text-rose-700 border-rose-200" },
] as const;

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabType;
  const initialTab: TabType =
    tabParam === "software-items"
      ? "software-items"
      : tabParam === "operating-systems"
      ? "operating-systems"
      : "departments";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OSItem[]>([]);
  const [softwareItems, setSoftwareItems] = useState<SoftwareItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("ALL");

  // Multiple selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Active item for Single Edit / Delete
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    count?: number;
    resultsCount?: number;
  } | null>(null);

  // Simple input value for Department / OS
  const [inputValue, setInputValue] = useState("");

  // Software item detailed form state
  const [swForm, setSwForm] = useState<{
    name: string;
    section: ChecklistSectionType;
    description: string;
    order: number;
    isActive: boolean;
  }>({
    name: "",
    section: "SECOND",
    description: "",
    order: 1,
    isActive: true,
  });

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
      case "software-items":
        return "/api/software-items";
    }
  };

  const getSingularLabel = (tab: TabType) => {
    switch (tab) {
      case "departments":
        return "Department";
      case "operating-systems":
        return "Operating System";
      case "software-items":
        return "Checklist Software Item";
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, osRes, swRes] = await Promise.all([
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/operating-systems", { cache: "no-store" }),
        fetch("/api/software-items", { cache: "no-store" }),
      ]);

      if (dRes.status === 403 || osRes.status === 403 || swRes.status === 403) {
        setError("Access denied. Administrator privileges required.");
        setLoading(false);
        return;
      }

      const [dData, osData, swData] = await Promise.all([
        dRes.ok ? dRes.json() : [],
        osRes.ok ? osRes.json() : [],
        swRes.ok ? swRes.json() : [],
      ]);

      if (Array.isArray(dData)) setDepartments(dData);
      if (Array.isArray(osData)) setOperatingSystems(osData);
      if (Array.isArray(swData)) setSoftwareItems(swData);
    } catch {
      setError("Failed to load master configuration data.");
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

  // Filtered lists based on search & section
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOS = operatingSystems.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSoftwareItems = softwareItems.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
      s.section.toLowerCase().includes(search.toLowerCase());
    const matchesSection =
      selectedSectionFilter === "ALL" || s.section === selectedSectionFilter;
    return matchesSearch && matchesSection;
  });

  const getCurrentList = () => {
    if (activeTab === "departments") return filteredDepartments;
    if (activeTab === "operating-systems") return filteredOS;
    return filteredSoftwareItems;
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

  // Quick toggle active state for software items
  const handleToggleActive = async (item: SoftwareItemRecord) => {
    const newActive = !item.isActive;
    // Optimistic update
    setSoftwareItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isActive: newActive } : i))
    );

    try {
      const res = await fetch(`/api/software-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (!res.ok) {
        // Revert
        setSoftwareItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isActive: !newActive } : i))
        );
        setError("Failed to update item status.");
      } else {
        setSuccess(`"${item.name}" is now ${newActive ? "active" : "disabled"}.`);
        setTimeout(() => setSuccess(""), 2500);
      }
    } catch {
      setSoftwareItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: !newActive } : i))
      );
      setError("An unexpected error occurred while toggling status.");
    }
  };

  // Reorder software items (move up or down within section)
  const handleReorder = async (item: SoftwareItemRecord, direction: "up" | "down") => {
    const sectionItems = softwareItems
      .filter((i) => i.section === item.section)
      .sort((a, b) => a.order - b.order);

    const currentIndex = sectionItems.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sectionItems.length) return;

    const targetItem = sectionItems[targetIndex];
    const newOrder = targetItem.order;
    const oldOrder = item.order;

    // Optimistic swap
    setSoftwareItems((prev) =>
      prev.map((i) => {
        if (i.id === item.id) return { ...i, order: newOrder };
        if (i.id === targetItem.id) return { ...i, order: oldOrder };
        return i;
      })
    );

    try {
      await Promise.all([
        fetch(`/api/software-items/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        }),
        fetch(`/api/software-items/${targetItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: oldOrder }),
        }),
      ]);
      loadData();
    } catch {
      setError("Failed to reorder items.");
      loadData();
    }
  };

  // ADD item handler
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "software-items") {
      const trimmedName = swForm.name.trim();
      if (!trimmedName) return;

      setSubmitting(true);
      setError("");
      setSuccess("");

      try {
        const res = await fetch("/api/software-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            section: swForm.section,
            description: swForm.description.trim() || null,
            order: swForm.order || undefined,
            isActive: swForm.isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to add software item.");
          return;
        }

        setSuccess(`Added checklist item "${trimmedName}" successfully.`);
        setIsAddModalOpen(false);
        setSwForm({
          name: "",
          section: "SECOND",
          description: "",
          order: 1,
          isActive: true,
        });
        loadData();
      } catch {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Departments / OS
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

    if (activeTab === "software-items") {
      const trimmedName = swForm.name.trim();
      if (!trimmedName) return;

      setSubmitting(true);
      setError("");
      setSuccess("");

      try {
        const res = await fetch(`/api/software-items/${selectedItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            section: swForm.section,
            description: swForm.description.trim() || null,
            order: Number(swForm.order) || 1,
            isActive: swForm.isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update software item.");
          return;
        }

        setSuccess(`Updated "${trimmedName}" successfully.`);
        setIsEditModalOpen(false);
        setSelectedItem(null);
        loadData();
      } catch {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Departments / OS
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

  // SINGLE DELETE item handler
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
    } else if (activeTab === "operating-systems") {
      setOperatingSystems((prev) => prev.filter((o) => o.id !== idToDelete));
    } else {
      setSoftwareItems((prev) => prev.filter((s) => s.id !== idToDelete));
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

      if (data.message) {
        setSuccess(data.message);
      } else {
        setSuccess(`Removed "${itemName}" successfully.`);
      }

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

  // MULTIPLE / BULK DELETE handler
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
    } else if (activeTab === "operating-systems") {
      setOperatingSystems((prev) => prev.filter((o) => !selectedIds.has(o.id)));
    } else {
      setSoftwareItems((prev) => prev.filter((s) => !selectedIds.has(s.id)));
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

      if (data.message) {
        setSuccess(data.message);
      } else {
        setSuccess(`Successfully deleted ${count} ${getSingularLabel(activeTab).toLowerCase()}(s).`);
      }

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

  // BULK ACTIVATE / DEACTIVATE for software items
  const handleBulkToggleActive = async (targetActive: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    setSubmitting(true);
    setError("");
    setSuccess("");

    // Optimistic update
    setSoftwareItems((prev) =>
      prev.map((i) => (selectedIds.has(i.id) ? { ...i, isActive: targetActive } : i))
    );

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/software-items/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: targetActive }),
          })
        )
      );
      setSuccess(`Marked ${ids.length} item(s) as ${targetActive ? "active" : "disabled"}.`);
      setSelectedIds(new Set());
      loadData();
    } catch {
      setError("Failed to update selected items.");
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
      else if (activeTab === "operating-systems") setOperatingSystems(data);
      else setSoftwareItems(data);

      setSuccess(`Restored standard default ${getSingularLabel(activeTab).toLowerCase()} options.`);
    } catch {
      setError("Failed to restore defaults.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (activeTab === "software-items") {
      // Calculate next order for the default section
      const defaultSec: ChecklistSectionType =
        selectedSectionFilter !== "ALL"
          ? (selectedSectionFilter as ChecklistSectionType)
          : "SECOND";
      const existingInSec = softwareItems.filter((i) => i.section === defaultSec);
      const nextOrder = existingInSec.length > 0
        ? Math.max(...existingInSec.map((i) => i.order)) + 1
        : 1;

      setSwForm({
        name: "",
        section: defaultSec,
        description: "",
        order: nextOrder,
        isActive: true,
      });
    } else {
      setInputValue("");
    }
    setError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    if (activeTab === "software-items") {
      setSwForm({
        name: item.name,
        section: item.section,
        description: item.description || "",
        order: item.order,
        isActive: item.isActive,
      });
    } else {
      setInputValue(item.name);
    }
    setIsEditModalOpen(true);
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
                  <p className="text-purple-200 text-xs mt-0.5">Master Data & Checklist Setup</p>
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

            <button
              onClick={() => switchTab("software-items")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === "software-items"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>📋</span> Software Checklist Items ({softwareItems.length})
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
                {activeTab === "software-items" && "Software Installation Checklist Items (FORM-IT-004.00)"}
              </h1>
              <p className="text-purple-200 text-sm mt-1 max-w-2xl">
                {activeTab === "departments" &&
                  "Configure the official department list. Technical Support will select from these departments in the checklist form."}
                {activeTab === "operating-systems" &&
                  "Manage the operating systems catalog available to Technical Support when commissioning new PCs and laptops."}
                {activeTab === "software-items" &&
                  "Customize the software items and setup tasks that populate on new checklists. You can add new software, assign sections, toggle active status, and reorder items."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openAddModal}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-purple-200 text-xs block">Configured Departments</span>
              <span className="text-2xl font-bold text-white mt-1 block">{departments.length}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-purple-200 text-xs block">Operating Systems</span>
              <span className="text-2xl font-bold text-white mt-1 block">{operatingSystems.length}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-purple-200 text-xs block">Checklist Items Total</span>
              <span className="text-2xl font-bold text-white mt-1 block">{softwareItems.length}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs">
              <span className="text-emerald-300 text-xs block">Active on New Checklists</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                {softwareItems.filter((s) => s.isActive).length}
              </span>
            </div>
          </div>
        </div>

        {/* Content Section with Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Sub-navigation & Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder={`Search ${getSingularLabel(activeTab).toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
              </div>

              {activeTab === "software-items" && (
                <div className="flex overflow-x-auto gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSectionFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                      selectedSectionFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Sections ({softwareItems.length})
                  </button>
                  {SECTIONS.map((sec) => {
                    const count = softwareItems.filter((i) => i.section === sec.id).length;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSelectedSectionFilter(sec.id)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                          selectedSectionFilter === sec.id
                            ? "bg-white text-slate-900 shadow-xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {sec.short} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto text-xs text-slate-500">
              <span>Showing {currentList.length} item(s)</span>
            </div>
          </div>

          {/* ── BULK ACTIONS TOOLBAR ── */}
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

                {activeTab === "software-items" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleActive(true)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>🟢</span>
                      <span>Activate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleActive(false)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>⚪</span>
                      <span>Disable</span>
                    </button>
                  </>
                )}

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
                  {activeTab === "software-items" ? (
                    <>
                      <th className="w-20 px-3 py-3.5 text-center font-semibold">Order</th>
                      <th className="px-5 py-3.5 font-semibold">Software / Setup Task</th>
                      <th className="px-4 py-3.5 font-semibold">Section</th>
                      <th className="w-28 px-4 py-3.5 font-semibold text-center">Status</th>
                      <th className="w-28 px-4 py-3.5 font-semibold text-center">Usage</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-5 py-3.5 font-semibold">Name / Designation</th>
                      <th className="px-5 py-3.5 font-semibold">Created Date</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === "software-items" ? 7 : 4} className="px-6 py-12 text-center text-slate-400">
                      Loading data...
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === "software-items" ? 7 : 4} className="px-6 py-12 text-center text-slate-400">
                      No {getSingularLabel(activeTab).toLowerCase()}s found. Click "+ Add New {getSingularLabel(activeTab)}" or "🔄 Defaults" above!
                    </td>
                  </tr>
                ) : activeTab === "software-items" ? (
                  filteredSoftwareItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const secDef = SECTIONS.find((s) => s.id === item.section) || SECTIONS[0];
                    const resultsCount = item._count?.results ?? 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition ${isSelected ? "bg-purple-50/70" : "hover:bg-slate-50/80"} ${
                          !item.isActive ? "opacity-60 bg-slate-50/40" : ""
                        }`}
                      >
                        <td className="w-12 px-5 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            aria-label={`Select item ${item.name}`}
                          />
                        </td>

                        {/* Order & sequence adjustment */}
                        <td className="w-20 px-3 py-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="font-mono text-xs font-bold text-slate-600">
                              #{item.order}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                title="Move up"
                                onClick={() => handleReorder(item, "up")}
                                className="text-[10px] text-slate-400 hover:text-slate-700 leading-none p-0.5 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                title="Move down"
                                onClick={() => handleReorder(item, "down")}
                                className="text-[10px] text-slate-400 hover:text-slate-700 leading-none p-0.5 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name & Description */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{item.name}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-0.5 max-w-md line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </td>

                        {/* Section badge */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${secDef.badge}`}
                          >
                            {secDef.short}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="w-28 px-4 py-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                            }`}
                            title={item.isActive ? "Click to disable from new checklists" : "Click to enable on new checklists"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            <span>{item.isActive ? "Active" : "Disabled"}</span>
                          </button>
                        </td>

                        {/* Usage counter */}
                        <td className="w-28 px-4 py-4 text-center whitespace-nowrap text-xs text-slate-500">
                          {resultsCount > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {resultsCount} list{resultsCount === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unused</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem({
                                id: item.id,
                                name: item.name,
                                resultsCount,
                              });
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
                            onClick={() => openEditModal(d)}
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
                            onClick={() => openEditModal(o)}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
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
              {activeTab === "software-items" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Software / Setup Task Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g., AutoCAD 2024, Adobe Acrobat, MySQL Workbench"
                      value={swForm.name}
                      onChange={(e) => setSwForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Checklist Section <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={swForm.section}
                        onChange={(e) => {
                          const sec = e.target.value as ChecklistSectionType;
                          const existingInSec = softwareItems.filter((i) => i.section === sec);
                          const nextOrder = existingInSec.length > 0
                            ? Math.max(...existingInSec.map((i) => i.order)) + 1
                            : 1;
                          setSwForm((f) => ({ ...f, section: sec, order: nextOrder }));
                        }}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        {SECTIONS.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Position / Order No.
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={swForm.order}
                        onChange={(e) =>
                          setSwForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 1 }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description / Instructions <span className="text-xs text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Install full engineering package and verify license server"
                      value={swForm.description}
                      onChange={(e) => setSwForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="sw-add-active"
                      checked={swForm.isActive}
                      onChange={(e) => setSwForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="sw-add-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Include automatically on newly created checklists
                    </label>
                  </div>
                </>
              ) : (
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
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
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

      {/* ── EDIT MODAL ── */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
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
              {activeTab === "software-items" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Software / Setup Task Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={swForm.name}
                      onChange={(e) => setSwForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Checklist Section <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={swForm.section}
                        onChange={(e) =>
                          setSwForm((f) => ({
                            ...f,
                            section: e.target.value as ChecklistSectionType,
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        {SECTIONS.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Position / Order No.
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={swForm.order}
                        onChange={(e) =>
                          setSwForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 1 }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description / Instructions <span className="text-xs text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={swForm.description}
                      onChange={(e) => setSwForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="sw-edit-active"
                      checked={swForm.isActive}
                      onChange={(e) => setSwForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="sw-edit-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Include automatically on newly created checklists
                    </label>
                  </div>
                </>
              ) : (
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
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
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
                Are you sure you want to remove{" "}
                <strong className="text-slate-900 font-bold">"{selectedItem.name}"</strong>?
              </p>

              {activeTab === "software-items" && selectedItem.resultsCount && selectedItem.resultsCount > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  ⚠️ <strong>Notice:</strong> This item is attached to <strong>{selectedItem.resultsCount}</strong> existing checklist(s). To protect historical records, it will be <strong>deactivated</strong> instead of deleted, so it won&apos;t appear on future checklists.
                </div>
              ) : null}

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
                  {submitting ? "Processing..." : "Yes, Proceed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRMATION MODAL ── */}
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
                Are you sure you want to remove{" "}
                <strong className="text-red-600 font-bold">{selectedIds.size}</strong> selected{" "}
                {getSingularLabel(activeTab).toLowerCase()}(s)?
              </p>

              {activeTab === "software-items" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  ℹ️ Any selected items linked to past checklists will be safely deactivated so historical records remain valid. Unused items will be permanently deleted.
                </div>
              )}

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
                  {submitting ? "Processing..." : `Yes, Delete (${selectedIds.size})`}
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
