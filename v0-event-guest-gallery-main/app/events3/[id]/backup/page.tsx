'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database, Download, Upload, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default function BackupPage() {
  const backups = [
    { id: 1, name: 'Full Backup - Jan 20', size: '2.8 GB', date: '2024-01-20 14:30', type: 'full', status: 'completed' },
    { id: 2, name: 'Incremental - Jan 19', size: '340 MB', date: '2024-01-19 14:30', type: 'incremental', status: 'completed' },
    { id: 3, name: 'Full Backup - Jan 13', size: '2.4 GB', date: '2024-01-13 14:30', type: 'full', status: 'completed' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup & Recovery</h1>
        <p className="text-muted-foreground">Protect your event data with automatic backups</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">2 hours ago</p>
                <p className="text-sm text-muted-foreground">Automatic backup</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Backups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">8.6 GB total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">22 hours</p>
                <p className="text-sm text-muted-foreground">Scheduled daily</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup Settings</CardTitle>
          <CardDescription>Configure automatic backup preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-backup" className="text-base">Automatic Backup</Label>
              <p className="text-sm text-muted-foreground">Enable scheduled backups</p>
            </div>
            <Switch id="auto-backup" defaultChecked />
          </div>

          <div className="space-y-2">
            <Label>Backup Frequency</Label>
            <Select defaultValue="daily">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="6hours">Every 6 Hours</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Retention Policy</Label>
            <Select defaultValue="30days">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Keep for 7 days</SelectItem>
                <SelectItem value="30days">Keep for 30 days</SelectItem>
                <SelectItem value="90days">Keep for 90 days</SelectItem>
                <SelectItem value="forever">Keep forever</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="incremental" defaultChecked />
            <Label htmlFor="incremental">Use incremental backups (saves space)</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="compress" defaultChecked />
            <Label htmlFor="compress">Compress backups</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manual Backup</CardTitle>
              <CardDescription>Create a backup on demand</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button className="flex-1">
              <Database className="h-4 w-4 mr-2" />
              Create Full Backup
            </Button>
            <Button variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Incremental Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>View and restore from previous backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{backup.name}</p>
                      <Badge variant={backup.type === 'full' ? 'default' : 'secondary'}>
                        {backup.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {backup.size} • {backup.date}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm">
                    <Upload className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <CardTitle className="text-orange-900">Backup Safety Tips</CardTitle>
              <CardDescription className="text-orange-700">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Keep at least 3 backups at different time points</li>
                  <li>Store backups in multiple locations (local + cloud)</li>
                  <li>Test restore functionality regularly</li>
                  <li>Never delete the last backup before creating a new one</li>
                </ul>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
