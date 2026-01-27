'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Share2, Cloud, Video, Image, FileText, Package, Link as LinkIcon, Mail, Copy, Check } from 'lucide-react'

export default function ExportPage() {
  const [exportFormat, setExportFormat] = useState('zip')
  const [copied, setCopied] = useState(false)

  const exportHistory = [
    { id: 1, name: 'Wedding Photos - Full Export', type: 'ZIP', size: '2.4 GB', date: '2024-01-20', status: 'completed' },
    { id: 2, name: 'Best Of Album', type: 'PDF', size: '156 MB', date: '2024-01-19', status: 'completed' },
    { id: 3, name: 'Video Compilation', type: 'MP4', size: '890 MB', date: '2024-01-18', status: 'processing' },
  ]

  const shareLinks = [
    { id: 1, name: 'Guest View Link', url: 'https://gallery.app/e/abc123', views: 245, expires: 'Never' },
    { id: 2, name: 'Download Link (24h)', url: 'https://gallery.app/dl/xyz789', views: 12, expires: 'In 18 hours' },
  ]

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export & Sharing</h1>
        <p className="text-muted-foreground">Download, share, and backup your event content</p>
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="share">Share Links</TabsTrigger>
          <TabsTrigger value="cloud">Cloud Backup</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Export</CardTitle>
              <CardDescription>Download photos, videos, and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Content to Export</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="photos" defaultChecked />
                      <Label htmlFor="photos" className="cursor-pointer">Photos (1,234 items, ~2.1 GB)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="videos" defaultChecked />
                      <Label htmlFor="videos" className="cursor-pointer">Videos (45 items, ~890 MB)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="comments" />
                      <Label htmlFor="comments" className="cursor-pointer">Comments & Reactions</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="metadata" />
                      <Label htmlFor="metadata" className="cursor-pointer">Metadata (timestamps, uploader, location)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="guestbook" />
                      <Label htmlFor="guestbook" className="cursor-pointer">Guestbook Messages</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="zip" id="zip" />
                      <Label htmlFor="zip" className="cursor-pointer">ZIP Archive (Original Quality)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="cursor-pointer">PDF Photo Book</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="video" id="video" />
                      <Label htmlFor="video" className="cursor-pointer">Video Slideshow (MP4)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Image Quality</Label>
                  <Select defaultValue="original">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original (Full Resolution)</SelectItem>
                      <SelectItem value="high">High (2K, 80% smaller)</SelectItem>
                      <SelectItem value="medium">Medium (1080p, 90% smaller)</SelectItem>
                      <SelectItem value="low">Low (720p, 95% smaller)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select defaultValue="date">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">By Upload Date</SelectItem>
                      <SelectItem value="uploader">By Uploader</SelectItem>
                      <SelectItem value="album">By Album/Category</SelectItem>
                      <SelectItem value="flat">All in One Folder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold">Estimated Size: 2.8 GB</p>
                    <p className="text-sm text-muted-foreground">Processing time: ~5 minutes</p>
                  </div>
                </div>
                <Button className="w-full" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  Start Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Share Link</CardTitle>
              <CardDescription>Create shareable links with custom permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Link Type</Label>
                <Select defaultValue="view">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">View & Download</SelectItem>
                    <SelectItem value="upload">View & Upload</SelectItem>
                    <SelectItem value="full">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select defaultValue="never">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1hour">1 Hour</SelectItem>
                    <SelectItem value="24hours">24 Hours</SelectItem>
                    <SelectItem value="7days">7 Days</SelectItem>
                    <SelectItem value="30days">30 Days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="password" />
                <Label htmlFor="password" className="cursor-pointer">Require Password</Label>
              </div>

              <Button className="w-full">
                <LinkIcon className="h-4 w-4 mr-2" />
                Generate Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Share Links</CardTitle>
              <CardDescription>Manage existing share links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div key={link.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{link.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{link.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(link.url)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{link.views} views</span>
                      <span>•</span>
                      <span>Expires: {link.expires}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cloud Backup</CardTitle>
              <CardDescription>Automatically backup to cloud storage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Google Drive</p>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Dropbox</p>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5" />
                    <div>
                      <p className="font-medium">OneDrive</p>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="auto-backup" />
                  <Label htmlFor="auto-backup">Enable automatic backup</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="backup-originals" defaultChecked />
                  <Label htmlFor="backup-originals">Backup original quality</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>Previous exports and downloads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exportHistory.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.type} • {item.size} • {item.date}
                        </p>
                      </div>
                      <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                    {item.status === 'processing' ? (
                      <Progress value={65} className="mt-2" />
                    ) : (
                      <Button variant="outline" size="sm" className="mt-2">
                        <Download className="h-3 w-3 mr-1" />
                        Download Again
                      </Button>
                    )}
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
