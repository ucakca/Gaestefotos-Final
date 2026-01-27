'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle, XCircle, Flag, Shield, Eye, EyeOff, Trash2, MessageSquare, Search } from 'lucide-react'
import { useState } from 'react'

export default function ModerationPage() {
  const [autoModeration, setAutoModeration] = useState(true)
  const [filterMode, setFilterMode] = useState('moderate')

  // Mock flagged content
  const flaggedContent = [
    {
      id: 1,
      type: 'photo',
      url: '/placeholder.jpg',
      reason: 'Inappropriate content',
      reporter: 'Max M.',
      timestamp: '2024-01-15 14:23',
      status: 'pending',
      aiScore: 85,
    },
    {
      id: 2,
      type: 'comment',
      content: 'This is a test flagged comment with inappropriate language...',
      reason: 'Offensive language',
      reporter: 'Auto-Moderation',
      timestamp: '2024-01-15 12:10',
      status: 'pending',
      aiScore: 92,
    },
  ]

  const moderationRules = [
    { id: 1, rule: 'Explizite Inhalte blockieren', enabled: true, severity: 'high' },
    { id: 2, rule: 'Hassrede erkennen', enabled: true, severity: 'high' },
    { id: 3, rule: 'Spam verhindern', enabled: true, severity: 'medium' },
    { id: 4, rule: 'Duplikate markieren', enabled: false, severity: 'low' },
  ]

  const moderationLog = [
    {
      id: 1,
      action: 'Photo approved',
      moderator: 'Admin',
      timestamp: '2024-01-15 15:30',
      details: 'Photo #234 approved after manual review',
    },
    {
      id: 2,
      action: 'Comment removed',
      moderator: 'Auto-Moderation',
      timestamp: '2024-01-15 14:45',
      details: 'Inappropriate language detected',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Moderation</h1>
          <p className="text-muted-foreground mt-1">
            Content-Moderation und Sicherheitseinstellungen
          </p>
        </div>
        <Badge variant={autoModeration ? 'default' : 'secondary'} className="gap-2">
          <Shield className="h-3 w-3" />
          Auto-Moderation {autoModeration ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Tabs defaultValue="flagged" className="space-y-6">
        <TabsList>
          <TabsTrigger value="flagged">Gemeldete Inhalte</TabsTrigger>
          <TabsTrigger value="rules">Moderations-Regeln</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          <TabsTrigger value="log">Protokoll</TabsTrigger>
        </TabsList>

        {/* Flagged Content Tab */}
        <TabsContent value="flagged" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Wartend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Benotigen Review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Heute bearbeitet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <p className="text-xs text-muted-foreground">Approved/Rejected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">False Positives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Diese Woche</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gemeldete Inhalte</CardTitle>
                  <CardDescription>Review und Moderation ausstehender Inhalte</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="photos">Nur Fotos</SelectItem>
                      <SelectItem value="comments">Nur Kommentare</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Suchen..." className="pl-9" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flaggedContent.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex gap-4">
                      {item.type === 'photo' ? (
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">{item.reason}</Badge>
                              <Badge variant="outline">AI Score: {item.aiScore}%</Badge>
                            </div>
                            {item.type === 'comment' && (
                              <p className="text-sm mt-2 text-muted-foreground">{item.content}</p>
                            )}
                          </div>
                          <Badge variant="secondary">{item.status}</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Gemeldet von {item.reporter} · {item.timestamp}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Genehmigen
                            </Button>
                            <Button size="sm" variant="destructive">
                              <XCircle className="h-4 w-4 mr-2" />
                              Ablehnen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderations-Regeln</CardTitle>
              <CardDescription>
                Konfigurieren Sie automatische Moderations-Regeln
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {moderationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Switch checked={rule.enabled} />
                      <div>
                        <div className="font-medium">{rule.rule}</div>
                        <div className="text-sm text-muted-foreground">
                          Severity: {rule.severity}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        rule.severity === 'high'
                          ? 'destructive'
                          : rule.severity === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {rule.severity}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-3">Neue Regel hinzufugen</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="rule-name">Regel-Name</Label>
                    <Input id="rule-name" placeholder="z.B. Gewaltdarstellungen blockieren" />
                  </div>
                  <div>
                    <Label htmlFor="rule-desc">Beschreibung</Label>
                    <Textarea id="rule-desc" placeholder="Details zur Regel..." />
                  </div>
                  <div className="flex gap-2">
                    <Select defaultValue="medium">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>Regel hinzufugen</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Moderation Einstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie die automatische Content-Moderation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Moderation aktivieren</Label>
                  <p className="text-sm text-muted-foreground">
                    KI-basierte automatische Content-Prufung
                  </p>
                </div>
                <Switch checked={autoModeration} onCheckedChange={setAutoModeration} />
              </div>

              <div className="space-y-3">
                <Label>Filter-Intensitat</Label>
                <Select value={filterMode} onValueChange={setFilterMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Streng - Maximaler Schutz</SelectItem>
                    <SelectItem value="moderate">Moderat - Ausgewogen</SelectItem>
                    <SelectItem value="lenient">Nachsichtig - Minimal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Bestimmt wie aggressiv unangemessene Inhalte gefiltert werden
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Fotos vor Upload prufen</Label>
                  <p className="text-sm text-muted-foreground">
                    Inhalte werden vor Veroffentlichung gepruft
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    Bei gemeldeten Inhalten benachrichtigen
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="pt-4 border-t">
                <Button>Einstellungen speichern</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Log Tab */}
        <TabsContent value="log" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderations-Protokoll</CardTitle>
              <CardDescription>
                Verlauf aller Moderations-Aktionen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {moderationLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 border rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                      <p className="text-sm text-muted-foreground">Von: {log.moderator}</p>
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
