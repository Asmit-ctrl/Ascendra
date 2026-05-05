"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpen, Search, Download, Eye, Star, Filter,
  FileText, Video, Image, Link as LinkIcon, Folder
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Resource {
  id: string
  title: string
  description: string
  type: 'lesson-plan' | 'worksheet' | 'video' | 'image' | 'link' | 'assessment'
  subject: string
  grade: string
  strand: string
  downloads: number
  rating: number
  tags: string[]
  url?: string
}

export function ResourceLibrary() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')

  // Mock resources - in production, this would come from database
  const [resources] = useState<Resource[]>([
    {
      id: 'res_001',
      title: 'Fractions with Kenyan Context',
      description: 'Comprehensive lesson plan teaching fractions using chapati, matatu seats, and shillings',
      type: 'lesson-plan',
      subject: 'Mathematics',
      grade: 'Grade 4',
      strand: 'Numbers',
      downloads: 245,
      rating: 4.8,
      tags: ['fractions', 'visual-models', 'kenyan-context'],
      url: '/resources/fractions-lesson.pdf'
    },
    {
      id: 'res_002',
      title: 'Word Problems Practice Worksheet',
      description: 'Scaffolded word problems with step-by-step guides for struggling learners',
      type: 'worksheet',
      subject: 'Mathematics',
      grade: 'Grade 4',
      strand: 'Numbers',
      downloads: 189,
      rating: 4.6,
      tags: ['word-problems', 'scaffolding', 'practice'],
      url: '/resources/word-problems.pdf'
    },
    {
      id: 'res_003',
      title: 'CBC Assessment Rubric Template',
      description: 'Customizable rubric template aligned with CBC competencies',
      type: 'assessment',
      subject: 'All Subjects',
      grade: 'All Grades',
      strand: 'General',
      downloads: 567,
      rating: 4.9,
      tags: ['assessment', 'rubric', 'cbc'],
      url: '/resources/rubric-template.docx'
    },
    {
      id: 'res_004',
      title: 'Visual Fraction Models',
      description: 'Printable fraction circles, bars, and number lines',
      type: 'image',
      subject: 'Mathematics',
      grade: 'Grade 3-6',
      strand: 'Numbers',
      downloads: 423,
      rating: 4.7,
      tags: ['fractions', 'visual-aids', 'manipulatives'],
      url: '/resources/fraction-models.zip'
    },
    {
      id: 'res_005',
      title: 'Teaching Fractions Video Series',
      description: '5-part video series on effective fraction instruction',
      type: 'video',
      subject: 'Mathematics',
      grade: 'Grade 3-6',
      strand: 'Numbers',
      downloads: 312,
      rating: 4.8,
      tags: ['fractions', 'professional-development', 'video'],
      url: 'https://youtube.com/watch?v=example'
    },
    {
      id: 'res_006',
      title: 'KICD Mathematics Curriculum Guide',
      description: 'Official KICD curriculum guide for Grade 4 Mathematics',
      type: 'link',
      subject: 'Mathematics',
      grade: 'Grade 4',
      strand: 'All Strands',
      downloads: 891,
      rating: 5.0,
      tags: ['curriculum', 'kicd', 'official'],
      url: 'https://kicd.ac.ke/curriculum'
    },
  ])

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = filterType === 'all' || resource.type === filterType
    const matchesSubject = filterSubject === 'all' || resource.subject === filterSubject
    const matchesGrade = filterGrade === 'all' || resource.grade.includes(filterGrade)
    
    return matchesSearch && matchesType && matchesSubject && matchesGrade
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson-plan': return <FileText className="h-4 w-4" />
      case 'worksheet': return <FileText className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      case 'link': return <LinkIcon className="h-4 w-4" />
      case 'assessment': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lesson-plan': return 'default'
      case 'worksheet': return 'secondary'
      case 'video': return 'destructive'
      case 'image': return 'outline'
      case 'link': return 'outline'
      case 'assessment': return 'default'
      default: return 'outline'
    }
  }

  const stats = {
    total: resources.length,
    lessonPlans: resources.filter(r => r.type === 'lesson-plan').length,
    worksheets: resources.filter(r => r.type === 'worksheet').length,
    videos: resources.filter(r => r.type === 'video').length,
    assessments: resources.filter(r => r.type === 'assessment').length,
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lesson Plans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lessonPlans}</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worksheets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.worksheets}</div>
            <p className="text-xs text-muted-foreground">Printable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.videos}</div>
            <p className="text-xs text-muted-foreground">Tutorials</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assessments}</div>
            <p className="text-xs text-muted-foreground">Templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Library */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>CBC Resource Library</CardTitle>
              <CardDescription>
                Curated teaching resources aligned with Kenyan CBC curriculum
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Upload Resource
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lesson-plan">Lesson Plans</SelectItem>
                <SelectItem value="worksheet">Worksheets</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="assessment">Assessments</SelectItem>
                <SelectItem value="link">Links</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Kiswahili">Kiswahili</SelectItem>
                <SelectItem value="Science & Technology">Science & Technology</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="Grade 1">Grade 1</SelectItem>
                <SelectItem value="Grade 2">Grade 2</SelectItem>
                <SelectItem value="Grade 3">Grade 3</SelectItem>
                <SelectItem value="Grade 4">Grade 4</SelectItem>
                <SelectItem value="Grade 5">Grade 5</SelectItem>
                <SelectItem value="Grade 6">Grade 6</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resources Grid */}
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(resource.type)}
                        <Badge variant={getTypeColor(resource.type) as any}>
                          {resource.type.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{resource.rating}</span>
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">{resource.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Subject: {resource.subject}</p>
                        <p>Grade: {resource.grade}</p>
                        <p>Strand: {resource.strand}</p>
                        <p className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {resource.downloads} downloads
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {filteredResources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No resources found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Collections */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Collections</CardTitle>
          <CardDescription>Curated resource collections for common teaching needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-2">Fractions Mastery Pack</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete collection of fraction resources with Kenyan context
                </p>
                <Badge>12 resources</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-2">CBC Assessment Tools</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Rubrics, checklists, and assessment templates
                </p>
                <Badge>8 resources</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-2">Differentiation Strategies</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Resources for mixed-ability classrooms
                </p>
                <Badge>15 resources</Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
