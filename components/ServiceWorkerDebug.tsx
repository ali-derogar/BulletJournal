"use client";

import { useEffect, useState } from "react";

interface DebugInfo {
    hasServiceWorker: boolean;
    hasNotification: boolean;
    swRegistered: boolean;
    swError: string;
    permission: string;
    isSecure: boolean;
    protocol: string;
    swScope?: string;
    swActive?: boolean;
}

export default function ServiceWorkerDebug() {
    const [debug, setDebug] = useState<DebugInfo>({
        hasServiceWorker: false,
        hasNotification: false,
        swRegistered: false,
        swError: "",
        permission: "unknown",
        isSecure: false,
        protocol: "",
    });

    useEffect(() => {
        const checkAPIs = async () => {
            const info: DebugInfo = {
                hasServiceWorker: "serviceWorker" in navigator,
                hasNotification: "Notification" in window,
                isSecure: window.isSecureContext,
                protocol: window.location.protocol,
                permission: "Notification" in window ? Notification.permission : "not-supported",
                swRegistered: false,
                swError: "",
            };

            if ("serviceWorker" in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register("/sw.js");
                    info.swRegistered = true;
                    info.swScope = registration.scope;
                    info.swActive = !!registration.active;
                    console.log("✅ Service Worker registered:", registration);
                } catch (error) {
                    info.swRegistered = false;
                    info.swError = error instanceof Error ? error.message : String(error);
                    console.error("❌ Service Worker registration failed:", error);
                }
            }

            setDebug(info);
        };

        checkAPIs();
    }, []);

    return (
        <div style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.9)",
            color: "white",
            padding: "15px",
            borderRadius: "10px",
            fontSize: "12px",
            zIndex: 9999,
            maxWidth: "300px",
            fontFamily: "monospace"
        }}>
            <div style={{ fontWeight: "bold", marginBottom: "10px" }}>🔧 SW Debug</div>
            <div>Protocol: {debug.protocol}</div>
            <div>Secure Context: {debug.isSecure ? "✅" : "❌"}</div>
            <div>Has SW API: {debug.hasServiceWorker ? "✅" : "❌"}</div>
            <div>Has Notification API: {debug.hasNotification ? "✅" : "❌"}</div>
            <div>SW Registered: {debug.swRegistered ? "✅" : "❌"}</div>
            {debug.swError && <div style={{ color: "red" }}>Error: {debug.swError}</div>}
            <div>Permission: {debug.permission}</div>
        </div>
    );
}
