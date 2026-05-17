/**
 * Bulk Assign Students Component
 * 
 * Allows teachers to assign multiple students to their class at once.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkAssignStudentsProps {
  teacherId: string;
  className: string;
  onSuccess?: () => void;
}

export function BulkAssignStudents({
  teacherId,
  className,
  onSuccess,
}: BulkAssignStudentsProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentEmails, setStudentEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [assigning, setAssigning] = useState(false);

  const handleBulkAssign = async () => {
    const emails = studentEmails
      .split('\n')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one student email',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAssigning(true);

      // First, look up student IDs from emails
      const response = await fetch('/api/teacher/lookup-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        throw new Error('Failed to lookup students');
      }

      const { studentIds } = await response.json();

      if (studentIds.length === 0) {
        toast({
          title: 'No students found',
          description: 'None of the provided emails matched existing students',
          variant: 'destructive',
        });
        return;
      }

      // Assign students to class
      const assignResponse = await fetch('/api/teacher/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          className,
          subject: subject || undefined,
        }),
      });

      if (!assignResponse.ok) {
        throw new Error('Failed to assign students');
      }

      const result = await assignResponse.json();

      toast({
        title: 'Success',
        description: result.message,
      });

      setStudentEmails('');
      setSubject('');
      setDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error assigning students:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign students. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Students to {className}</DialogTitle>
          <DialogDescription>
            Enter student email addresses (one per line) to add them to your class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              placeholder="e.g., Mathematics, Science, English"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails">Student Email Addresses</Label>
            <Textarea
              id="emails"
              placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
              value={studentEmails}
              onChange={(e) => setStudentEmails(e.target.value)}
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Enter one email address per line. Students must already have accounts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkAssign} disabled={assigning || !studentEmails.trim()}>
            {assigning ? 'Adding...' : 'Add Students'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
