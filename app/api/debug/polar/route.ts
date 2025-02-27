import { NextResponse } from 'next/server';
import { Polar } from "@polar-sh/sdk";

export async function GET(request: Request) {
  try {
    // Get the hostname from the request
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Determine environment based on hostname or NODE_ENV
    const isProductionDomain = hostname === 'www.sereni.day' || hostname === 'sereni.day';
    const environment = isProductionDomain || process.env.NODE_ENV === "production" 
      ? "production" 
      : "sandbox";
    
    // Select the appropriate token based on environment
    const accessToken = environment === "production" 
      ? process.env.POLAR_PRODUCTION_ACCESS_TOKEN 
      : process.env.POLAR_SANDBOX_ACCESS_TOKEN;
    
    // Check if token exists
    if (!accessToken) {
      return NextResponse.json({
        error: `${environment === "production" ? "POLAR_PRODUCTION_ACCESS_TOKEN" : "POLAR_SANDBOX_ACCESS_TOKEN"} is not configured`,
        environment,
        isProductionDomain,
        hostname,
        nodeEnv: process.env.NODE_ENV
      }, { status: 500 });
    }
    
    // Initialize Polar SDK
    const polar = new Polar({
      server: environment as "production" | "sandbox",
      accessToken: accessToken,
    });
    
    // Just check if we can initialize the SDK without errors
    return NextResponse.json({
      success: true,
      environment,
      isProductionDomain,
      hostname,
      nodeEnv: process.env.NODE_ENV,
      tokenFirstChars: accessToken.substring(0, 8) + "...",
      server: environment
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      hostname: new URL(request.url).hostname,
      nodeEnv: process.env.NODE_ENV
    }, { status: 500 });
  }
} 