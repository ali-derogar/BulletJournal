"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("Service Worker not supported");
      return;
    }

    const registerServiceWorker = async () => {
      try {
        // Unregister existing workers first to ensure clean state
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Optional: Only unregister if you suspect they are broken, 
          // generally we want to update, not unregister. 
          // But for debugging "blocked" connections, a fresh start helps.
          // await registration.unregister(); 
          registration.update(); // Try updating first
        }

        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: '/',
        });

        console.log("✅ Service Worker registered with scope:", registration.scope);

        // Check for updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
              }
            };
          }
        };

      } catch (error) {
        console.error("❌ Service Worker registration failed:", error);
      }
    };

    // Delay registration slightly to not block initial page load
    const timer = setTimeout(() => {
      registerServiceWorker();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
