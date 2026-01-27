"use client";

import React from "react"

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Camera,
  Video,
  Users,
  Trophy,
  TrendingUp,
  Upload,
  Mail,
  Share2,
  QrCode,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  HardDrive,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Demo data
const stats = {
  photos: { total: 156, pending: 8, today: 12 },
  videos: { total: 24, pending: 2, today: 3 },
  guests: { total: 45, pending: 3, today: 2 },
  challenges: { total: 8, active: 2, completed: 6 },
};

const eventStatus = {
  status: "live",
  visibility: "public",
  storageUsed: 4.1,
  storageTotal: 5,
  uploadsActive: true,
  autoApprove: false,
};

const recentActivity = [
  { id: 1, type: "photo", user: "Anna Müller", action: "hat 3 Fotos hochgeladen", time: "vor 2 Min.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80" },
  { id: 2, type: "user", user: "Max Schmidt", action: "hat sich angemeldet", time: "vor 15 Min.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&q=80" },
  { id: 3, type: "challenge", user: "Challenge", action: '"Gruppenfoto" wurde abgeschlossen', time: "vor 1 Std.", avatar: null },
  { id: 4, type: "guestbook", user: "Lisa Weber", action: "Neue Gästebuch-Nachricht", time: "vor 2 Std.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80" },
  { id: 5, type: "approved", user: "System", action: "12 Fotos wurden genehmigt", time: "vor 3 Std.", avatar: null },
];

export default function DashboardPage() {
  const params = useParams();
  const eventId = params.id as string;
  const storagePercent = (eventStatus.storageUsed / eventStatus.storageTotal) * 100;

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full max-w-full overflow-hidden box-border">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Übersicht deines Events
          </p>
        </div>
        <Button asChild>
          <Link href={`/e3/${eventId}`} target="_blank">
            <Eye className="mr-2 h-4 w-4" />
            Event ansehen
          </Link>
        </Button>
      </div>

      {/* Event Status Card */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-3 w-3 rounded-full",
                eventStatus.status === "live" ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              )} />
              <div>
                <p className="font-semibold">
                  {eventStatus.status === "live" ? "Live & Öffentlich" : "Entwurf"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Hochzeit Max & Anna - 15.02.2026
                </p>
              </div>
            </div>

            {/* Storage */}
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" />
                  Speicher
                </span>
                <span className="font-medium">{eventStatus.storageUsed} GB / {eventStatus.storageTotal} GB</span>
              </div>
              <Progress value={storagePercent} className="h-2" />
            </div>

            {/* Upload Status */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  eventStatus.uploadsActive ? "bg-green-500" : "bg-gray-400"
                )} />
                <span>Uploads {eventStatus.uploadsActive ? "aktiv" : "deaktiviert"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  eventStatus.autoApprove ? "bg-green-500" : "bg-yellow-500"
                )} />
                <span>Auto-Approve {eventStatus.autoApprove ? "an" : "aus"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Fotos"
          value={stats.photos.total}
          icon={Camera}
          trend={`+${stats.photos.today} heute`}
          pending={stats.photos.pending}
          href={`/events3/${eventId}/photos`}
        />
        <StatCard
          title="Videos"
          value={stats.videos.total}
          icon={Video}
          trend={`+${stats.videos.today} heute`}
          pending={stats.videos.pending}
          href={`/events3/${eventId}/videos`}
        />
        <StatCard
          title="Gäste"
          value={stats.guests.total}
          icon={Users}
          trend={`+${stats.guests.today} heute`}
          pending={stats.guests.pending}
          href={`/events3/${eventId}/guests`}
        />
        <StatCard
          title="Challenges"
          value={stats.challenges.total}
          icon={Trophy}
          trend={`${stats.challenges.active} aktiv`}
          completed={stats.challenges.completed}
          href={`/events3/${eventId}/challenges`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 min-w-0">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 overflow-hidden min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 lg:px-6">
            <CardTitle className="text-base font-semibold">Letzte Aktivitäten</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs bg-transparent flex-shrink-0">
              Alle
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 px-4 lg:px-6 py-3">
                  {activity.avatar ? (
                    <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={activity.avatar || "/placeholder.svg"}
                        alt={activity.user}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {activity.type === "challenge" && <Trophy className="h-4 w-4 text-yellow-500" />}
                      {activity.type === "approved" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">{activity.action}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & QR Code */}
        <div className="space-y-4 lg:space-y-6 min-w-0">
          {/* Quick Actions */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 overflow-hidden">
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 bg-transparent">
                <Upload className="h-4 w-4" />
                <span className="text-xs">Upload</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 bg-transparent">
                <Mail className="h-4 w-4" />
                <span className="text-xs">Einladen</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 bg-transparent">
                <Share2 className="h-4 w-4" />
                <span className="text-xs">Teilen</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 bg-transparent" asChild>
                <Link href={`/events3/${eventId}/qr-styler`}>
                  <QrCode className="h-4 w-4" />
                  <span className="text-xs">QR-Code</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Preview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">QR-Code</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28 bg-white rounded-lg p-2 border flex-shrink-0">
                  {/* Placeholder QR Code */}
                  <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMSAyMSI+PHBhdGggZD0iTTEgMWg3djdIMVYxem0yIDJoM3YzSDNWM3ptOC0yaDd2N2gtN1Yxem0yIDJoM3YzaC0zVjN6TTEgMTNoN3Y3SDFWMTN6bTIgMmgzdjNoLTNWMTV6IiBmaWxsPSIjMDAwIi8+PC9zdmc+')] bg-contain" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  /e3/{eventId}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/events3/${eventId}/qr-styler`}>
                      Anpassen
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  pending,
  completed,
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: string;
  pending?: number;
  completed?: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Icon className="h-5 w-5 text-primary" />
            {pending !== undefined && pending > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                <Clock className="h-3 w-3" />
                {pending}
              </span>
            )}
            {completed !== undefined && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="h-3 w-3" />
                {completed}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
          <span className="flex items-center gap-0.5 text-xs text-green-600 mt-0.5">
            <TrendingUp className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{trend}</span>
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
