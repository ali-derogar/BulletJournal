'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card rounded-2xl p-8 shadow-lg border border-destructive">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-destructive">خطا رخ داد | Error Occurred</h1>
                <p className="text-sm text-muted-foreground">مشکلی در بارگذاری برنامه پیش آمد</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h2 className="font-semibold text-foreground mb-2">خطا | Error:</h2>
                <pre className="text-sm text-destructive overflow-x-auto whitespace-pre-wrap break-words">
                  {this.state.error?.toString()}
                </pre>
              </div>

              {this.state.errorInfo && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h2 className="font-semibold text-foreground mb-2">جزئیات | Details:</h2>
                  <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    window.location.reload();
                  }}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
                >
                  🔄 تلاش مجدد | Reload
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl font-semibold hover:bg-muted/80 transition-all"
                >
                  🗑️ پاک کردن داده‌ها | Clear Data
                </button>
              </div>

              <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
                <p>اگر مشکل ادامه دارد، لطفاً از مرورگر دیگری استفاده کنید</p>
                <p>If the problem persists, please try another browser</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
