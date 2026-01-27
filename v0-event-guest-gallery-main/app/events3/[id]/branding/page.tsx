'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Palette, Upload, Type, Image as ImageIcon, Sparkles } from 'lucide-react'

export default function BrandingPage() {
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#ec4899')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Custom Branding</h1>
        <p className="text-muted-foreground">Customize the look and feel of your event gallery</p>
      </div>

      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="logo">Logo & Images</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Define your event's color palette</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-12 w-20"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-12 w-20"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Preset Themes</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" className="h-12">
                    <div className="flex gap-1">
                      <div className="h-8 w-8 rounded bg-blue-600" />
                      <div className="h-8 w-8 rounded bg-blue-400" />
                    </div>
                  </Button>
                  <Button variant="outline" className="h-12">
                    <div className="flex gap-1">
                      <div className="h-8 w-8 rounded bg-pink-600" />
                      <div className="h-8 w-8 rounded bg-pink-400" />
                    </div>
                  </Button>
                  <Button variant="outline" className="h-12">
                    <div className="flex gap-1">
                      <div className="h-8 w-8 rounded bg-green-600" />
                      <div className="h-8 w-8 rounded bg-green-400" />
                    </div>
                  </Button>
                  <Button variant="outline" className="h-12">
                    <div className="flex gap-1">
                      <div className="h-8 w-8 rounded bg-purple-600" />
                      <div className="h-8 w-8 rounded bg-purple-400" />
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your colors look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border rounded-lg" style={{ backgroundColor: primaryColor + '10' }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>
                  Your Event Gallery
                </h3>
                <p className="text-muted-foreground mb-4">This is how your branding will appear</p>
                <div className="flex gap-2">
                  <Button style={{ backgroundColor: primaryColor }}>Primary Button</Button>
                  <Button variant="outline" style={{ borderColor: secondaryColor, color: secondaryColor }}>
                    Secondary
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Font Settings</CardTitle>
              <CardDescription>Customize typography for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Heading Font</Label>
                <Select defaultValue="inter">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="playfair">Playfair Display</SelectItem>
                    <SelectItem value="montserrat">Montserrat</SelectItem>
                    <SelectItem value="lora">Lora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Body Font</Label>
                <Select defaultValue="system">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System Default</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="opensans">Open Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size Scale</Label>
                <Slider defaultValue={[100]} min={80} max={120} step={5} />
                <p className="text-sm text-muted-foreground">Current: 100%</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Cover Image</CardTitle>
              <CardDescription>Upload custom branding assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Event Logo</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drop your logo here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 512x512px, PNG with transparency
                  </p>
                  <Button variant="outline" className="mt-4">
                    Upload Logo
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Cover Image</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Add a cover image for your event
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1920x1080px, JPG or PNG
                  </p>
                  <Button variant="outline" className="mt-4">
                    Upload Cover
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Watermark (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Add a watermark to all photos
                  </p>
                  <Button variant="outline" size="sm">
                    Upload Watermark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout Options</CardTitle>
              <CardDescription>Customize the gallery layout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gallery Style</Label>
                <Select defaultValue="masonry">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masonry">Masonry Grid</SelectItem>
                    <SelectItem value="grid">Uniform Grid</SelectItem>
                    <SelectItem value="justified">Justified Layout</SelectItem>
                    <SelectItem value="columns">Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Spacing</Label>
                <Slider defaultValue={[16]} min={4} max={32} step={4} />
                <p className="text-sm text-muted-foreground">Current: 16px</p>
              </div>

              <div className="space-y-2">
                <Label>Border Radius</Label>
                <Slider defaultValue={[8]} min={0} max={24} step={2} />
                <p className="text-sm text-muted-foreground">Current: 8px</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button size="lg" className="flex-1">
          <Sparkles className="h-4 w-4 mr-2" />
          Apply Branding
        </Button>
        <Button variant="outline" size="lg">
          Reset to Default
        </Button>
      </div>
    </div>
  )
}
