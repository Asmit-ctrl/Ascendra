"use client";

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, GraduationCap, Users, BarChart3 } from "lucide-react";
import Link from "next/link";
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="absolute top-0 left-0 right-0 p-4">
        <div className="container mx-auto flex justify-end items-center">
             <Button variant="ghost" asChild>
                <Link href="/login">
                  Sign In
                </Link>
            </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center">
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center space-y-8">
                
                <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                    <Image
                      src="/assets/LOGO.png"
                      alt="SyncSenta Logo"
                      width={160}
                      height={160}
                      className="rounded-full"
                    />
                </div>
                
                <div className="max-w-2xl space-y-4">
                    <p className="text-xl md:text-2xl text-foreground font-semibold">
                        SyncSenta is an AI-powered operating system designed to synchronize the Kenyan education ecosystem.
                    </p>
                    <p className="text-lg text-muted-foreground">
                        We connect students, teachers, and administrators to streamline workflows and foster critical thinking, all grounded in the official curriculum.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                    <Button onClick={() => router.push('/signup')} size="lg" className="w-full sm:w-auto">
                        Get Started
                        <ArrowRight className="ml-2" />
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                        <Link href="/products">
                            View Products
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mt-24 mb-12">
                <h2 className="text-3xl font-bold text-center mb-12">What You Get</h2>
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    
                    <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <GraduationCap className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle>Students</CardTitle>
                            <CardDescription>Personalized learning experience</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Automatic attendance via face recognition</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>AI-generated personalized exams adapted to your level</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Instant code grading with detailed feedback</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Real-time progress tracking and learning recommendations</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>24/7 AI chatbot for questions and support</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Curriculum-aligned Arduino projects and assessments</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle>Teachers</CardTitle>
                            <CardDescription>Focus on mentoring, not administration</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Automated attendance tracking with no manual input</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>AI-powered exam generation and grading</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Automatic code assessment and feedback delivery</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Real-time alerts for struggling students</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Data-driven insights on class performance</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>More time for personalized student mentoring</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <BarChart3 className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle>School Heads</CardTitle>
                            <CardDescription>Comprehensive oversight and analytics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Real-time monitoring of all classes and students</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>School-wide performance analytics and trends</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Automated attendance and assessment reports</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Teacher effectiveness metrics and insights</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Remote access to all system data via cloud dashboard</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Predictive analytics for student success and intervention</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
      </main>
       <footer className="p-4 text-center text-xs text-muted-foreground">
          © 2025 3D. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
      </footer>
    </div>
  );
}
