/**
 * Student List View
 * 
 * Displays list of students with their current status and quick stats.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Circle,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Target,
  Flame,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { QuickActions } from './quick-actions';

interface TeacherStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  grade: string;
  class_name: string;
  last_active: string;
  total_sessions: number;
  total_messages: number;
  current_streak: number;
  competencies_mastered: number;
  average_mastery_percentage: number;
}

interface StudentListViewProps {
  students: TeacherStudent[];
  onStudentClick: (student: TeacherStudent) => void;
  onRefresh?: () => void;
}

export function StudentListView({ students, onStudentClick, onRefresh }: StudentListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'activity' | 'mastery'>('activity');

  // Filter students by search query
  const filteredStudents = students.filter((student) =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.student_name.localeCompare(b.student_name);
      case 'activity':
        return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
      case 'mastery':
        return b.average_mastery_percentage - a.average_mastery_percentage;
      default:
        return 0;
    }
  });

  const getActivityStatus = (lastActive: string) => {
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);

    if (diffMinutes < 5) {
      return { status: 'online', color: 'bg-green-500', label: 'Active now' };
    } else if (diffMinutes < 60) {
      return { status: 'recent', color: 'bg-yellow-500', label: 'Active recently' };
    } else if (diffMinutes < 1440) {
      // 24 hours
      return { status: 'today', color: 'bg-blue-500', label: 'Active today' };
    } else {
      return { status: 'inactive', color: 'bg-gray-400', label: 'Inactive' };
    }
  };

  const getMasteryBadge = (percentage: number) => {
    if (percentage >= 90) {
      return <Badge className="bg-green-500">Excellent</Badge>;
    } else if (percentage >= 75) {
      return <Badge className="bg-blue-500">Good</Badge>;
    } else if (percentage >= 50) {
      return <Badge variant="secondary">Fair</Badge>;
    } else {
      return <Badge variant="destructive">Needs Help</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Search and Sort */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('name')}
            >
              Name
            </Button>
            <Button
              variant={sortBy === 'activity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('activity')}
            >
              Activity
            </Button>
            <Button
              variant={sortBy === 'mastery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('mastery')}
            >
              Mastery
            </Button>
          </div>
        </div>

        {/* Students Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mastery</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchQuery ? 'No students found' : 'No students in this class'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedStudents.map((student) => {
                  const activityStatus = getActivityStatus(student.last_active);

                  return (
                    <TableRow
                      key={student.student_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onStudentClick(student)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(student.student_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.grade}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Circle
                            className={`h-2 w-2 ${activityStatus.color} fill-current`}
                          />
                          <span className="text-sm">{activityStatus.label}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMasteryBadge(student.average_mastery_percentage)}
                          <span className="text-sm text-muted-foreground">
                            {student.average_mastery_percentage}%
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">{student.current_streak}</span>
                          <span className="text-sm text-muted-foreground">days</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>{student.total_messages}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(student.last_active), {
                            addSuffix: true,
                          })}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QuickActions
                            studentId={student.student_id}
                            studentName={student.student_name}
                            onSuccess={onRefresh}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {sortedStudents.length} of {students.length} students
        </div>
      </CardContent>
    </Card>
  );
}
