"use client";

import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function InstallPrompt() {
  const { deferredPrompt, isInstalled, isStandalone, canInstall, handleInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(canInstall && !isInstalled && !isStandalone);

  const handleInstallClick = async () => {
    await handleInstall();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't render if already installed, in standalone mode, or no install prompt available
  if (!canInstall || isInstalled || isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card rounded-lg shadow-xl p-4 border-2 border-primary z-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1 text-card-foreground">Install Bullet Journal</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Install this app on your device for quick access and offline use.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 text-sm font-medium"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
