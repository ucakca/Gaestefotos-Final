'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Facebook, Instagram, Twitter, Youtube, Cloud, Dropbox as DropboxIcon, Mail, Zap } from 'lucide-react'

export default function IntegrationsPage() {
  const socialIntegrations = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      description: 'Auto-post photos to Instagram Stories',
      connected: true,
      color: 'text-pink-600',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      description: 'Share event album on Facebook',
      connected: false,
      color: 'text-blue-600',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      description: 'Tweet photo highlights',
      connected: false,
      color: 'text-sky-500',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      description: 'Upload video compilation',
      connected: false,
      color: 'text-red-600',
    },
  ]

  const storageIntegrations = [
    {
      id: 'gdrive',
      name: 'Google Drive',
      icon: Cloud,
      description: 'Sync all photos to Google Drive',
      connected: true,
      storage: '2.4 GB / 15 GB',
      color: 'text-blue-600',
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: DropboxIcon,
      description: 'Backup to Dropbox automatically',
      connected: false,
      color: 'text-blue-500',
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: Cloud,
      description: 'Microsoft OneDrive integration',
      connected: false,
      color: 'text-blue-700',
    },
  ]

  const automationIntegrations = [
    {
      id: 'zapier',
      name: 'Zapier',
      icon: Zap,
      description: 'Connect to 5000+ apps',
      connected: false,
      color: 'text-orange-600',
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      icon: Mail,
      description: 'Send photo updates via email',
      connected: false,
      color: 'text-yellow-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect with social media and cloud storage platforms</p>
      </div>

      <Tabs defaultValue="social" className="space-y-4">
        <TabsList>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="storage">Cloud Storage</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {socialIntegrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-accent ${integration.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      {integration.connected && <Badge>Connected</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {integration.connected ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-post enabled</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            Configure
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full">Connect {integration.name}</Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {storageIntegrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-accent ${integration.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      {integration.connected && <Badge>Connected</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {integration.connected ? (
                      <div className="space-y-3">
                        {integration.storage && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">Storage used</p>
                            <p className="font-medium">{integration.storage}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-sync enabled</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            Manage
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full">Connect {integration.name}</Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {automationIntegrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-accent ${integration.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      {integration.connected && <Badge>Connected</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {integration.connected ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            Manage Workflows
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full">Connect {integration.name}</Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
