/**
 * Sign In Page
 */

import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Mwalimu AI</h1>
          <p className="text-muted-foreground">
            Welcome back! Continue your learning journey
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
