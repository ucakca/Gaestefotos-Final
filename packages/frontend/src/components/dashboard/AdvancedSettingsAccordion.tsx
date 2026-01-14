'use client';

import { useState } from 'react';
import { Event as EventType } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Database,
  Settings,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Copy,
  CreditCard,
} from 'lucide-react';

interface AdvancedSettingsAccordionProps {
  event: EventType;
  eventId: string;
  usage: any;
  usageLoading: boolean;
  onLoadUsage: () => void;
  onUpgrade: (sku: string, productId: string) => Promise<{ url?: string; error?: string }>;
}

function formatBytes(input: string | number | null | undefined): string {
  const n = typeof input === 'string' ? Number(input) : typeof input === 'number' ? input : 0;
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function AdvancedSettingsAccordion({
  event,
  eventId,
  usage,
  usageLoading,
  onLoadUsage,
  onUpgrade,
}: AdvancedSettingsAccordionProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [upgradeSku, setUpgradeSku] = useState('');
  const [upgradeProductId, setUpgradeProductId] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const limitBytes = usage?.entitlement?.storageLimitBytes ?? null;
  const usedBytes = usage?.usage?.totalBytes ?? null;
  const usedNum = typeof usedBytes === 'string' ? Number(usedBytes) : 0;
  const limitNum = typeof limitBytes === 'string' ? Number(limitBytes) : 0;
  const hasLimit = Number.isFinite(limitNum) && limitNum > 0;
  const percent = hasLimit && Number.isFinite(usedNum) 
    ? Math.min(100, Math.max(0, (usedNum / limitNum) * 100)) 
    : 0;

  const handleUpgrade = async () => {
    setUpgradeError(null);
    setUpgradeUrl(null);
    const sku = upgradeSku.trim();
    const productId = upgradeProductId.trim();
    if (!sku && !productId) {
      setUpgradeError('Bitte SKU oder ProductId angeben');
      return;
    }
    setUpgradeLoading(true);
    const result = await onUpgrade(sku, productId);
    setUpgradeLoading(false);
    if (result.url) {
      setUpgradeUrl(result.url);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } else if (result.error) {
      setUpgradeError(result.error);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <Accordion type="single" collapsible className="rounded-xl border border-border bg-card">
      {/* Storage */}
      <AccordionItem value="storage">
        <AccordionTrigger className="px-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-muted-foreground" />
            <span>Speicher</span>
            {usage && (
              <span className="text-sm text-muted-foreground">
                ({formatBytes(usedBytes)}{hasLimit ? ` / ${formatBytes(limitBytes)}` : ''})
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadUsage}
              disabled={usageLoading}
            >
              {usageLoading ? 'Lade...' : 'Aktualisieren'}
            </Button>

            {usage && (
              <div className="space-y-3">
                {/* Progress Bar */}
                {hasLimit && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{formatBytes(usedBytes)} verwendet</span>
                      <span>{percent.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percent > 90 ? 'bg-destructive' : percent > 70 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>Fotos: {formatBytes(usage?.usage?.photosBytes)}</div>
                  <div>Videos: {formatBytes(usage?.usage?.videosBytes)}</div>
                  <div>Gästebuch: {formatBytes(usage?.usage?.guestbookBytes)}</div>
                  <div>Design: {formatBytes(usage?.usage?.designBytes)}</div>
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Event URL & Password */}
      <AccordionItem value="url-password">
        <AccordionTrigger className="px-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <span>Event-URL & Passwort</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Event-URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono truncate">
                  /e2/{event.slug}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/e2/${event.slug}`;
                    copyToClipboard(url);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automatisch generiert, nicht bearbeitbar
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Event-Passwort
              </label>
              <div className="flex items-center gap-2">
                {(event as any).password ? (
                  <>
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                      {showPassword ? (event as any).password : '••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard((event as any).password)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-muted-foreground italic">Kein Passwort gesetzt</span>
                )}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Upgrade */}
      <AccordionItem value="upgrade">
        <AccordionTrigger className="px-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <span>Upgrade</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground mb-3">
            Optional – nur nötig, wenn du einen spezifischen Checkout-Link erzeugen willst.
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">SKU</label>
              <Input
                value={upgradeSku}
                onChange={(e) => setUpgradeSku(e.target.value)}
                placeholder="z.B. premium_1000"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Product ID</label>
              <Input
                value={upgradeProductId}
                onChange={(e) => setUpgradeProductId(e.target.value)}
                placeholder="z.B. prod_..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? 'Erzeuge...' : 'Upgrade öffnen'}
            </Button>
            {upgradeUrl && (
              <Button variant="secondary" onClick={() => copyToClipboard(upgradeUrl)}>
                Link kopieren
              </Button>
            )}
          </div>

          {upgradeError && (
            <p className="text-sm text-destructive mt-2">{upgradeError}</p>
          )}
          {upgradeUrl && (
            <p className="text-xs text-muted-foreground mt-2 break-all">{upgradeUrl}</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default AdvancedSettingsAccordion;
