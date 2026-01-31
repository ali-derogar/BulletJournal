"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getNotificationConfig, requestPushPermission, subscribeToPush } from "@/services/notifications";
import { useUser } from "@/app/context/UserContext";

export default function NotificationPermissionPrompt() {
    const { currentUser } = useUser();
    const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
    const [configMessage, setConfigMessage] = useState("");
    const [showPrompt, setShowPrompt] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        // Check if browser supports notifications
        if (!("Notification" in window)) {
            setPermission("unsupported");
            return;
        }

        // Update permission state
        const updatePermission = () => {
            const currentPermission = Notification.permission;
            setPermission(currentPermission);

            // Hide prompt if permission is granted
            if (currentPermission === "granted") {
                setShowPrompt(false);
            }
        };

        updatePermission();

        // Only show if not granted and not dismissed in this session
        if (Notification.permission !== "granted" && !isDismissed) {
            const loadConfig = async () => {
                try {
                    const config = await getNotificationConfig();
                    setConfigMessage(config.value);
                    setShowPrompt(true);
                } catch (error) {
                    console.error("Failed to load notification config:", error);
                }
            };
            loadConfig();
        }

        // Poll for permission changes (some browsers don't support permission change events)
        const permissionCheckInterval = setInterval(updatePermission, 1000);

        return () => {
            clearInterval(permissionCheckInterval);
        };
    }, [currentUser, isDismissed]);

    const handleRequestPermission = async () => {
        const result = await requestPushPermission();
        setPermission(result);

        if (result === "granted") {
            await subscribeToPush();
            setShowPrompt(false);
            setIsDismissed(true); // Prevent showing again in this session
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        setShowPrompt(false);
    };

    if (!currentUser || !showPrompt || isDismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
            >
                <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 shadow-2xl backdrop-blur-lg">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary text-2xl">
                            🔔
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-card-foreground mb-1">
                                Stay Updated
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                {configMessage || "To receive AI-generated messages and important updates, please allow notification access."}
                            </p>

                            {permission === "denied" ? (
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                                    ⚠️ Notifications are blocked by your browser. Please enable them in your browser settings to receive updates.
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleRequestPermission}
                                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
                                    >
                                        Allow
                                    </button>
                                    <button
                                        onClick={handleDismiss}
                                        className="px-4 py-2 bg-muted text-muted-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors"
                                    >
                                        Later
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
