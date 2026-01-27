"use client";

import React from "react"

import { useEffect, useState } from "react";
import { Download, X, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    // Register service worker - only in production
    // Service workers don't work in v0 preview environment
    const isProduction = typeof window !== "undefined" && 
      !window.location.hostname.includes("vusercontent.net") &&
      !window.location.hostname.includes("localhost");
    
    if (isProduction && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);
        })
        .catch(() => {
          // Silently fail - SW not critical for app functionality
        });
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 30 seconds
      setTimeout(() => setShowInstallBanner(true), 30000);
    };

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {children}

      {/* Install Banner */}
      {showInstallBanner && installPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in-0">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">App installieren</p>
              <p className="text-sm text-muted-foreground">
                Fuer schnelleren Zugriff und Offline-Nutzung
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInstallBanner(false)}
                className="h-8 w-8 bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleInstall}>
                Installieren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Toast */}
      {showOfflineToast && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in-0">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 shadow-lg",
              isOnline ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
            )}
          >
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-yellow-600" />
            )}
            <p className={cn("flex-1 text-sm font-medium", isOnline ? "text-green-800" : "text-yellow-800")}>
              {isOnline ? "Wieder online" : "Du bist offline"}
            </p>
            <button
              onClick={() => setShowOfflineToast(false)}
              className={cn("p-1 rounded-full", isOnline ? "hover:bg-green-100" : "hover:bg-yellow-100")}
            >
              <X className={cn("h-4 w-4", isOnline ? "text-green-600" : "text-yellow-600")} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Hook to check if app is installed
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsPWA(isStandalone || isIOSStandalone);
  }, []);

  return isPWA;
}

// Hook for online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
