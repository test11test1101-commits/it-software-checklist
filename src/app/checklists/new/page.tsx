"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Branch {
  id: string;
  name: string;
}

export default function NewChecklistPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    branchId: "",
    department: "",
    date: today,
    computerName: "",
    operatingSystem: "Windows 11 Pro",
    hddSsdSerial: "",
    installerName: "",
    preparedByName: "",
    checkedByName: "",
    approvedByName: "",
  });

  useEffect(() => {
    fetch("/api/branches").then((r) => r.json()).then(setBranches);
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

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
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError("Failed to create checklist. Please try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    router.push(`/checklists/${data.id}`);
  };

  const osOptions = [
    "Windows 11 Pro",
    "Windows 11 Home",
    "Windows 10 Pro",
    "Windows 10 Home",
    "Windows Server 2019",
    "Windows Server 2022",
  ];

  return (
    <div className="min-h-screen bg-slate-50">
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                Computer Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    id="branchId"
                    value={form.branchId}
                    onChange={set("branchId")}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Select Branch —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input
                    id="department"
                    type="text"
                    value={form.department}
                    onChange={set("department")}
                    placeholder="e.g., Finance, Operations"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date <span className="text-red-500">*</span></label>
                  <input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={set("date")}
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Computer Name <span className="text-red-500">*</span></label>
                  <input
                    id="computerName"
                    type="text"
                    value={form.computerName}
                    onChange={set("computerName")}
                    placeholder="e.g., PC-BRANCH1-001"
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Operating System</label>
                  <select
                    id="operatingSystem"
                    value={form.operatingSystem}
                    onChange={set("operatingSystem")}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {osOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HDD/SSD Serial No.</label>
                  <input
                    id="hddSsdSerial"
                    type="text"
                    value={form.hddSsdSerial}
                    onChange={set("hddSsdSerial")}
                    placeholder="Serial number"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Sign-off Fields */}
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                Sign-off Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "installerName", label: "Install by" },
                  { id: "preparedByName", label: "Prepared by" },
                  { id: "checkedByName", label: "Check by" },
                  { id: "approvedByName", label: "Approved by" },
                ].map(({ id, label }) => (
                  <div key={id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                    <input
                      id={id}
                      type="text"
                      value={(form as any)[id]}
                      onChange={set(id)}
                      placeholder={`Name of person`}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="flex gap-3 pt-2">
              <button
                id="create-checklist-submit"
                type="submit"
                disabled={loading}
                className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60 text-sm"
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
