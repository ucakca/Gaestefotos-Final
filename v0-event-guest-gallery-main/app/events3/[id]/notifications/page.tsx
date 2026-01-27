'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Mail, MessageSquare, Users, AlertCircle, CheckCircle, XCircle, Clock, Send, Settings } from 'lucide-react'

export default function NotificationsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)

  const notifications = [
    { id: 1, type: 'upload', user: 'Sarah Miller', message: 'uploaded 12 new photos', time: '2 min ago', read: false },
    { id: 2, type: 'comment', user: 'Mike Johnson', message: 'commented on your photo', time: '15 min ago', read: false },
    { id: 3, type: 'like', user: 'Emma Davis', message: 'liked 5 of your photos', time: '1 hour ago', read: true },
    { id: 4, type: 'mention', user: 'John Smith', message: 'mentioned you in a comment', time: '2 hours ago', read: true },
    { id: 5, type: 'milestone', user: 'System', message: 'Event reached 500 photos!', time: '3 hours ago', read: true },
  ]

  const triggers = [
    { id: 'new-upload', label: 'New Photo/Video Upload', enabled: true },
    { id: 'new-comment', label: 'New Comment', enabled: true },
    { id: 'new-reaction', label: 'New Reaction/Like', enabled: false },
    { id: 'mention', label: 'Mentioned in Comment', enabled: true },
    { id: 'milestone', label: 'Milestone Reached', enabled: true },
    { id: 'moderation', label: 'Content Flagged', enabled: true },
    { id: 'guest-join', label: 'New Guest Joined', enabled: false },
    { id: 'daily-summary', label: 'Daily Summary', enabled: true },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case 'upload': return <Users className="h-4 w-4" />
      case 'comment': return <MessageSquare className="h-4 w-4" />
      case 'like': return <CheckCircle className="h-4 w-4" />
      case 'mention': return <AlertCircle className="h-4 w-4" />
      case 'milestone': return <Bell className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications & Alerts</h1>
        <p className="text-muted-foreground">Manage how and when you receive notifications</p>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="send">Send Alert</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notification Inbox</CardTitle>
                  <CardDescription>Recent activity and alerts</CardDescription>
                </div>
                <Button variant="outline" size="sm">Mark all as read</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      !notif.read ? 'bg-accent/50' : ''
                    }`}
                  >
                    <div className="mt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{notif.user}</span>{' '}
                        <span className="text-muted-foreground">{notif.message}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                    </div>
                    {!notif.read && (
                      <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={emailNotifs}
                  onCheckedChange={setEmailNotifs}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="push">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                </div>
                <Switch
                  id="push"
                  checked={pushNotifs}
                  onCheckedChange={setPushNotifs}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="sms">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Text message alerts</p>
                  </div>
                </div>
                <Switch
                  id="sms"
                  checked={smsNotifs}
                  onCheckedChange={setSmsNotifs}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>Set times when you don't want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" defaultValue="22:00" />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="quiet-enabled" defaultChecked />
                <Label htmlFor="quiet-enabled">Enable quiet hours</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Triggers</CardTitle>
              <CardDescription>Control which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor={trigger.id} className="cursor-pointer">
                      {trigger.label}
                    </Label>
                    <Switch
                      id={trigger.id}
                      defaultChecked={trigger.enabled}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequency Settings</CardTitle>
              <CardDescription>Control how often you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Batch Notifications</Label>
                <Select defaultValue="instant">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant (as they happen)</SelectItem>
                    <SelectItem value="15min">Every 15 minutes</SelectItem>
                    <SelectItem value="1hour">Every hour</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Maximum per Day</Label>
                <Input type="number" defaultValue="50" min="1" max="999" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Custom Alert</CardTitle>
              <CardDescription>Send a notification to all guests or specific groups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="active">Active Contributors</SelectItem>
                    <SelectItem value="moderators">Moderators Only</SelectItem>
                    <SelectItem value="custom">Custom Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="Enter notification subject" />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your message here..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
