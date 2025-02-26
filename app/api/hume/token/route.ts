import { fetchAccessToken } from "hume";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Log environment variable presence (not the actual values for security)
    console.log("HUME_API_KEY exists:", !!process.env.HUME_API_KEY);
    console.log("HUME_SECRET_KEY exists:", !!process.env.HUME_SECRET_KEY);
    
    if (!process.env.HUME_API_KEY || !process.env.HUME_SECRET_KEY) {
      console.error("Missing Hume API configuration");
      return NextResponse.json(
        { 
          error: "Hume API configuration missing",
          details: {
            apiKeyExists: !!process.env.HUME_API_KEY,
            secretKeyExists: !!process.env.HUME_SECRET_KEY
          }
        },
        { status: 500 }
      );
    }

    const accessToken = await fetchAccessToken({
      apiKey: process.env.HUME_API_KEY,
      secretKey: process.env.HUME_SECRET_KEY,
    });

    if (!accessToken) {
      console.error("Failed to generate Hume access token");
      return NextResponse.json(
        { error: "Failed to generate access token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error("Error generating Hume access token:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 