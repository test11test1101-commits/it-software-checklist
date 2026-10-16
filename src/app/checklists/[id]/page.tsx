"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface SoftwareItem {
  id: string;
  name: string;
  section: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | "FINAL";
  order: number;
  description?: string;
  isActive?: boolean;
}

interface ChecklistResult {
  id: string;
  isChecked: boolean;
  notes?: string;
  softwareItem: SoftwareItem;
}

interface Checklist {
  id: string;
  computerName: string;
  operatingSystem?: string;
  hddSsdSerial?: string;
  department?: string;
  date: string;
  status: string;
  installerName?: string;
  preparedByName?: string;
  checkedByName?: string;
  approvedByName?: string;
  remarks?: string;
  branch?: { name: string };
  results: ChecklistResult[];
}

const SECTIONS = ["FIRST", "SECOND", "THIRD", "FOURTH", "FINAL"] as const;

const SECTION_LABELS: Record<string, string> = {
  FIRST: "FIRST — Initial Setup",
  SECOND: "SECOND — Core Software",
  THIRD: "THIRD — Department Software",
  FOURTH: "FOURTH — Network & Access",
  FINAL: "FINAL — Completion & Verification",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-300",
  CHECKED: "bg-yellow-100 text-yellow-700 border-yellow-300",
  APPROVED: "bg-green-100 text-green-700 border-green-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
};

const NEXT_STATUS: Record<string, { label: string; status: string; color: string } | null> = {
  DRAFT: { label: "Submit for Checking", status: "SUBMITTED", color: "bg-blue-600 hover:bg-blue-500" },
  SUBMITTED: { label: "Mark as Checked", status: "CHECKED", color: "bg-yellow-600 hover:bg-yellow-500" },
  CHECKED: { label: "Approve", status: "APPROVED", color: "bg-green-600 hover:bg-green-500" },
  APPROVED: null,
  REJECTED: { label: "Resubmit", status: "SUBMITTED", color: "bg-blue-600 hover:bg-blue-500" },
};

export default function ChecklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Available catalog items not currently in this checklist
  const [availableCatalog, setAvailableCatalog] = useState<SoftwareItem[]>([]);

  // Modal state for adding items to this checklist
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"custom" | "catalog">("custom");
  const [addingSection, setAddingSection] = useState<"FIRST" | "SECOND" | "THIRD" | "FOURTH" | "FINAL">("SECOND");
  const [customItemForm, setCustomItemForm] = useState({
    name: "",
    description: "",
    notes: "",
    saveToCatalog: false,
  });
  const [submittingItem, setSubmittingItem] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/checklists/${id}`);
      if (!res.ok) return;
      const data: Checklist = await res.json();
      setChecklist(data);

      const r: Record<string, boolean> = {};
      const n: Record<string, string> = {};
      data.results.forEach((x) => {
        r[x.id] = x.isChecked;
        n[x.id] = x.notes || "";
      });
      setResults(r);
      setNotes(n);

      // Load available catalog items
      const itemsRes = await fetch(`/api/checklists/${id}/items`);
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        if (Array.isArray(itemsData.availableCatalog)) {
          setAvailableCatalog(itemsData.availableCatalog);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleItem = (resultId: string) => {
    if (checklist?.status !== "DRAFT") return;
    setResults((prev) => ({ ...prev, [resultId]: !prev[resultId] }));
  };

  const handleNoteChange = (resultId: string, val: string) => {
    if (checklist?.status !== "DRAFT") return;
    setNotes((prev) => ({ ...prev, [resultId]: val }));
  };

  const save = async () => {
    if (!checklist) return;
    setSaving(true);
    const resultsPayload = checklist.results.map((r) => ({
      id: r.id,
      isChecked: results[r.id] ?? false,
      notes: notes[r.id] ?? r.notes ?? null,
    }));
    await fetch(`/api/checklists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: resultsPayload }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const advanceStatus = async () => {
    if (!checklist) return;
    const next = NEXT_STATUS[checklist.status];
    if (!next) return;
    await save();
    await fetch(`/api/checklists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next.status }),
    });
    await load();
  };

  const rejectChecklist = async () => {
    if (!checklist) return;
    await fetch(`/api/checklists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    await load();
  };

  // Remove an item from this specific checklist
  const handleRemoveItem = async (resultId: string, itemName: string) => {
    if (checklist?.status !== "DRAFT") return;
    if (!confirm(`Remove "${itemName}" from this computer's checklist? (This only excludes it from this PC)`)) {
      return;
    }

    // Optimistic removal
    setChecklist((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        results: prev.results.filter((r) => r.id !== resultId),
      };
    });

    try {
      const res = await fetch(`/api/checklists/${id}/items/${resultId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActionMessage({ type: "success", text: `Removed "${itemName}" from this checklist.` });
        setTimeout(() => setActionMessage(null), 3000);
        await load();
      } else {
        setActionMessage({ type: "error", text: "Failed to remove item." });
        await load();
      }
    } catch {
      setActionMessage({ type: "error", text: "An error occurred while removing item." });
      await load();
    }
  };

  // Add a custom item or add from catalog
  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemForm.name.trim()) return;

    setSubmittingItem(true);
    try {
      const res = await fetch(`/api/checklists/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customItemForm.name.trim(),
          section: addingSection,
          description: customItemForm.description.trim() || undefined,
          notes: customItemForm.notes.trim() || undefined,
          saveToCatalog: customItemForm.saveToCatalog,
          isChecked: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setActionMessage({ type: "error", text: data.error || "Failed to add item." });
        return;
      }

      setIsAddModalOpen(false);
      setCustomItemForm({ name: "", description: "", notes: "", saveToCatalog: false });
      setActionMessage({ type: "success", text: `Added "${customItemForm.name.trim()}" to this checklist.` });
      setTimeout(() => setActionMessage(null), 3000);
      await load();
    } catch {
      setActionMessage({ type: "error", text: "An error occurred while adding item." });
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleAddFromCatalog = async (softwareItemId: string, itemName: string) => {
    try {
      const res = await fetch(`/api/checklists/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          softwareItemId,
          isChecked: false,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setActionMessage({ type: "success", text: `Added "${itemName}" from catalog to this checklist.` });
        setTimeout(() => setActionMessage(null), 3000);
        await load();
      } else {
        const data = await res.json();
        setActionMessage({ type: "error", text: data.error || "Failed to add catalog item." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Failed to add catalog item." });
    }
  };

  const openAddModal = (section?: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | "FINAL") => {
    if (section) setAddingSection(section);
    setCustomItemForm({ name: "", description: "", notes: "", saveToCatalog: false });
    setIsAddModalOpen(true);
  };

  const getProgress = (section: string) => {
    if (!checklist) return { checked: 0, total: 0 };
    const items = checklist.results.filter((r) => r.softwareItem.section === section);
    const checked = items.filter((r) => results[r.id]).length;
    return { checked, total: items.length };
  };

  const totalProgress = () => {
    if (!checklist) return { checked: 0, total: 0 };
    const checked = checklist.results.filter((r) => results[r.id]).length;
    return { checked, total: checklist.results.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading checklist…</div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">
          Checklist not found. <Link href="/" className="text-blue-600">Go back</Link>
        </div>
      </div>
    );
  }

  const progress = totalProgress();
  const pct = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;
  const nextAction = NEXT_STATUS[checklist.status];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Nav */}
      <nav className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-lg print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-slate-400 hover:text-white transition text-sm">← Dashboard</Link>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 text-sm">📋</span>
            <span className="font-semibold text-sm truncate max-w-[200px]">{checklist.computerName}</span>
          </div>
          <div className="flex gap-2">
            {checklist.status === "DRAFT" && (
              <button
                id="save-btn"
                onClick={save}
                disabled={saving}
                className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-1.5 rounded-lg transition border border-white/20 cursor-pointer"
              >
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
              </button>
            )}
            <Link
              href={`/checklists/${id}/print`}
              target="_blank"
              id="print-btn"
              className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-1.5 rounded-lg transition border border-white/20"
            >
              🖨 Print A4
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Action feedback message */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between animate-in fade-in duration-150 ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 text-white px-6 py-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-lg font-bold">SOFTWARE INSTALLATION CHECKLIST</h1>
                <p className="text-slate-400 text-xs">FORM-IT-004.00</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[checklist.status]}`}>
                  {checklist.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400 text-xs block">Branch / Dept</span>
              <strong>
                {checklist.branch?.name && checklist.department
                  ? `${checklist.branch.name} · ${checklist.department}`
                  : checklist.branch?.name || checklist.department || "—"}
              </strong>
            </div>
            <div><span className="text-slate-400 text-xs block">Date</span><strong>{new Date(checklist.date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
            <div><span className="text-slate-400 text-xs block">Computer Name</span><strong>{checklist.computerName}</strong></div>
            <div><span className="text-slate-400 text-xs block">Operating System</span><strong>{checklist.operatingSystem || "—"}</strong></div>
            <div><span className="text-slate-400 text-xs block">HDD/SSD Serial</span><strong>{checklist.hddSsdSerial || "—"}</strong></div>
            <div>
              <span className="text-slate-400 text-xs block mb-1">Progress</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-600">{progress.checked}/{progress.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customization Toolbar & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {(nextAction || checklist.status === "SUBMITTED" || checklist.status === "CHECKED") && (
            <div className="flex gap-3 flex-wrap">
              {nextAction && (
                <button
                  id="advance-status-btn"
                  onClick={advanceStatus}
                  className={`${nextAction.color} text-white font-semibold px-5 py-2 rounded-lg text-sm transition cursor-pointer shadow-sm`}
                >
                  {nextAction.label}
                </button>
              )}
              {(checklist.status === "SUBMITTED" || checklist.status === "CHECKED") && (
                <button
                  id="reject-btn"
                  onClick={rejectChecklist}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition cursor-pointer shadow-sm"
                >
                  Reject
                </button>
              )}
            </div>
          )}

          {checklist.status === "DRAFT" && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => openAddModal()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>+</span>
                <span>Add Item to This Checklist</span>
              </button>
            </div>
          )}
        </div>

        {/* Checklist Sections */}
        {SECTIONS.map((section) => {
          const items = checklist.results.filter((r) => r.softwareItem.section === section);
          const { checked, total } = getProgress(section);

          return (
            <div key={section} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-sm">{SECTION_LABELS[section]}</h2>
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">{checked}/{total}</span>
                </div>

                {checklist.status === "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => openAddModal(section)}
                    className="text-xs text-yellow-300 hover:text-white font-medium flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <span>+</span>
                    <span>Add to {section}</span>
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No items in this section for this computer.
                  {checklist.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => openAddModal(section)}
                      className="ml-2 text-blue-600 hover:underline cursor-pointer font-medium"
                    >
                      + Add an item
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((result) => {
                    const isChecked = results[result.id] ?? false;
                    const itemNote = notes[result.id] !== undefined ? notes[result.id] : (result.notes || "");

                    return (
                      <div
                        key={result.id}
                        className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isChecked ? "bg-slate-50/60" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            id={`item-${result.id}`}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(result.id)}
                            disabled={checklist.status !== "DRAFT"}
                            className="w-4 h-4 rounded accent-blue-600 mt-1 shrink-0 cursor-pointer disabled:cursor-default"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`item-${result.id}`}
                              className={`text-sm font-semibold cursor-pointer block ${
                                isChecked ? "line-through text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {result.softwareItem.name}
                            </label>
                            {result.softwareItem.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{result.softwareItem.description}</p>
                            )}

                            {/* Remarks / Notes Input for this specific item (prints in remarks column) */}
                            {checklist.status === "DRAFT" ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-400 shrink-0">Remarks:</span>
                                <input
                                  type="text"
                                  placeholder="e.g., version, key, or notes (optional)"
                                  value={itemNote}
                                  onChange={(e) => handleNoteChange(result.id, e.target.value)}
                                  className="w-full max-w-sm text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            ) : (
                              itemNote && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                  Remarks: {itemNote}
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          {isChecked && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ✓ Installed
                            </span>
                          )}

                          {checklist.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(result.id, result.softwareItem.name)}
                              className="text-xs text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Exclude / Remove from this checklist"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Sign-offs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sign-off Information</h2>
            <span className="text-xs text-slate-400">FORM-IT-004.00 Official Sign-off</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              {
                label: "Install by",
                value: checklist.installerName,
                status: checklist.installerName ? "Encoded" : "Pending",
                color: checklist.installerName ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-400 bg-slate-50 border-slate-200",
              },
              {
                label: "Prepared by",
                value: checklist.preparedByName,
                status: checklist.preparedByName ? "Encoded" : "Pending",
                color: checklist.preparedByName ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-400 bg-slate-50 border-slate-200",
              },
              {
                label: "Check by",
                value: checklist.checkedByName,
                status: checklist.checkedByName ? "Checked" : "Pending Check",
                color: checklist.checkedByName ? "text-blue-700 bg-blue-50 border-blue-200" : "text-amber-700 bg-amber-50 border-amber-200",
              },
              {
                label: "Approved by",
                value: checklist.approvedByName,
                status: checklist.approvedByName ? "Approved" : "Pending Approval",
                color: checklist.approvedByName ? "text-green-700 bg-green-50 border-green-200" : "text-purple-700 bg-purple-50 border-purple-200",
              },
            ].map(({ label, value, status, color }) => (
              <div key={label} className="border border-slate-100 rounded-xl p-4 text-center bg-white shadow-xs">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${color}`}>
                    {status}
                  </span>
                </div>
                <div className="h-8 border-b border-slate-200 mb-2 flex items-center justify-center">
                  <span className="text-xs text-slate-300">✍ Signature</span>
                </div>
                <p className="font-semibold text-slate-800 text-sm truncate" title={value || undefined}>
                  {value || <span className="text-slate-400 font-normal italic">Auto upon action</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── MODAL: ADD CUSTOM ITEM OR FROM CATALOG ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add Item to This Checklist</h3>
                <p className="text-purple-200 text-xs">For {checklist.computerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAddMode("custom")}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer text-center ${
                  addMode === "custom"
                    ? "bg-white text-purple-900 shadow-sm font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ✨ New Custom Software / Task
              </button>
              <button
                type="button"
                onClick={() => setAddMode("catalog")}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer text-center ${
                  addMode === "catalog"
                    ? "bg-white text-purple-900 shadow-sm font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📚 Choose From Catalog ({availableCatalog.length})
              </button>
            </div>

            {addMode === "custom" ? (
              <form onSubmit={handleAddCustomItem} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Software / Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g., AutoCAD 2024, SolidWorks, Custom Accounting Plugin"
                    value={customItemForm.name}
                    onChange={(e) => setCustomItemForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Target Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addingSection}
                    onChange={(e) => setAddingSection(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {SECTION_LABELS[sec]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Install engineering module with network license"
                    value={customItemForm.description}
                    onChange={(e) => setCustomItemForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Initial Remarks / Notes <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., License Key or Special Config"
                    value={customItemForm.notes}
                    onChange={(e) => setCustomItemForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 bg-purple-50/70 p-3 rounded-xl border border-purple-100">
                  <input
                    type="checkbox"
                    id="saveToCatalog"
                    checked={customItemForm.saveToCatalog}
                    onChange={(e) => setCustomItemForm((f) => ({ ...f, saveToCatalog: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="saveToCatalog" className="text-xs text-purple-900 cursor-pointer font-medium">
                    Also add to company master catalog for future checklists
                  </label>
                </div>

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
                    disabled={submittingItem}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {submittingItem ? "Adding..." : "Add to This Checklist"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-2">
                  These master software catalog items are currently not in this checklist. Click to add:
                </p>
                {availableCatalog.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    All catalog software items are already included in this checklist!
                  </div>
                ) : (
                  availableCatalog.map((catItem) => (
                    <div
                      key={catItem.id}
                      className="p-3 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{catItem.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Section: <span className="font-medium text-slate-600">{catItem.section}</span>
                          {catItem.description ? ` · ${catItem.description}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddFromCatalog(catItem.id, catItem.name)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 shadow-xs"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
