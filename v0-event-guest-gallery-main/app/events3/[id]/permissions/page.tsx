'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Users, UserCog, Lock, Eye, Upload, Download, MessageSquare, Settings, Crown, Star } from 'lucide-react'

export default function PermissionsPage() {
  const [defaultRole, setDefaultRole] = useState('guest')

  const roles = [
    { 
      id: 'host', 
      name: 'Host', 
      icon: Crown, 
      color: 'bg-amber-500',
      count: 2,
      permissions: ['Full access', 'Manage event', 'Moderate content', 'Manage users']
    },
    { 
      id: 'photographer', 
      name: 'Photographer', 
      icon: Star, 
      color: 'bg-purple-500',
      count: 3,
      permissions: ['Upload photos', 'View all', 'Download all', 'Edit own']
    },
    { 
      id: 'guest', 
      name: 'Guest', 
      icon: Users, 
      color: 'bg-blue-500',
      count: 156,
      permissions: ['Upload photos', 'View all', 'Comment', 'React']
    },
    { 
      id: 'viewer', 
      name: 'Viewer', 
      icon: Eye, 
      color: 'bg-green-500',
      count: 23,
      permissions: ['View only', 'React']
    },
  ]

  const permissions = [
    { id: 'upload', label: 'Upload Photos/Videos', icon: Upload, host: true, photographer: true, guest: true, viewer: false },
    { id: 'view', label: 'View Content', icon: Eye, host: true, photographer: true, guest: true, viewer: true },
    { id: 'download', label: 'Download Photos', icon: Download, host: true, photographer: true, guest: false, viewer: false },
    { id: 'comment', label: 'Add Comments', icon: MessageSquare, host: true, photographer: true, guest: true, viewer: false },
    { id: 'moderate', label: 'Moderate Content', icon: Shield, host: true, photographer: false, guest: false, viewer: false },
    { id: 'manage', label: 'Manage Settings', icon: Settings, host: true, photographer: false, guest: false, viewer: false },
  ]

  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'host', uploads: 45, avatar: '/placeholder-user.jpg' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'photographer', uploads: 234, avatar: '/placeholder-user.jpg' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'photographer', uploads: 189, avatar: '/placeholder-user.jpg' },
    { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'guest', uploads: 23, avatar: '/placeholder-user.jpg' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permissions & Roles</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles and access control for your event
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{role.name}</CardTitle>
              <div className={`p-2 rounded-lg ${role.color}`}>
                <role.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{role.count}</div>
              <p className="text-xs text-muted-foreground">
                {role.count === 1 ? 'user' : 'users'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${role.color}`}>
                      <role.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>{role.name}</CardTitle>
                      <CardDescription>{role.count} users</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Permissions</Label>
                    <div className="mt-2 space-y-1">
                      {role.permissions.map((permission) => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <UserCog className="mr-2 h-4 w-4" />
                    Edit Role
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>Define what each role can do</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Permission</th>
                      {roles.map((role) => (
                        <th key={role.id} className="text-center py-3 px-4">
                          <Badge variant="outline">{role.name}</Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.id} className="border-b">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <permission.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{permission.label}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Switch checked={permission.host} />
                        </td>
                        <td className="text-center py-3 px-4">
                          <Switch checked={permission.photographer} />
                        </td>
                        <td className="text-center py-3 px-4">
                          <Switch checked={permission.guest} />
                        </td>
                        <td className="text-center py-3 px-4">
                          <Switch checked={permission.viewer} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Assign roles to specific users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-4">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{user.uploads} uploads</Badge>
                      <Select defaultValue={user.role}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="photographer">Photographer</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Settings</CardTitle>
              <CardDescription>Configure default permissions and access rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Default Role for New Users</Label>
                <Select value={defaultRole} onValueChange={setDefaultRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval for Uploads</Label>
                  <p className="text-sm text-muted-foreground">
                    Host must approve photos before they appear
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Guest Downloads</Label>
                  <p className="text-sm text-muted-foreground">
                    Guests can download photos from the gallery
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Password Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Require password to access the event
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
