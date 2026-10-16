"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Department {
  id: string;
  name: string;
}

interface OperatingSystem {
  id: string;
  name: string;
}

interface SoftwareItemSummary {
  id: string;
  name: string;
  section: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | "FINAL";
  order: number;
  description?: string | null;
}

const SECTIONS = [
  { id: "FIRST" as const, label: "FIRST — Initial Setup" },
  { id: "SECOND" as const, label: "SECOND — Core Software" },
  { id: "THIRD" as const, label: "THIRD — Department Software" },
  { id: "FOURTH" as const, label: "FOURTH — Network & Access" },
  { id: "FINAL" as const, label: "FINAL — Completion & Verification" },
] as const;

export default function NewChecklistPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OperatingSystem[]>([]);
  const [softwareItems, setSoftwareItems] = useState<SoftwareItemSummary[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSoftwareCustomizeOpen, setIsSoftwareCustomizeOpen] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    branch: "",
    department: "",
    date: today,
    computerName: "",
    operatingSystem: "",
    hddSsdSerial: "",
    installerName: "",
    preparedByName: "",
    checkedByName: "",
    approvedByName: "",
  });

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [dRes, osRes, meRes, swRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/operating-systems"),
          fetch("/api/me"),
          fetch("/api/software-items?active=true"),
        ]);

        const [dData, osData, meData, swData] = await Promise.all([
          dRes.ok ? dRes.json() : [],
          osRes.ok ? osRes.json() : [],
          meRes.ok ? meRes.json() : null,
          swRes.ok ? swRes.json() : [],
        ]);

        if (Array.isArray(dData)) setDepartments(dData);
        if (Array.isArray(osData)) {
          setOperatingSystems(osData);
          if (osData.length > 0) {
            const win11 = osData.find((o) => o.name === "Windows 11 Pro");
            setForm((f) => ({ ...f, operatingSystem: win11 ? win11.name : osData[0].name }));
          }
        }
        if (Array.isArray(swData)) {
          setSoftwareItems(swData);
          setSelectedItemIds(new Set(swData.map((s) => s.id)));
        }
        if (meData?.user) {
          const currentUserName = meData.user.name || meData.user.username || "";
          if (currentUserName) {
            setForm((f) => ({
              ...f,
              installerName: currentUserName,
              preparedByName: currentUserName,
            }));
          }
        }
      } catch {
        console.error("Failed to load master dropdown data");
      } finally {
        setLoadingData(false);
      }
    }

    loadMasterData();
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (section: string) => {
    const secItemIds = softwareItems.filter((i) => i.section === section).map((i) => i.id);
    const allSecSelected = secItemIds.every((id) => selectedItemIds.has(id));

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (allSecSelected) {
        secItemIds.forEach((id) => next.delete(id));
      } else {
        secItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItemIds(new Set(softwareItems.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.computerName.trim()) {
      setError("Computer Name is required.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        selectedSoftwareItemIds: Array.from(selectedItemIds),
      }),
    });
    if (!res.ok) {
      setError("Failed to create checklist. Please try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    router.push(`/checklists/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Nav */}
      <nav className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition text-sm">← Dashboard</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900">📋</span>
            <span className="font-semibold text-sm">New Installation Checklist</span>
          </div>
          <div />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Form header strip matching FORM-IT-004.00 */}
          <div className="bg-slate-800 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">SOFTWARE INSTALLATION CHECKLIST</h1>
                <p className="text-slate-400 text-xs mt-0.5">FORM-IT-004.00 — IT Department</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Revision: 00</p>
                <p>Effective Date: {new Date().toLocaleDateString("en-PH")}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Computer Information */}
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Computer Information
                </h2>
                <span className="text-xs text-slate-400">Master dropdowns configured in Administrator Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="branch" className="block text-sm font-medium text-slate-700">
                      Branch
                    </label>
                    <span className="text-xs text-slate-400">Manual Entry</span>
                  </div>
                  <input
                    id="branch"
                    type="text"
                    value={form.branch}
                    onChange={set("branch")}
                    placeholder="e.g., Head Office, Cebu Branch, Warehouse"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Department Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="department" className="block text-sm font-medium text-slate-700">
                      Department
                    </label>
                    <span className="text-xs text-blue-600">Admin Managed</span>
                  </div>
                  <select
                    id="department"
                    value={form.department}
                    onChange={set("department")}
                    disabled={loadingData}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Select Department —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={set("date")}
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Computer Name */}
                <div>
                  <label htmlFor="computerName" className="block text-sm font-medium text-slate-700 mb-1">
                    Computer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="computerName"
                    type="text"
                    value={form.computerName}
                    onChange={set("computerName")}
                    placeholder="e.g., PC-FINANCE-001"
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Operating System Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="operatingSystem" className="block text-sm font-medium text-slate-700">
                      Operating System
                    </label>
                    <span className="text-xs text-blue-600">Admin Editable</span>
                  </div>
                  <select
                    id="operatingSystem"
                    value={form.operatingSystem}
                    onChange={set("operatingSystem")}
                    disabled={loadingData}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Select Operating System —</option>
                    {operatingSystems.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {/* HDD/SSD Serial */}
                <div>
                  <label htmlFor="hddSsdSerial" className="block text-sm font-medium text-slate-700 mb-1">
                    HDD/SSD Serial No.
                  </label>
                  <input
                    id="hddSsdSerial"
                    type="text"
                    value={form.hddSsdSerial}
                    onChange={set("hddSsdSerial")}
                    placeholder="e.g., WD-WCC4N7... or SN-980PRO"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Customization: Software items to include on this PC */}
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsSoftwareCustomizeOpen(!isSoftwareCustomizeOpen)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Software Items for This Machine ({selectedItemIds.size}/{softwareItems.length} selected)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click to review or uncheck any software items that do not apply to this specific computer.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition"
                >
                  {isSoftwareCustomizeOpen ? "Hide Software List ▲" : "Customize Software List ▼"}
                </button>
              </div>

              {isSoftwareCustomizeOpen && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-slate-500">Uncheck items that are not needed on this computer:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="text-slate-500 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {SECTIONS.map((sec) => {
                    const secItems = softwareItems.filter((i) => i.section === sec.id);
                    if (secItems.length === 0) return null;
                    const secItemIds = secItems.map((i) => i.id);
                    const allSecSelected = secItemIds.every((id) => selectedItemIds.has(id));

                    return (
                      <div key={sec.id} className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-700">{sec.label}</span>
                          <button
                            type="button"
                            onClick={() => toggleSection(sec.id)}
                            className="text-[11px] text-blue-600 hover:underline font-medium"
                          >
                            {allSecSelected ? "Deselect section" : "Select all section"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {secItems.map((item) => {
                            const isChecked = selectedItemIds.has(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-start gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                                  isChecked ? "hover:bg-slate-50" : "opacity-50 line-through"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleItem(item.id)}
                                  className="w-3.5 h-3.5 rounded text-blue-600 mt-0.5"
                                />
                                <span className="text-slate-800 font-medium">{item.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Sign-off Information */}
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Sign-off Information
                </h2>
                <span className="text-xs text-slate-400">
                  Auto-encoded for Technical Support & Workflow Sign-offs
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Install by */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="installerName" className="block text-sm font-medium text-slate-700">
                      Install by
                    </label>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Auto-encoded (Tech Support)
                    </span>
                  </div>
                  <input
                    id="installerName"
                    type="text"
                    value={form.installerName}
                    onChange={set("installerName")}
                    placeholder="Technical Support Name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                {/* Prepared by */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="preparedByName" className="block text-sm font-medium text-slate-700">
                      Prepared by
                    </label>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Auto-encoded (Tech Support)
                    </span>
                  </div>
                  <input
                    id="preparedByName"
                    type="text"
                    value={form.preparedByName}
                    onChange={set("preparedByName")}
                    placeholder="Technical Support Name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                {/* Check by */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="checkedByName" className="block text-sm font-medium text-slate-700">
                      Check by
                    </label>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Auto on Inspection / Check
                    </span>
                  </div>
                  <input
                    id="checkedByName"
                    type="text"
                    value={form.checkedByName}
                    onChange={set("checkedByName")}
                    placeholder="Auto-assigned when reviewer checks PC software"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Approved by */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="approvedByName" className="block text-sm font-medium text-slate-700">
                      Approved by
                    </label>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                      Auto on Final Approval
                    </span>
                  </div>
                  <input
                    id="approvedByName"
                    type="text"
                    value={form.approvedByName}
                    onChange={set("approvedByName")}
                    placeholder="Auto-assigned when approver signs off"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </section>

            <div className="flex gap-3 pt-2">
              <button
                id="create-checklist-submit"
                type="submit"
                disabled={loading}
                className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60 text-sm cursor-pointer shadow-sm"
              >
                {loading ? "Creating…" : "Create Checklist & Start Installation"}
              </button>
              <Link
                href="/"
                className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
