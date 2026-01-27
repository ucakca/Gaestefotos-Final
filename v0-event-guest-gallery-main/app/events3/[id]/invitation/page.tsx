'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  MessageSquare, 
  Copy, 
  Download, 
  QrCode,
  Share2,
  Send,
  Eye,
  Globe,
  Lock,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react'

export default function InvitationPage({ params }: { params: { id: string } }) {
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms' | 'link'>('link')
  const [recipients, setRecipients] = useState('')
  const [message, setMessage] = useState('You are invited to share your photos from our special day!')
  const [includeQR, setIncludeQR] = useState(true)
  const [autoReminders, setAutoReminders] = useState(false)
  const [copied, setCopied] = useState(false)

  const eventLink = `https://eventgallery.app/e3/${params.id}`

  const handleCopy = () => {
    navigator.clipboard.writeText(eventLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = () => {
    // Mock send functionality
    console.log('[v0] Sending invitations:', { method: inviteMethod, recipients, message })
  }

  // Mock invitation stats
  const stats = {
    sent: 45,
    opened: 32,
    clicked: 28,
    registered: 24
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
          <p className="mt-2 text-muted-foreground">
            Invite guests to share their photos and videos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">Total invitations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opened</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.opened}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.opened / stats.sent) * 100)}% open rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clicked</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clicked}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.clicked / stats.sent) * 100)}% click rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.registered}</div>
              <p className="text-xs text-muted-foreground">Joined the event</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="space-y-4">
          <TabsList>
            <TabsTrigger value="send">Send Invitations</TabsTrigger>
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Invitations</CardTitle>
                <CardDescription>
                  Invite guests via email or SMS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Method Selection */}
                <div className="space-y-2">
                  <Label>Invitation Method</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={inviteMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setInviteMethod('email')}
                      className="flex-1"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      variant={inviteMethod === 'sms' ? 'default' : 'outline'}
                      onClick={() => setInviteMethod('sms')}
                      className="flex-1"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      SMS
                    </Button>
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-2">
                  <Label htmlFor="recipients">
                    {inviteMethod === 'email' ? 'Email Addresses' : 'Phone Numbers'}
                  </Label>
                  <Textarea
                    id="recipients"
                    placeholder={
                      inviteMethod === 'email'
                        ? 'Enter email addresses (one per line or comma-separated)'
                        : 'Enter phone numbers (one per line or comma-separated)'
                    }
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    You can also upload a CSV file
                  </p>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Custom Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Options */}
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include QR Code</Label>
                      <p className="text-sm text-muted-foreground">
                        Attach QR code for easy access
                      </p>
                    </div>
                    <Switch checked={includeQR} onCheckedChange={setIncludeQR} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send reminders to unopened invites
                      </p>
                    </div>
                    <Switch checked={autoReminders} onCheckedChange={setAutoReminders} />
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleSend}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Share Event Link</CardTitle>
                <CardDescription>
                  Share this link with your guests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Link */}
                <div className="space-y-2">
                  <Label>Event Link</Label>
                  <div className="flex gap-2">
                    <Input value={eventLink} readOnly className="font-mono text-sm" />
                    <Button onClick={handleCopy} variant="outline" className="shrink-0">
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-2">
                  <Label>QR Code</Label>
                  <div className="flex flex-col items-center gap-4 rounded-lg border p-6">
                    <div className="h-48 w-48 rounded bg-muted flex items-center justify-center">
                      <QrCode className="h-32 w-32 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download PNG
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download SVG
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Social Share */}
                <div className="space-y-2">
                  <Label>Share on Social Media</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Facebook
                    </Button>
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Twitter
                    </Button>
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Instagram
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invitation History</CardTitle>
                <CardDescription>
                  Track who received and opened invitations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Johnson', email: 'sarah@example.com', status: 'registered', time: '2 hours ago' },
                    { name: 'Mike Chen', email: 'mike@example.com', status: 'clicked', time: '5 hours ago' },
                    { name: 'Emma Davis', email: 'emma@example.com', status: 'opened', time: '1 day ago' },
                    { name: 'Tom Wilson', email: 'tom@example.com', status: 'sent', time: '2 days ago' },
                    { name: 'Lisa Brown', email: 'lisa@example.com', status: 'bounced', time: '2 days ago' },
                  ].map((guest, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-sm text-muted-foreground">{guest.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            guest.status === 'registered'
                              ? 'default'
                              : guest.status === 'bounced'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {guest.status === 'registered' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {guest.status === 'clicked' && <Eye className="mr-1 h-3 w-3" />}
                          {guest.status === 'opened' && <Mail className="mr-1 h-3 w-3" />}
                          {guest.status === 'sent' && <Clock className="mr-1 h-3 w-3" />}
                          {guest.status === 'bounced' && <XCircle className="mr-1 h-3 w-3" />}
                          {guest.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{guest.time}</span>
                      </div>
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
