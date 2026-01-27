'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Search, Filter, X, Calendar, User, Tag, MapPin, Image as ImageIcon } from 'lucide-react'

export default function SearchPage() {
  const [showFilters, setShowFilters] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const activeFilters = [
    { id: 1, label: 'Date: Jan 15-20', type: 'date' },
    { id: 2, label: 'Uploader: Sarah M.', type: 'user' },
    { id: 3, label: 'Tag: Ceremony', type: 'tag' },
  ]

  const savedSearches = [
    { id: 1, name: 'Ceremony Photos', query: 'tag:ceremony date:2024-01-15', count: 234 },
    { id: 2, name: 'Sarah\'s Uploads', query: 'uploader:sarah', count: 156 },
    { id: 3, name: 'Outdoor Photos', query: 'location:outdoor', count: 89 },
  ]

  const searchResults = [
    {
      id: 1,
      url: '/placeholder.jpg',
      uploader: 'Sarah Miller',
      date: '2024-01-15',
      tags: ['ceremony', 'bride'],
      likes: 45,
    },
    {
      id: 2,
      url: '/placeholder.jpg',
      uploader: 'Mike Johnson',
      date: '2024-01-15',
      tags: ['ceremony', 'guests'],
      likes: 32,
    },
    {
      id: 3,
      url: '/placeholder.jpg',
      uploader: 'Emma Davis',
      date: '2024-01-15',
      tags: ['ceremony', 'decoration'],
      likes: 28,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Advanced Search</h1>
        <p className="text-muted-foreground">Find photos and videos with powerful filters</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by keyword, uploader, tag, location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
      </Card>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge key={filter.id} variant="secondary" className="gap-1">
              {filter.label}
              <X className="h-3 w-3 cursor-pointer" />
            </Badge>
          ))}
          <Button variant="ghost" size="sm">Clear all</Button>
        </div>
      )}

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>Refine your search with advanced filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" placeholder="From" />
                  <Input type="date" placeholder="To" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Uploader
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select uploader" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Uploaders</SelectItem>
                    <SelectItem value="sarah">Sarah Miller</SelectItem>
                    <SelectItem value="mike">Mike Johnson</SelectItem>
                    <SelectItem value="emma">Emma Davis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceremony">Ceremony</SelectItem>
                    <SelectItem value="reception">Reception</SelectItem>
                    <SelectItem value="bride">Bride</SelectItem>
                    <SelectItem value="groom">Groom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input placeholder="Enter location" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Content Type</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="photos" defaultChecked />
                  <Label htmlFor="photos" className="cursor-pointer">Photos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="videos" defaultChecked />
                  <Label htmlFor="videos" className="cursor-pointer">Videos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="portraits" />
                  <Label htmlFor="portraits" className="cursor-pointer">Portraits Only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="landscape" />
                  <Label htmlFor="landscape" className="cursor-pointer">Landscape Only</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Minimum Likes</Label>
              <Slider defaultValue={[0]} min={0} max={100} step={5} />
              <p className="text-sm text-muted-foreground">Show photos with at least 0 likes</p>
            </div>

            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select defaultValue="recent">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="comments">Most Commented</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1">Apply Filters</Button>
              <Button variant="outline">Reset</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Saved Searches</CardTitle>
            <CardDescription>Quick access to frequent searches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{search.name}</p>
                    <p className="text-sm text-muted-foreground">{search.query}</p>
                  </div>
                  <Badge variant="secondary">{search.count}</Badge>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                Save Current Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>{searchResults.length} photos found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {searchResults.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg border overflow-hidden">
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
