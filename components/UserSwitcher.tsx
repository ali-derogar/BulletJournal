"use client";

import { useState } from "react";
import { useUser } from "@/app/context/UserContext";

export default function UserSwitcher() {
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
      <div className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <svg
          className="w-5 h-5 text-gray-600"
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
          <div className="text-sm font-medium text-gray-900">
            {currentUser?.name || "Select User"}
          </div>
          <div className="text-xs text-gray-500">Switch user</div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
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
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Switch User
              </div>
              <div className="space-y-1 mt-2">
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      currentUser?.id === user.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50"
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
