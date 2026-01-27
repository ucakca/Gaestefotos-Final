'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Image, 
  Video, 
  Heart, 
  MessageSquare, 
  Users, 
  Eye,
  TrendingUp,
  Clock,
  Calendar,
  Award
} from 'lucide-react'

export default function StatisticsPage({ params }: { params: { id: string } }) {
  // Mock data
  const stats = {
    totalPhotos: 342,
    totalVideos: 28,
    totalReactions: 1247,
    totalComments: 189,
    totalGuests: 45,
    totalViews: 3421,
    photosToday: 23,
    avgPhotosPerGuest: 7.6,
    topContributor: 'Sarah Johnson',
    topContributorCount: 42,
    peakUploadHour: '20:00 - 21:00',
    peakUploadCount: 67
  }

  const uploadTimeline = [
    { time: '14:00', count: 12 },
    { time: '15:00', count: 34 },
    { time: '16:00', count: 45 },
    { time: '17:00', count: 23 },
    { time: '18:00', count: 56 },
    { time: '19:00', count: 89 },
    { time: '20:00', count: 67 },
    { time: '21:00', count: 43 },
    { time: '22:00', count: 28 },
  ]

  const maxCount = Math.max(...uploadTimeline.map(d => d.count))

  const topContributors = [
    { name: 'Sarah Johnson', count: 42, avatar: 'SJ' },
    { name: 'Mike Chen', count: 38, avatar: 'MC' },
    { name: 'Emma Davis', count: 31, avatar: 'ED' },
    { name: 'Tom Wilson', count: 27, avatar: 'TW' },
    { name: 'Lisa Brown', count: 24, avatar: 'LB' },
  ]

  const engagementStats = [
    { label: 'Most Liked Photo', value: '127 reactions', icon: Heart },
    { label: 'Most Commented', value: '34 comments', icon: MessageSquare },
    { label: 'Most Viewed', value: '456 views', icon: Eye },
    { label: 'Avg. Reactions/Photo', value: '3.6', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="mt-2 text-muted-foreground">
            Insights and analytics for your event
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPhotos}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.photosToday} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.totalVideos / stats.totalPhotos) * 100)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reactions</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReactions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalComments} comments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGuests}</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgPhotosPerGuest.toFixed(1)} photos/guest
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Contributor */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Contributor</CardTitle>
                  <CardDescription>Guest who shared the most</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                      {stats.topContributor.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stats.topContributor}</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.topContributorCount} photos uploaded
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Peak Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Peak Upload Time</CardTitle>
                  <CardDescription>Most active hour</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-xl font-bold">{stats.peakUploadHour}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.peakUploadCount} photos uploaded
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>Guests who shared the most photos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topContributors.map((contributor, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {i + 1}
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {contributor.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{contributor.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{contributor.count}</p>
                        <p className="text-xs text-muted-foreground">photos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {engagementStats.map((stat, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Breakdown</CardTitle>
                <CardDescription>How guests interact with content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Reactions
                      </span>
                      <span className="font-bold">{stats.totalReactions}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[85%] rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comments
                      </span>
                      <span className="font-bold">{stats.totalComments}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[45%] rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Views
                      </span>
                      <span className="font-bold">{stats.totalViews}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-full rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Timeline</CardTitle>
                <CardDescription>Photos uploaded per hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadTimeline.map((slot, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium">{slot.time}</div>
                      <div className="flex-1">
                        <div className="h-8 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(slot.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-bold">{slot.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
