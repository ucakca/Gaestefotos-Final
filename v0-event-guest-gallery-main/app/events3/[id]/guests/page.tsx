'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  UserPlus, 
  Search,
  Image,
  Video,
  Heart,
  MessageSquare,
  MoreVertical,
  Mail,
  Trash2,
  Eye,
  Ban,
  Crown,
  CheckCircle2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Guest = {
  id: string
  name: string
  email: string
  avatar: string
  role: 'host' | 'guest'
  status: 'active' | 'blocked'
  joinedAt: string
  stats: {
    photos: number
    videos: number
    reactions: number
    comments: number
  }
}

export default function GuestsPage({ params }: { params: { id: string } }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestEmail, setNewGuestEmail] = useState('')

  // Mock guests data
  const [guests, setGuests] = useState<Guest[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      avatar: 'SJ',
      role: 'host',
      status: 'active',
      joinedAt: '2 days ago',
      stats: { photos: 42, videos: 3, reactions: 156, comments: 23 }
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      avatar: 'MC',
      role: 'guest',
      status: 'active',
      joinedAt: '2 days ago',
      stats: { photos: 38, videos: 2, reactions: 142, comments: 18 }
    },
    {
      id: '3',
      name: 'Emma Davis',
      email: 'emma@example.com',
      avatar: 'ED',
      role: 'guest',
      status: 'active',
      joinedAt: '1 day ago',
      stats: { photos: 31, videos: 1, reactions: 98, comments: 12 }
    },
    {
      id: '4',
      name: 'Tom Wilson',
      email: 'tom@example.com',
      avatar: 'TW',
      role: 'guest',
      status: 'active',
      joinedAt: '1 day ago',
      stats: { photos: 27, videos: 0, reactions: 76, comments: 8 }
    },
    {
      id: '5',
      name: 'Lisa Brown',
      email: 'lisa@example.com',
      avatar: 'LB',
      role: 'guest',
      status: 'blocked',
      joinedAt: '3 days ago',
      stats: { photos: 5, videos: 0, reactions: 12, comments: 2 }
    },
  ])

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalGuests = guests.length
  const activeGuests = guests.filter(g => g.status === 'active').length
  const totalPhotos = guests.reduce((acc, g) => acc + g.stats.photos, 0)
  const totalVideos = guests.reduce((acc, g) => acc + g.stats.videos, 0)

  const handleAddGuest = () => {
    const newGuest: Guest = {
      id: Date.now().toString(),
      name: newGuestName,
      email: newGuestEmail,
      avatar: newGuestName.split(' ').map(n => n[0]).join(''),
      role: 'guest',
      status: 'active',
      joinedAt: 'Just now',
      stats: { photos: 0, videos: 0, reactions: 0, comments: 0 }
    }
    setGuests([...guests, newGuest])
    setNewGuestName('')
    setNewGuestEmail('')
    setIsAddDialogOpen(false)
  }

  const handleBlockGuest = (guestId: string) => {
    setGuests(guests.map(g => 
      g.id === guestId ? { ...g, status: g.status === 'blocked' ? 'active' : 'blocked' } : g
    ))
  }

  const handleDeleteGuest = (guestId: string) => {
    setGuests(guests.filter(g => g.id !== guestId))
  }

  const handleMakeHost = (guestId: string) => {
    setGuests(guests.map(g => 
      g.id === guestId ? { ...g, role: g.role === 'host' ? 'guest' : 'host' } : g
    ))
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Guest Management</h1>
            <p className="mt-2 text-muted-foreground">
              Manage guests and their permissions
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Guest</DialogTitle>
                <DialogDescription>
                  Invite a new guest to the event
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Enter guest name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newGuestEmail}
                    onChange={(e) => setNewGuestEmail(e.target.value)}
                    placeholder="Enter guest email"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddGuest}
                  disabled={!newGuestName || !newGuestEmail}
                >
                  Add Guest
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGuests}</div>
              <p className="text-xs text-muted-foreground">
                {activeGuests} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPhotos}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(totalPhotos / totalGuests)} per guest
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVideos}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((totalVideos / totalPhotos) * 100)}% of uploads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Contribution</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((totalPhotos + totalVideos) / totalGuests)}
              </div>
              <p className="text-xs text-muted-foreground">
                uploads per guest
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search guests by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Guest List */}
        <Card>
          <CardHeader>
            <CardTitle>Guest List</CardTitle>
            <CardDescription>
              {filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {guest.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{guest.name}</p>
                      {guest.role === 'host' && (
                        <Badge variant="default" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Host
                        </Badge>
                      )}
                      {guest.status === 'blocked' && (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{guest.email}</p>
                    <p className="text-xs text-muted-foreground">Joined {guest.joinedAt}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{guest.stats.photos}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{guest.stats.videos}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{guest.stats.reactions}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{guest.stats.comments}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMakeHost(guest.id)}>
                        <Crown className="mr-2 h-4 w-4" />
                        {guest.role === 'host' ? 'Remove Host' : 'Make Host'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBlockGuest(guest.id)}>
                        <Ban className="mr-2 h-4 w-4" />
                        {guest.status === 'blocked' ? 'Unblock' : 'Block'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteGuest(guest.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {filteredGuests.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No guests found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
