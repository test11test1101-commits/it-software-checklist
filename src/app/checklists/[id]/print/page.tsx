import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrintControls } from "@/components/PrintControls";

export const dynamic = "force-dynamic";

const SECTIONS = ["FIRST", "SECOND", "THIRD", "FOURTH", "FINAL"] as const;

const SECTION_LABELS: Record<string, string> = {
  FIRST: "FIRST",
  SECOND: "SECOND",
  THIRD: "THIRD",
  FOURTH: "FOURTH",
  FINAL: "FINAL",
};

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintChecklistPage({ params }: PrintPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: {
      branch: true,
      results: {
        include: { softwareItem: true },
        orderBy: [
          { softwareItem: { section: "asc" } },
          { softwareItem: { order: "asc" } },
        ],
      },
    },
  });

  if (!checklist) redirect("/");

  const bySection = (section: string) =>
    checklist.results.filter((r) => r.softwareItem.section === section);

  const formattedDate = new Date(checklist.date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="print-wrapper min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-black">
      <PrintControls checklistId={checklist.id} />

      <style>{`
        @media screen {
          .print-paper {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 10mm 12mm;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid #cbd5e1;
            box-sizing: border-box;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-wrapper {
            background: #fff !important;
            padding: 0 !important;
          }
          .print-paper {
            width: 100% !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-controls {
            display: none !important;
          }
        }

        .form-border-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
        }

        .form-border-table td,
        .form-border-table th {
          border: 1px solid #000;
          padding: 3px 6px;
          font-size: 8.5pt;
          line-height: 1.25;
        }

        .form-header-box {
          border: 2px solid #000;
          display: flex;
          align-items: stretch;
          margin-bottom: -1px;
        }

        .form-logo-box {
          width: 85px;
          border-right: 2px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14pt;
          text-align: center;
          padding: 4px;
          line-height: 1;
        }

        .form-title-box {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 12pt;
          font-weight: 800;
          letter-spacing: 0.5px;
          border-right: 2px solid #000;
          padding: 6px;
        }

        .form-meta-box {
          width: 95px;
          font-size: 7pt;
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          line-height: 1.4;
        }

        .info-tbl {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          border-top: none;
        }
        .info-tbl td {
          border: 1px solid #000;
          padding: 3px 6px;
          font-size: 8.5pt;
        }
        .info-lbl {
          font-weight: 700;
          background: #f3f4f6;
          width: 130px;
          white-space: nowrap;
        }

        .checklist-tbl {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          border-top: 1px solid #000;
          margin-top: 6px;
        }
        .checklist-tbl th {
          background: #e5e7eb;
          font-weight: 700;
          font-size: 8pt;
          border: 1px solid #000;
          padding: 3px 6px;
          text-align: center;
        }
        .checklist-tbl td {
          border: 1px solid #000;
          padding: 2.5px 6px;
          font-size: 8pt;
        }
        .section-header-row td {
          background: #111827;
          color: #ffffff;
          font-weight: 700;
          text-align: center;
          font-size: 8.5pt;
          padding: 3px;
          letter-spacing: 1px;
        }

        .sig-tbl {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          margin-top: 6px;
        }
        .sig-tbl td {
          border: 1px solid #000;
          width: 25%;
          text-align: center;
          padding: 4px;
        }
        .sig-lbl {
          font-weight: 700;
          font-size: 7.5pt;
          background: #f3f4f6;
          text-align: left;
        }
        .sig-val {
          font-size: 8.5pt;
          height: 36px;
          vertical-align: bottom;
          border-top: 1px solid #000;
          padding-top: 4px;
        }
      `}</style>

      <div className="print-paper relative font-sans">
        {/* Status watermark */}
        {checklist.status === "APPROVED" && (
          <div className="absolute top-28 right-12 text-green-700/20 border-4 border-green-700/20 font-black text-4xl px-4 py-2 rotate-[-20deg] pointer-events-none uppercase tracking-widest">
            APPROVED
          </div>
        )}
        {checklist.status === "REJECTED" && (
          <div className="absolute top-28 right-12 text-red-700/20 border-4 border-red-700/20 font-black text-4xl px-4 py-2 rotate-[-20deg] pointer-events-none uppercase tracking-widest">
            REJECTED
          </div>
        )}
        {checklist.status === "DRAFT" && (
          <div className="absolute top-28 right-12 text-slate-700/15 border-4 border-slate-700/15 font-black text-4xl px-4 py-2 rotate-[-20deg] pointer-events-none uppercase tracking-widest">
            DRAFT
          </div>
        )}

        {/* ── FORM HEADER ── */}
        <div className="form-header-box">
          <div className="form-logo-box">
            <div>
              <div style={{ fontSize: "14pt", fontWeight: "900" }}>IT</div>
              <div style={{ fontSize: "7pt", letterSpacing: "1px" }}>DEPT</div>
            </div>
          </div>
          <div className="form-title-box">
            SOFTWARE INSTALLATION CHECKLIST
          </div>
          <div className="form-meta-box">
            <strong>FORM-IT-004.00</strong>
            <span>Rev. No: 00</span>
            <span>Eff. Date:</span>
            <span>{formattedDate}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {/* ── COMPUTER INFORMATION TABLE ── */}
        <table className="info-tbl">
          <tbody>
            <tr>
              <td className="info-lbl">Branch / Dept.:</td>
              <td style={{ minWidth: "180px" }}>{checklist.branch?.name || checklist.department || ""}</td>
              <td className="info-lbl" style={{ width: "90px" }}>Date:</td>
              <td>{formattedDate}</td>
            </tr>
            <tr>
              <td className="info-lbl">Computer Name:</td>
              <td colSpan={3} style={{ fontWeight: 600 }}>{checklist.computerName}</td>
            </tr>
            <tr>
              <td className="info-lbl">O.S.:</td>
              <td>{checklist.operatingSystem || ""}</td>
              <td className="info-lbl">HDD/SSD Serial:</td>
              <td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{checklist.hddSsdSerial || ""}</td>
            </tr>
          </tbody>
        </table>

        {/* ── CHECKLIST ITEMS TABLE ── */}
        <table className="checklist-tbl">
          <thead>
            <tr>
              <th style={{ width: "28px" }}>No.</th>
              <th style={{ textAlign: "left" }}>Software / Setup Item</th>
              <th style={{ width: "70px" }}>Installed / Done</th>
              <th style={{ width: "120px", textAlign: "left" }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => {
              const items = bySection(section);
              if (items.length === 0) return null;
              return (
                <tbody key={`sec-tbody-${section}`}>
                  <tr className="section-header-row">
                    <td colSpan={4}>{SECTION_LABELS[section]}</td>
                  </tr>
                  {items.map((result, idx) => (
                    <tr key={result.id}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>{result.softwareItem.name}</td>
                      <td style={{ textAlign: "center", fontSize: "11pt", fontWeight: "bold" }}>
                        {result.isChecked ? "✓" : ""}
                      </td>
                      <td style={{ fontSize: "7.5pt", color: "#374151" }}>{result.notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </tbody>
        </table>

        {/* ── SIGNATURE SIGN-OFF TABLE ── */}
        <table className="sig-tbl">
          <tbody>
            <tr>
              <td className="sig-lbl">Install by:</td>
              <td className="sig-lbl">Prepared by:</td>
              <td className="sig-lbl">Check by:</td>
              <td className="sig-lbl">Approved by:</td>
            </tr>
            <tr>
              <td className="sig-val">{checklist.installerName || ""}</td>
              <td className="sig-val">{checklist.preparedByName || ""}</td>
              <td className="sig-val">{checklist.checkedByName || ""}</td>
              <td className="sig-val">{checklist.approvedByName || ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
