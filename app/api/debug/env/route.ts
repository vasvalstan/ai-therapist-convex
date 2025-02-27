import { NextResponse } from 'next/server';

export async function GET() {
  // Only show limited information for security
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    polarProductionTokenExists: !!process.env.POLAR_PRODUCTION_ACCESS_TOKEN,
    polarSandboxTokenExists: !!process.env.POLAR_SANDBOX_ACCESS_TOKEN,
    frontendUrl: process.env.FRONTEND_URL,
    frontendUrlDev: process.env.FRONTEND_URL_DEV,
  });
} 