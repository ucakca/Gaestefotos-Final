'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Search, Tag, Users, MapPin, Clock, Camera, Zap, Settings2, ChevronRight } from 'lucide-react'

export default function AITaggingPage() {
  const [autoTagEnabled, setAutoTagEnabled] = useState(true)
  const [confidence, setConfidence] = useState([75])
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const tagCategories = [
    { name: 'People', count: 234, icon: Users, color: 'bg-blue-500' },
    { name: 'Locations', count: 18, icon: MapPin, color: 'bg-green-500' },
    { name: 'Activities', count: 45, icon: Zap, color: 'bg-purple-500' },
    { name: 'Objects', count: 156, icon: Camera, color: 'bg-orange-500' },
    { name: 'Time', count: 12, icon: Clock, color: 'bg-pink-500' },
  ]

  const detectedTags = [
    { tag: 'Bride & Groom', category: 'People', count: 142, confidence: 98 },
    { tag: 'Dancing', category: 'Activities', count: 89, confidence: 95 },
    { tag: 'Ceremony', category: 'Activities', count: 67, confidence: 92 },
    { tag: 'Garden', category: 'Locations', count: 54, confidence: 88 },
    { tag: 'Group Photo', category: 'People', count: 48, confidence: 96 },
    { tag: 'Dinner Table', category: 'Locations', count: 43, confidence: 91 },
    { tag: 'Sunset', category: 'Time', count: 38, confidence: 89 },
    { tag: 'Bouquet', category: 'Objects', count: 35, confidence: 94 },
  ]

  const recentlyTagged = [
    { id: 1, url: '/placeholder.jpg', tags: ['Bride & Groom', 'Ceremony', 'Garden'], time: '2 min ago' },
    { id: 2, url: '/placeholder.jpg', tags: ['Dancing', 'Reception'], time: '5 min ago' },
    { id: 3, url: '/placeholder.jpg', tags: ['Group Photo', 'Family'], time: '8 min ago' },
    { id: 4, url: '/placeholder.jpg', tags: ['Bouquet', 'Flowers'], time: '12 min ago' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Auto-Tagging</h1>
        <p className="text-muted-foreground mt-2">
          Intelligent photo tagging and smart search powered by AI
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">465</div>
            <p className="text-xs text-muted-foreground">Across 5 categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Tagged</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <p className="text-xs text-muted-foreground">Photos processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">High accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Low confidence tags</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search">Smart Search</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tag Categories</CardTitle>
                <CardDescription>Distribution of AI-detected tags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tagCategories.map((category) => (
                  <div key={category.name} className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      <category.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.count} tags</p>
                      </div>
                      <Progress value={(category.count / 465) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Tags</CardTitle>
                <CardDescription>Most detected tags in your photos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detectedTags.slice(0, 8).map((item) => (
                  <div key={item.tag} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{item.category}</Badge>
                      <span className="text-sm font-medium">{item.tag}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{item.count} photos</span>
                      <Badge variant="secondary">{item.confidence}%</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recently Tagged Photos</CardTitle>
              <CardDescription>Latest AI-tagged uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {recentlyTagged.map((photo) => (
                  <div key={photo.id} className="space-y-3 group">
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo.url}
                        alt="Tagged photo"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {photo.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{photo.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Search</CardTitle>
              <CardDescription>Search photos using natural language or tags</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for 'bride dancing at sunset' or 'group photos'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Popular Searches</Label>
                <div className="flex flex-wrap gap-2">
                  {['Bride & Groom', 'Dancing', 'Ceremony', 'Sunset', 'Group Photos', 'Reception', 'Bouquet'].map((tag) => (
                    <Button key={tag} variant="outline" size="sm" onClick={() => setSearchQuery(tag)}>
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Suggested Queries</Label>
                <div className="space-y-2">
                  {[
                    'Photos with the bride and groom together',
                    'Dancing at the reception',
                    'Ceremony moments in the garden',
                    'Sunset photos',
                  ].map((query) => (
                    <Button
                      key={query}
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => setSearchQuery(query)}
                    >
                      <span className="text-sm">{query}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Tagging Settings</CardTitle>
              <CardDescription>Configure automatic tagging preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto-Tagging</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically tag new uploads with AI
                  </p>
                </div>
                <Switch checked={autoTagEnabled} onCheckedChange={setAutoTagEnabled} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <Badge variant="secondary">{confidence[0]}%</Badge>
                </div>
                <Slider
                  value={confidence}
                  onValueChange={setConfidence}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-sm text-muted-foreground">
                  Only apply tags with confidence above this threshold
                </p>
              </div>

              <div className="space-y-3">
                <Label>Processing Options</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setProcessing(true)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Process All Untagged Photos
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Tag className="mr-2 h-4 w-4" />
                    Review Low Confidence Tags
                  </Button>
                </div>
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing photos...</span>
                    <span className="text-muted-foreground">234 / 892</span>
                  </div>
                  <Progress value={26} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
