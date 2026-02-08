"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

interface UsePWAInstallReturn {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  canInstall: boolean;
  handleInstall: () => Promise<void>;
}

/**
 * Hook to manage PWA installation logic
 * Detects:
 * - beforeinstallprompt event
 * - navigator.getInstalledRelatedApps()
 * - window.matchMedia('(display-mode: standalone)')
 * - navigator.standalone (iOS)
 * 
 * Ensures the install button is never rendered when:
 * - The app is already installed
 * - The app is running in standalone/PWA mode
 * - The button does not reappear after refresh or navigation
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  
  // Use refs to track if we've already checked for installed apps
  const hasCheckedInstalledApps = useRef(false);
  const eventListenersAdded = useRef(false);

  // Check if app is installed using multiple methods
  const checkIfInstalled = useCallback(async () => {
    // Method 1: Check display-mode: standalone
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    
    // Method 2: Check navigator.standalone (iOS)
    const isIOSStandalone = (window.navigator as NavigatorStandalone).standalone === true;
    
    // Method 3: Check navigator.getInstalledRelatedApps()
    let isInstalledViaAPI = false;
    if ("getInstalledRelatedApps" in navigator) {
      try {
        const installedApps = await (navigator as any).getInstalledRelatedApps();
        isInstalledViaAPI = installedApps && installedApps.length > 0;
      } catch (error) {
        console.debug("getInstalledRelatedApps not available or failed:", error);
      }
    }

    const installed = isStandaloneMode || isIOSStandalone || isInstalledViaAPI;
    const standalone = isStandaloneMode || isIOSStandalone;

    setIsInstalled(installed);
    setIsStandalone(standalone);
    
    return installed;
  }, []);

  // Detect iOS
  const detectIOS = useCallback(() => {
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
    return isIOSDevice;
  }, []);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (eventListenersAdded.current) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // App is now in standalone mode
        setIsStandalone(true);
        setIsInstalled(true);
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    
    const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");
    standaloneMediaQuery.addEventListener("change", handleDisplayModeChange);

    eventListenersAdded.current = true;

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      standaloneMediaQuery.removeEventListener("change", handleDisplayModeChange);
      eventListenersAdded.current = false;
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Skip if running on server
    if (typeof window === "undefined") return;

    const initialize = async () => {
      // Check if already installed
      const installed = await checkIfInstalled();
      
      // If already installed or standalone, don't set up listeners
      if (installed) {
        return;
      }

      // Detect iOS
      detectIOS();

      // Setup event listeners only if not already installed
      const cleanup = setupEventListeners();

      return cleanup;
    };

    const cleanupPromise = initialize();

    return () => {
      cleanupPromise.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, [checkIfInstalled, detectIOS, setupEventListeners]);

  // Handle install
  const handleInstall = useCallback(async () => {
    if (isInstalled || isStandalone) {
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === "accepted") {
          setIsInstalled(true);
          setCanInstall(false);
        }
      } catch (error) {
        console.error("Error during install prompt:", error);
      } finally {
        setDeferredPrompt(null);
      }
    }
  }, [deferredPrompt, isInstalled, isStandalone]);

  return {
    deferredPrompt,
    isInstalled,
    isStandalone,
    isIOS,
    canInstall,
    handleInstall,
  };
}
