import { NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";

// Define a type for the environment variables response
type EnvironmentVarsResponse = Record<string, unknown>;

export async function GET() {
  try {
    // Create a client for the current deployment
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({
        error: "NEXT_PUBLIC_CONVEX_URL is not configured"
      }, { status: 500 });
    }
    
    const client = new ConvexHttpClient(convexUrl);
    
    // Call the debug function to get environment variables
    // Use type assertion for this specific call
    const envVars = await (client as unknown as { 
      action(path: string): Promise<EnvironmentVarsResponse> 
    }).action("subscriptions:debugEnvironmentVariables");
    
    return NextResponse.json({
      success: true,
      convexUrl,
      envVars,
      nextjsEnv: {
        nodeEnv: process.env.NODE_ENV,
        polarProductionTokenExists: !!process.env.POLAR_PRODUCTION_ACCESS_TOKEN,
        polarSandboxTokenExists: !!process.env.POLAR_SANDBOX_ACCESS_TOKEN,
        polarAccessTokenExists: !!process.env.POLAR_ACCESS_TOKEN,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 