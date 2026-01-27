'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { 
  Trash2, 
  Copy, 
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import Image from 'next/image'

type DuplicateGroup = {
  id: string
  photos: {
    id: string
    url: string
    uploadedBy: string
    uploadedAt: string
    size: number
    selected: boolean
  }[]
  similarity: number
}

export default function DuplicatesPage({ params }: { params: { id: string } }) {
  const [threshold, setThreshold] = useState([85])
  const [selectedCount, setSelectedCount] = useState(0)
  
  // Mock duplicate groups
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([
    {
      id: '1',
      similarity: 98,
      photos: [
        { id: '1a', url: '/placeholder.jpg', uploadedBy: 'Sarah', uploadedAt: '2h ago', size: 2.4, selected: false },
        { id: '1b', url: '/placeholder.jpg', uploadedBy: 'Mike', uploadedAt: '2h ago', size: 2.3, selected: false },
        { id: '1c', url: '/placeholder.jpg', uploadedBy: 'Emma', uploadedAt: '3h ago', size: 2.4, selected: false },
      ]
    },
    {
      id: '2',
      similarity: 95,
      photos: [
        { id: '2a', url: '/placeholder.jpg', uploadedBy: 'Tom', uploadedAt: '5h ago', size: 3.1, selected: false },
        { id: '2b', url: '/placeholder.jpg', uploadedBy: 'Lisa', uploadedAt: '5h ago', size: 3.0, selected: false },
      ]
    },
    {
      id: '3',
      similarity: 92,
      photos: [
        { id: '3a', url: '/placeholder.jpg', uploadedBy: 'John', uploadedAt: '1d ago', size: 1.8, selected: false },
        { id: '3b', url: '/placeholder.jpg', uploadedBy: 'Anna', uploadedAt: '1d ago', size: 1.7, selected: false },
        { id: '3c', url: '/placeholder.jpg', uploadedBy: 'Peter', uploadedAt: '1d ago', size: 1.9, selected: false },
        { id: '3d', url: '/placeholder.jpg', uploadedBy: 'Maria', uploadedAt: '1d ago', size: 1.8, selected: false },
      ]
    },
    {
      id: '4',
      similarity: 88,
      photos: [
        { id: '4a', url: '/placeholder.jpg', uploadedBy: 'David', uploadedAt: '2d ago', size: 2.2, selected: false },
        { id: '4b', url: '/placeholder.jpg', uploadedBy: 'Sophie', uploadedAt: '2d ago', size: 2.1, selected: false },
      ]
    },
  ])

  const totalDuplicates = duplicateGroups.reduce((acc, group) => acc + group.photos.length - 1, 0)
  const potentialSavings = duplicateGroups.reduce((acc, group) => 
    acc + group.photos.slice(1).reduce((sum, p) => sum + p.size, 0), 0
  )

  const togglePhoto = (groupId: string, photoId: string) => {
    setDuplicateGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          photos: group.photos.map(photo => 
            photo.id === photoId ? { ...photo, selected: !photo.selected } : photo
          )
        }
      }
      return group
    }))
    
    // Update count
    const count = duplicateGroups.reduce((acc, group) => 
      acc + group.photos.filter(p => p.selected).length, 0
    )
    setSelectedCount(count)
  }

  const selectAllInGroup = (groupId: string) => {
    setDuplicateGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          photos: group.photos.map((photo, i) => ({ ...photo, selected: i > 0 }))
        }
      }
      return group
    }))
  }

  const autoSelectDuplicates = () => {
    setDuplicateGroups(prev => prev.map(group => ({
      ...group,
      photos: group.photos.map((photo, i) => {
        // Keep highest quality (largest file size)
        const maxSize = Math.max(...group.photos.map(p => p.size))
        return { ...photo, selected: photo.size < maxSize }
      })
    })))
  }

  const deleteSelected = () => {
    console.log('[v0] Deleting selected duplicates')
    setDuplicateGroups(prev => 
      prev.map(group => ({
        ...group,
        photos: group.photos.filter(p => !p.selected)
      })).filter(group => group.photos.length > 1)
    )
    setSelectedCount(0)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Duplicate Detection</h1>
          <p className="mt-2 text-muted-foreground">
            Find and remove duplicate photos
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duplicate Groups</CardTitle>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{duplicateGroups.length}</div>
              <p className="text-xs text-muted-foreground">
                {totalDuplicates} duplicate photos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{potentialSavings.toFixed(1)} MB</div>
              <p className="text-xs text-muted-foreground">
                Storage can be freed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCount}</div>
              <p className="text-xs text-muted-foreground">
                Ready to delete
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Detection Settings</CardTitle>
            <CardDescription>Adjust similarity threshold</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Similarity Threshold: {threshold[0]}%</Label>
                <Badge variant="outline">{duplicateGroups.length} groups found</Badge>
              </div>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                min={70}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Lower = more groups detected (less similar photos)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={autoSelectDuplicates} variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-Select Duplicates
              </Button>
              {selectedCount > 0 && (
                <Button onClick={deleteSelected} variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedCount} Selected
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Duplicate Groups */}
        <div className="space-y-4">
          {duplicateGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">No Duplicates Found</h3>
                <p className="text-sm text-muted-foreground">
                  Your gallery is clean!
                </p>
              </CardContent>
            </Card>
          ) : (
            duplicateGroups.map((group, groupIndex) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        Group {groupIndex + 1}
                      </CardTitle>
                      <CardDescription>
                        {group.photos.length} similar photos • {group.similarity}% match
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => selectAllInGroup(group.id)}
                    >
                      Select All Duplicates
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.photos.map((photo, photoIndex) => (
                      <div 
                        key={photo.id}
                        className={`relative rounded-lg border-2 transition-all ${
                          photo.selected 
                            ? 'border-destructive' 
                            : photoIndex === 0 
                            ? 'border-green-500' 
                            : 'border-transparent'
                        }`}
                      >
                        <div className="relative aspect-square">
                          <Image
                            src={photo.url}
                            alt="Photo"
                            fill
                            className="object-cover rounded-t-lg"
                          />
                          {photoIndex === 0 && (
                            <Badge className="absolute top-2 left-2 bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Keep
                            </Badge>
                          )}
                        </div>
                        
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{photo.uploadedBy}</span>
                            <span className="text-xs text-muted-foreground">{photo.size} MB</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{photo.uploadedAt}</span>
                            {photoIndex > 0 && (
                              <Checkbox
                                checked={photo.selected}
                                onCheckedChange={() => togglePhoto(group.id, photo.id)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
