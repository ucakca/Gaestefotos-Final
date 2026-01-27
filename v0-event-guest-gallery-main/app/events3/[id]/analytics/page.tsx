'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Users, Image, Heart, MessageCircle, Download, Clock, Calendar, MapPin, Camera } from 'lucide-react'
import { useState } from 'react'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d')

  // Mock data
  const insights = {
    peakHours: [
      { hour: '14:00-15:00', uploads: 45, engagement: 89 },
      { hour: '19:00-20:00', uploads: 67, engagement: 134 },
      { hour: '21:00-22:00', uploads: 52, engagement: 98 },
    ],
    topLocations: [
      { name: 'Tanzflache', photos: 234, engagement: 567 },
      { name: 'Garten', photos: 156, engagement: 432 },
      { name: 'Bar', photos: 89, engagement: 234 },
    ],
    deviceStats: [
      { device: 'iPhone', count: 345, percentage: 45 },
      { device: 'Android', count: 289, percentage: 38 },
      { device: 'Desktop', count: 130, percentage: 17 },
    ],
    contentTypes: [
      { type: 'Selfies', count: 234, trend: 12 },
      { type: 'Group Photos', count: 456, trend: -5 },
      { type: 'Landscape', count: 123, trend: 8 },
      { type: 'Food & Drinks', count: 89, trend: 15 },
    ],
    viralContent: [
      {
        id: 1,
        url: '/placeholder.jpg',
        likes: 234,
        comments: 45,
        shares: 67,
        virality: 89,
      },
      {
        id: 2,
        url: '/placeholder.jpg',
        likes: 198,
        comments: 38,
        shares: 52,
        virality: 76,
      },
    ],
    engagementMetrics: {
      avgLikesPerPhoto: 12.4,
      avgCommentsPerPhoto: 3.2,
      avgTimeToFirstLike: '2m 34s',
      photoRetention: 94.5,
    },
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-1">
            Detaillierte Analyse und Engagement-Metriken
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Letzte 24h</SelectItem>
            <SelectItem value="7d">Letzte 7 Tage</SelectItem>
            <SelectItem value="30d">Letzte 30 Tage</SelectItem>
            <SelectItem value="all">Gesamt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Ubersicht</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content-Analyse</TabsTrigger>
          <TabsTrigger value="users">User-Verhalten</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Spitzenzeiten
              </CardTitle>
              <CardDescription>
                Zeiten mit der hochsten Aktivitat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.peakHours.map((peak, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 font-medium">{peak.hour}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Uploads</span>
                            <span className="text-sm font-medium">{peak.uploads}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(peak.uploads / 70) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Engagement</span>
                            <span className="text-sm font-medium">{peak.engagement}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${(peak.engagement / 140) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Locations
              </CardTitle>
              <CardDescription>Orte mit den meisten Fotos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.topLocations.map((location, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.photos} Fotos · {location.engagement} Interactions
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{location.engagement} Likes</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Gerate-Statistiken
              </CardTitle>
              <CardDescription>Uploads nach Gerat</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.deviceStats.map((device, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{device.device}</span>
                      <span className="text-sm text-muted-foreground">
                        {device.count} ({device.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${device.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg. Likes/Foto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{insights.engagementMetrics.avgLikesPerPhoto}</div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    12%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg. Kommentare/Foto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{insights.engagementMetrics.avgCommentsPerPhoto}</div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    8%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Zeit bis 1. Like</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{insights.engagementMetrics.avgTimeToFirstLike}</div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingDown className="h-3 w-3" />
                    15%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{insights.engagementMetrics.photoRetention}%</div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    3%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Viral Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Viraler Content
              </CardTitle>
              <CardDescription>Fotos mit dem hochsten Engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {insights.viralContent.map((content) => (
                  <div key={content.id} className="relative group rounded-lg overflow-hidden border">
                    <img
                      src={content.url}
                      alt="Viral content"
                      className="aspect-video object-cover w-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {content.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {content.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          {content.shares}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary">Virality Score: {content.virality}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Analysis Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Content-Kategorien
              </CardTitle>
              <CardDescription>Foto-Typen und Trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.contentTypes.map((type, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{type.type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{type.count} Fotos</span>
                          <Badge
                            variant={type.trend > 0 ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {type.trend > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(type.trend)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(type.count / 500) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Behavior Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User-Verhalten
              </CardTitle>
              <CardDescription>Aktivitatsmuster und Engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Aktivitats-Segmente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Super Active (10+ Uploads)</span>
                      <Badge>23 Gaste</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active (5-10 Uploads)</span>
                      <Badge>45 Gaste</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Casual (1-4 Uploads)</span>
                      <Badge>89 Gaste</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lurkers (0 Uploads)</span>
                      <Badge variant="secondary">12 Gaste</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
