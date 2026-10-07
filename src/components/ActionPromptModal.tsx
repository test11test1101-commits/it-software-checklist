"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface ActionPromptModalProps {
  userName?: string | null;
  userRole?: string;
  employeeId?: string | null;
}

export function ActionPromptModal({ userName, userRole, employeeId }: ActionPromptModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Open if ?welcome=1 is present, or if this is the first view this session for tech support
    const isWelcomeParam = searchParams.get("welcome") === "1" || searchParams.get("prompt") === "1";
    const hasPrompted = sessionStorage.getItem("tech_support_action_prompted");

    if (isWelcomeParam || !hasPrompted) {
      setIsOpen(true);
      sessionStorage.setItem("tech_support_action_prompted", "true");
    }
  }, [searchParams]);

  const handleSelect = (destination: string) => {
    setIsOpen(false);
    router.push(destination);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating quick-access button on dashboard to re-trigger prompt anytime */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-sm transition cursor-pointer"
        >
          <span>⚡</span>
          <span>Switch Action: Install PC or Double Check</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 relative">
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm transition"
                title="Close"
              >
                ✕
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-slate-950 mb-3 shadow">
                <span>👋</span>
                <span>
                  Welcome, {userName || "Technical Support"}
                  {employeeId ? ` (ID: ${employeeId})` : ""}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                What will you do?
              </h2>
              <p className="text-blue-200 text-xs sm:text-sm mt-1.5 max-w-lg">
                Please select your task. You can install applications on a new laptop/CPU, or double check an existing installation.
              </p>
            </div>

            {/* Selection Cards */}
            <div className="p-6 sm:p-8 space-y-4 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Choice 1: Install Application in New PC */}
                <button
                  type="button"
                  onClick={() => handleSelect("/checklists/new")}
                  className="group relative bg-white hover:bg-amber-50/40 border-2 border-slate-200 hover:border-yellow-400 rounded-2xl p-5 text-left transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center text-2xl shadow group-hover:scale-105 transition">
                        💻
                      </div>
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        Fresh Setup
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-900 transition">
                      Install Application in New PC
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Deploy a new laptop or CPU unit. Record computer name, OS, and serial number, and check off software through the 5 stages.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
                    <span>Start New PC Installation</span>
                    <span className="group-hover:translate-x-1 transition text-sm">→</span>
                  </div>
                </button>

                {/* Choice 2: Double Check Installation */}
                <button
                  type="button"
                  onClick={() => handleSelect("/checklists?filter=check")}
                  className="group relative bg-white hover:bg-blue-50/40 border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 text-left transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow group-hover:scale-105 transition">
                        🔍
                      </div>
                      <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                        Quality Review
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-900 transition">
                      Double Check Installation
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Review completed PC setups. Inspect installed software, verify configurations, double-check drivers & antivirus, and complete quality sign-offs.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-800">
                    <span>Double Check Installed PCs</span>
                    <span className="group-hover:translate-x-1 transition text-sm">→</span>
                  </div>
                </button>
              </div>

              {/* Dismiss / Dashboard Option */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Role: <strong className="text-slate-600">{userRole === "ADMIN" ? "Administrator" : "Technical Support"}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium underline py-1 px-2 cursor-pointer transition"
                >
                  Continue to Full Dashboard →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
