#!/usr/bin/env node

/**
 * Pre-build check: Ensure required environment variables are set
 * This prevents deploying a broken build to production
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  // Server-side. /api/chat hands this to the Groq SDK; missing or invalid
  // keys surface as a 502 on the student chat page. Fail the build instead.
  'GROQ_API_KEY',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:\n');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these variables in your Vercel dashboard:');
  console.error('Settings → Environment Variables\n');
  console.error('You can find these values in your Supabase dashboard:');
  console.error('Project Settings → API\n');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
process.exit(0);
