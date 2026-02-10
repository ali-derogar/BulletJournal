"use client";

import React, { Component, ReactNode } from "react";
import { useTranslations } from "next-intl";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  userId?: string;
  t?: (key: string, values?: Record<string, string | number>) => string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class UserErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`User ${this.props.userId || 'unknown'} error:`, error, errorInfo);
    // Could send to error reporting service here
  }

  render() {
    const t = this.props.t || ((key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      return key.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
    });

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="font-semibold text-red-800">{t("userErrorBoundary.title")}</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {this.props.userId
              ? t("userErrorBoundary.userMessage", { userId: this.props.userId })
              : t("userErrorBoundary.genericMessage")
            }
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            {t("userErrorBoundary.tryAgain")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function UserErrorBoundaryWithTranslations(props: Omit<Props, "t">) {
  const t = useTranslations();
  return <UserErrorBoundary {...props} t={t} />;
}
