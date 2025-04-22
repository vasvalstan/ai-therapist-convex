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
    
    try {
      // Directly fetch the access token without using the hume package
      const response = await fetch("https://api.hume.ai/v0/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.HUME_API_KEY,
          client_secret: process.env.HUME_SECRET_KEY,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch Hume access token: ${response.status} ${response.statusText}`, errorText);
        return NextResponse.json(
          { error: "Failed to fetch access token from Hume API" },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      
      // Log a masked version of the access token for debugging
      const accessToken = data.access_token;
      if (accessToken) {
        const maskedToken = accessToken.substring(0, 4) + '***';
        console.log(`Access token retrieved successfully (starts with: ${maskedToken})`);
      }
      
      return NextResponse.json({ accessToken: data.access_token });
    } catch (error) {
      console.error("Error fetching Hume access token:", error);
      return NextResponse.json(
        { error: "Failed to fetch access token" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in token endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}