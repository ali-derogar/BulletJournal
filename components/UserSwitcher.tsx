"use client";

import { useState } from "react";
import { useUser } from "@/app/context/UserContext";
import { useTranslations } from "next-intl";

export default function UserSwitcher() {
  const t = useTranslations("userSwitcher");
  const { currentUser, allUsers, switchUser, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchUser = async (userId: string) => {
    try {
      await switchUser(userId);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch user:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2 bg-muted rounded text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent/10 transition-colors shadow-sm"
      >
        <svg
          className="w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <div className="text-left">
          <div className="text-sm font-medium text-foreground">
            {currentUser?.name || t("selectUser")}
          </div>
          <div className="text-xs text-muted-foreground">{t("switchUser")}</div>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border z-20">
            <div className="p-3">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("switchUser")}
              </div>
              <div className="space-y-1 mt-2">
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      currentUser?.id === user.id
                        ? "bg-accent/20 text-accent-foreground border border-accent"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{user.name}</span>
                      {currentUser?.id === user.id && (
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
