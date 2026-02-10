"use client";

import { useEffect } from "react";
import enMessages from "@/messages/en.json";
import faMessages from "@/messages/fa.json";

const getLocaleFromPath = (path: string) => (path && path.startsWith("/fa") ? "fa" : "en");
const getMessage = (messages: Record<string, unknown>, key: string) => {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
};
const formatMessage = (template: unknown, values?: Record<string, string | number>) => {
  if (typeof template !== "string") return "";
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  const locale = typeof window !== "undefined" ? getLocaleFromPath(window.location.pathname) : "en";
  const messages = locale === "fa" ? faMessages : enMessages;
  const t = (key: string, values?: Record<string, string | number>) =>
    formatMessage(getMessage(messages as Record<string, unknown>, key), values);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("errorPage.title")}
        </h2>
        <p className="text-gray-600 mb-6">
          {t("errorPage.message")}
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            {t("errorPage.tryAgain")}
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
          >
            {t("errorPage.goHome")}
          </button>
        </div>
        {error.message && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              {t("errorPage.details")}
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
