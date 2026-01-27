'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Calendar, Image, Settings, Users, MessageSquare, Palette } from 'lucide-react'

export default function ClonePage() {
  const [eventName, setEventName] = useState('Wedding Gallery - Copy')

  const cloneOptions = [
    { id: 'design', label: 'Design & Branding', icon: Palette, description: 'Colors, fonts, logo, QR code styles' },
    { id: 'settings', label: 'Settings & Permissions', icon: Settings, description: 'Privacy, upload rules, moderation' },
    { id: 'categories', label: 'Albums & Categories', icon: Image, description: 'Photo albums and organization' },
    { id: 'challenges', label: 'Challenges', icon: Users, description: 'Photo challenges and prompts' },
    { id: 'templates', label: 'Message Templates', icon: MessageSquare, description: 'Email and notification templates' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clone Event</h1>
        <p className="text-muted-foreground">Create a new event based on this one</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name your new event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Event Name</Label>
            <Input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name"
            />
          </div>

          <div className="space-y-2">
            <Label>Event Date</Label>
            <Input type="date" />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Describe your event..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to Clone</CardTitle>
          <CardDescription>Select which elements to copy to the new event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cloneOptions.map((option) => {
              const Icon = option.icon
              return (
                <div key={option.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox id={option.id} defaultChecked />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={option.id} className="cursor-pointer font-medium">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="text-yellow-900">Note</CardTitle>
          <CardDescription className="text-yellow-700">
            Photos, videos, and guest data will NOT be copied to the new event. Only settings and configuration will be cloned.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-3">
        <Button size="lg" className="flex-1">
          <Copy className="h-4 w-4 mr-2" />
          Create Clone
        </Button>
        <Button variant="outline" size="lg">
          Cancel
        </Button>
      </div>
    </div>
  )
}
