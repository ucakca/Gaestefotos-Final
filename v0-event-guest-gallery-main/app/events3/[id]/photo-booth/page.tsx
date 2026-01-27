'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Camera, Smile, Wand2, Sparkles, Download, Share2, Layout, Settings, Play, Pause } from 'lucide-react'

export default function PhotoBoothPage() {
  const [isActive, setIsActive] = useState(false)
  const [countdown, setCountdown] = useState([3])
  const [gridSize, setGridSize] = useState('2x2')

  const templates = [
    { id: 1, name: 'Classic Strip', layout: '2x2', preview: '/placeholder.jpg' },
    { id: 2, name: 'Single Frame', layout: '1x1', preview: '/placeholder.jpg' },
    { id: 3, name: 'Four Grid', layout: '2x2', preview: '/placeholder.jpg' },
    { id: 4, name: 'Collage', layout: '3x3', preview: '/placeholder.jpg' },
  ]

  const filters = [
    { id: 'none', name: 'No Filter', preview: '/placeholder.jpg' },
    { id: 'bw', name: 'Black & White', preview: '/placeholder.jpg' },
    { id: 'sepia', name: 'Sepia', preview: '/placeholder.jpg' },
    { id: 'vintage', name: 'Vintage', preview: '/placeholder.jpg' },
  ]

  const recentPhotos = [
    { id: 1, url: '/placeholder.jpg', timestamp: '2 min ago', layout: '2x2' },
    { id: 2, url: '/placeholder.jpg', timestamp: '5 min ago', layout: '1x1' },
    { id: 3, url: '/placeholder.jpg', timestamp: '8 min ago', layout: '2x2' },
    { id: 4, url: '/placeholder.jpg', timestamp: '12 min ago', layout: '2x2' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photo Booth Mode</h1>
          <p className="text-muted-foreground mt-2">
            Interactive photo booth with filters and templates
          </p>
        </div>
        <Button
          size="lg"
          variant={isActive ? 'destructive' : 'default'}
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? (
            <>
              <Pause className="mr-2 h-5 w-5" />
              Stop Booth
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start Booth
            </>
          )}
        </Button>
      </div>

      {isActive && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-primary">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </div>
              <span className="font-medium">Photo Booth is Active</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Camera Settings</CardTitle>
                <CardDescription>Configure photo booth capture settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Countdown Timer</Label>
                    <Badge variant="secondary">{countdown[0]}s</Badge>
                  </div>
                  <Slider
                    value={countdown}
                    onValueChange={setCountdown}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Save to Gallery</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically add photos to event gallery
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mirror Camera</Label>
                    <p className="text-sm text-muted-foreground">
                      Flip camera view horizontally
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Play Shutter Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Audio feedback when taking photo
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Add your event branding to photos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Event Logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Overlay logo on photos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Add Event Name</Label>
                    <p className="text-sm text-muted-foreground">
                      Show event name on photos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Date/Time</Label>
                    <p className="text-sm text-muted-foreground">
                      Timestamp each photo
                    </p>
                  </div>
                  <Switch />
                </div>

                <Button variant="outline" className="w-full">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Customize Overlay
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Photo Templates</CardTitle>
              <CardDescription>Choose layout for photo booth captures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer hover:border-primary transition-colors ${
                      gridSize === template.layout ? 'border-primary' : ''
                    }`}
                    onClick={() => setGridSize(template.layout)}
                  >
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={template.preview}
                        alt={template.name}
                        className="object-cover w-full h-full"
                      />
                      {gridSize === template.layout && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <Badge className="bg-primary">Selected</Badge>
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <CardDescription className="text-xs">
                        <Layout className="inline h-3 w-3 mr-1" />
                        {template.layout}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Photo Filters</CardTitle>
              <CardDescription>Apply filters to photo booth captures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filters.map((filter) => (
                  <Card key={filter.id} className="cursor-pointer hover:border-primary transition-colors">
                    <div className="aspect-square relative bg-muted">
                      <img
                        src={filter.preview}
                        alt={filter.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{filter.name}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fun Effects</CardTitle>
              <CardDescription>Add playful effects to photos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Face Filters</Label>
                    <p className="text-sm text-muted-foreground">Hats, glasses, accessories</p>
                  </div>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Background Effects</Label>
                    <p className="text-sm text-muted-foreground">Confetti, sparkles, patterns</p>
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Captures</CardTitle>
                  <CardDescription>Photos taken in photo booth mode</CardDescription>
                </div>
                <Badge variant="secondary">
                  <Camera className="mr-1 h-3 w-3" />
                  {recentPhotos.length} photos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {recentPhotos.map((photo) => (
                  <div key={photo.id} className="space-y-3 group">
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo.url}
                        alt="Photo booth capture"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{photo.layout}</Badge>
                        <span className="text-muted-foreground text-xs">{photo.timestamp}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Share2 className="mr-1 h-3 w-3" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
