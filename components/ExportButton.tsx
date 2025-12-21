"use client";

import { useState } from "react";
import { getTasks, getExpenses, getSleep, getMood } from "@/storage";
import { exportDailyReportToPDF } from "@/utils/pdf-export";

interface ExportButtonProps {
  date: string;
  userId: string;
}

export default function ExportButton({ date, userId }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);

      const [tasks, expenses, sleep, mood] = await Promise.all([
        getTasks(date, userId),
        getExpenses(date, userId),
        getSleep(date, userId),
        getMood(date, userId),
      ]);

      exportDailyReportToPDF({
        date,
        tasks,
        expenses,
        sleep,
        mood,
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      aria-label="Export daily report to PDF"
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
    >
      {exporting ? (
        <>
          <span className="animate-pulse">●</span>
          Exporting...
        </>
      ) : (
        <>
          <span>📄</span>
          Export to PDF
        </>
      )}
    </button>
  );
}
