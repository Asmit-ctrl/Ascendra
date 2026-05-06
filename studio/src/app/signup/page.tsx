"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GraduationCap, Users } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Choose Your Role</CardTitle>
          <CardDescription>Enter SyncSenta as a student or teacher.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/student">
              <GraduationCap className="mr-2 h-5 w-5" />
              Continue as Student
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/teacher">
              <Users className="mr-2 h-5 w-5" />
              Continue as Teacher
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
