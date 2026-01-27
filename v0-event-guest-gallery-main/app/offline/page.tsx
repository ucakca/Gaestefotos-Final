"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Keine Internetverbindung</h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        Du bist offline. Einige Funktionen sind moeglicherweise nicht verfuegbar.
        Bereits geladene Fotos kannst du weiterhin ansehen.
      </p>
      <Button onClick={handleRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Erneut versuchen
      </Button>
    </div>
  );
}
