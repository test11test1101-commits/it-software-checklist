"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface SoftwareItem {
  id: string;
  name: string;
  section: string;
  order: number;
  description?: string;
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/checklists/${id}`);
    if (!res.ok) return;
    const data: Checklist = await res.json();
    setChecklist(data);
    const r: Record<string, boolean> = {};
    data.results.forEach((x) => { r[x.id] = x.isChecked; });
    setResults(r);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = (resultId: string) => {
    if (checklist?.status !== "DRAFT") return;
    setResults((prev) => ({ ...prev, [resultId]: !prev[resultId] }));
  };

  const save = async () => {
    if (!checklist) return;
    setSaving(true);
    const resultsPayload = checklist.results.map((r) => ({
      id: r.id,
      isChecked: results[r.id] ?? false,
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
        <div className="text-slate-400">Checklist not found. <Link href="/" className="text-blue-600">Go back</Link></div>
      </div>
    );
  }

  const progress = totalProgress();
  const pct = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;
  const nextAction = NEXT_STATUS[checklist.status];

  return (
    <div className="min-h-screen bg-slate-50">
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
                className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-1.5 rounded-lg transition border border-white/20"
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
              🖨 Print
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 text-white px-6 py-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-lg font-bold">SOFTWARE INSTALLATION CHECKLIST</h1>
                <p className="text-slate-400 text-xs">FORM-IT-004.00</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[checklist.status]}`}>
                {checklist.status}
              </span>
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

        {/* Action Buttons */}
        {(nextAction || checklist.status === "SUBMITTED" || checklist.status === "CHECKED") && (
          <div className="flex gap-3 flex-wrap">
            {nextAction && (
              <button
                id="advance-status-btn"
                onClick={advanceStatus}
                className={`${nextAction.color} text-white font-semibold px-5 py-2 rounded-lg text-sm transition`}
              >
                {nextAction.label}
              </button>
            )}
            {(checklist.status === "SUBMITTED" || checklist.status === "CHECKED") && (
              <button
                id="reject-btn"
                onClick={rejectChecklist}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
              >
                Reject
              </button>
            )}
          </div>
        )}

        {/* Checklist Sections */}
        {SECTIONS.map((section) => {
          const items = checklist.results.filter((r) => r.softwareItem.section === section);
          const { checked, total } = getProgress(section);
          if (items.length === 0) return null;
          return (
            <div key={section} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-between">
                <h2 className="font-bold text-sm">{SECTION_LABELS[section]}</h2>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">{checked}/{total}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map((result) => (
                  <label
                    key={result.id}
                    htmlFor={`item-${result.id}`}
                    className={`flex items-center gap-4 px-5 py-3 transition ${
                      checklist.status === "DRAFT" ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                    }`}
                  >
                    <input
                      id={`item-${result.id}`}
                      type="checkbox"
                      checked={results[result.id] ?? false}
                      onChange={() => toggleItem(result.id)}
                      disabled={checklist.status !== "DRAFT"}
                      className="w-4 h-4 rounded accent-blue-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${results[result.id] ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {result.softwareItem.name}
                      </p>
                      {result.softwareItem.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{result.softwareItem.description}</p>
                      )}
                    </div>
                    {results[result.id] && (
                      <span className="text-green-500 text-sm shrink-0">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* Sign-offs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sign-off</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Install by", value: checklist.installerName },
              { label: "Prepared by", value: checklist.preparedByName },
              { label: "Check by", value: checklist.checkedByName },
              { label: "Approved by", value: checklist.approvedByName },
            ].map(({ label, value }) => (
              <div key={label} className="border border-slate-100 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-2">{label}</p>
                <div className="h-8 border-b border-slate-200 mb-2" />
                <p className="font-medium text-slate-700 text-sm">{value || "_______________"}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
