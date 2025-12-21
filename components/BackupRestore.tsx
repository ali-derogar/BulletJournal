"use client";

import { useState, useRef } from "react";
import { exportAllData, importAllData, exportUserData, importUserData, downloadBackup } from "@/utils/backup";
import { useUser } from "@/app/context/UserContext";

export default function BackupRestore() {
  const { currentUser } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [backupType, setBackupType] = useState<"user" | "all">("user");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage("Exporting data...");

      let data: string;
      let userId: string | undefined;

      if (backupType === "user" && currentUser) {
        data = await exportUserData(currentUser.id);
        userId = currentUser.id;
      } else {
        data = await exportAllData();
      }

      downloadBackup(data, userId);
      setMessage("✓ Backup downloaded successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("✗ Export failed: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage("Importing data...");

      const text = await file.text();

      if (backupType === "user" && currentUser) {
        await importUserData(text, currentUser.id);
        setMessage(`✓ User data restored successfully for ${currentUser.name}`);
      } else {
        await importAllData(text);
        setMessage("✓ All data restored successfully. Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("✗ Import failed: " + (error as Error).message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Backup and restore"
        className="fixed bottom-4 right-4 w-12 h-12 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-900 flex items-center justify-center z-40"
      >
        ⚙️
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 w-80 z-40 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Backup & Restore</h3>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close"
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {/* Backup Type Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Backup Type</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="user"
                checked={backupType === "user"}
                onChange={(e) => setBackupType(e.target.value as "user")}
                className="mr-2"
              />
              <span className="text-sm">Current User Only</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={backupType === "all"}
                onChange={(e) => setBackupType(e.target.value as "all")}
                className="mr-2"
              />
              <span className="text-sm">All Users (Admin)</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          📥 Export Backup
        </button>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            className="hidden"
            id="restore-file"
          />
          <label
            htmlFor="restore-file"
            className={`block w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center cursor-pointer font-medium ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            📤 Restore Backup
          </label>
        </div>
      </div>

      {message && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-sm text-gray-700">
          {message}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        {backupType === "user"
          ? `Backup includes all data for ${currentUser?.name || "current user"}. Keep your backups safe!`
          : "Backup includes all users and their data. Keep your backups safe!"
        }
      </p>
    </div>
  );
}
