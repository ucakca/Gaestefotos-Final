'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Briefcase, PartyPopper, GraduationCap, Baby, Cake, Camera, Music, Star } from 'lucide-react'

export default function TemplatesPage() {
  const templates = [
    {
      id: 1,
      name: 'Wedding',
      icon: Heart,
      description: 'Perfect for weddings with ceremony, reception, and multiple photo albums',
      features: ['Bride & Groom Albums', 'Ceremony Timeline', 'Guest Book', 'Best Of Highlights'],
      color: 'text-pink-600',
      popular: true,
    },
    {
      id: 2,
      name: 'Corporate Event',
      icon: Briefcase,
      description: 'Professional setup for conferences, seminars, and corporate gatherings',
      features: ['Speaker Sessions', 'Networking Photos', 'Branded Templates', 'Team Albums'],
      color: 'text-blue-600',
      popular: false,
    },
    {
      id: 3,
      name: 'Birthday Party',
      icon: Cake,
      description: 'Fun and colorful template for birthday celebrations',
      features: ['Birthday Timeline', 'Cake Cutting Album', 'Party Games', 'Video Messages'],
      color: 'text-purple-600',
      popular: true,
    },
    {
      id: 4,
      name: 'Baby Shower',
      icon: Baby,
      description: 'Sweet template for celebrating the arrival of a new baby',
      features: ['Gender Reveal', 'Gift Gallery', 'Wishes & Messages', 'Bump Photos'],
      color: 'text-yellow-600',
      popular: false,
    },
    {
      id: 5,
      name: 'Graduation',
      icon: GraduationCap,
      description: 'Celebrate academic achievements with style',
      features: ['Ceremony Photos', 'Class Gallery', 'Yearbook Style', 'Achievement Timeline'],
      color: 'text-green-600',
      popular: false,
    },
    {
      id: 6,
      name: 'Festival',
      icon: Music,
      description: 'For music festivals, concerts, and live events',
      features: ['Artist Performances', 'Crowd Photos', 'Stage Albums', 'Festival Map'],
      color: 'text-red-600',
      popular: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event Templates</h1>
        <p className="text-muted-foreground">Start with pre-configured templates for different event types</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const Icon = template.icon
          return (
            <Card key={template.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              {template.popular && (
                <Badge className="absolute top-4 right-4">Popular</Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg bg-accent ${template.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{template.name}</CardTitle>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Includes:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {template.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">Use Template</Button>
                  <Button variant="outline">Preview</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Template</CardTitle>
          <CardDescription>Create your own template from scratch</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            <Star className="h-4 w-4 mr-2" />
            Create Custom Template
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
