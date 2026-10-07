"use client";

import Link from "next/link";

interface PrintControlsProps {
  checklistId: string;
}

export function PrintControls({ checklistId }: PrintControlsProps) {
  return (
    <div className="print-controls fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-200">
      <Link
        href={`/checklists/${checklistId}`}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
      >
        ← Back
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
      >
        <span>🖨</span> Print / Save PDF
      </button>
    </div>
  );
}
