/**
 * Sign Up Page
 */

import { SignUpForm } from '@/components/auth/sign-up-form';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Mwalimu AI</h1>
          <p className="text-muted-foreground">
            Your personal AI tutor for CBC curriculum
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
