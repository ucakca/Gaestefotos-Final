'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Clock, Star, MapPin, Users, Camera, Plus, Edit, Trash2, Eye, Sparkles } from 'lucide-react'

export default function TimelinePage() {
  const [selectedMoment, setSelectedMoment] = useState<number | null>(null)

  const timelineMoments = [
    { id: 1, time: '14:00', title: 'Ceremony Begins', location: 'Garden Chapel', photos: 45, highlighted: true, icon: Star },
    { id: 2, time: '15:30', title: 'First Dance', location: 'Reception Hall', photos: 67, highlighted: true, icon: Star },
    { id: 3, time: '16:00', title: 'Group Photos', location: 'Garden', photos: 89, highlighted: false, icon: Camera },
    { id: 4, time: '17:30', title: 'Dinner Service', location: 'Reception Hall', photos: 34, highlighted: false, icon: Users },
    { id: 5, time: '19:00', title: 'Cake Cutting', location: 'Reception Hall', photos: 56, highlighted: true, icon: Star },
    { id: 6, time: '20:00', title: 'Party & Dancing', location: 'Dance Floor', photos: 123, highlighted: false, icon: Users },
    { id: 7, time: '21:30', title: 'Sparkler Exit', location: 'Main Entrance', photos: 78, highlighted: true, icon: Sparkles },
  ]

  const highlights = [
    { id: 1, title: 'The Ceremony', time: '14:00 - 15:00', photos: 45, coverUrl: '/placeholder.jpg' },
    { id: 2, title: 'First Dance', time: '15:30 - 15:45', photos: 67, coverUrl: '/placeholder.jpg' },
    { id: 3, title: 'Cake Cutting', time: '19:00 - 19:15', photos: 56, coverUrl: '/placeholder.jpg' },
    { id: 4, title: 'Grand Exit', time: '21:30 - 22:00', photos: 78, coverUrl: '/placeholder.jpg' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Timeline</h1>
          <p className="text-muted-foreground mt-2">
            Chronological view and curated highlights of your event
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Moment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Timeline Moment</DialogTitle>
              <DialogDescription>Create a new moment in your event timeline</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" placeholder="14:00" />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Ceremony Begins" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Garden Chapel" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Create Moment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>Chronological moments from your event</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-8">
                  {timelineMoments.map((moment, index) => (
                    <div key={moment.id} className="relative flex gap-6">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-background ${moment.highlighted ? 'bg-primary' : 'bg-muted'}`}>
                          <moment.icon className={`h-6 w-6 ${moment.highlighted ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                      
                      <Card className="flex-1 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedMoment(moment.id)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {moment.time}
                                </Badge>
                                {moment.highlighted && (
                                  <Badge className="bg-amber-500">
                                    <Star className="mr-1 h-3 w-3" />
                                    Highlight
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-xl">{moment.title}</CardTitle>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{moment.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Camera className="h-4 w-4" />
                            <span>{moment.photos} photos</span>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3">
                            <Eye className="mr-2 h-4 w-4" />
                            View Photos
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {highlights.map((highlight) => (
              <Card key={highlight.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-video relative bg-muted">
                  <img
                    src={highlight.coverUrl}
                    alt={highlight.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-amber-500">
                      <Star className="mr-1 h-3 w-3" />
                      Highlight
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{highlight.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {highlight.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Camera className="h-4 w-4" />
                      {highlight.photos} photos
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      View Album
                    </Button>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Highlight Reel</CardTitle>
              <CardDescription>Automatically generate a highlight video from key moments</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Highlight Reel
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
