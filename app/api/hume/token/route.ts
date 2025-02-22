import { fetchAccessToken } from "hume";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!process.env.HUME_API_KEY || !process.env.HUME_SECRET_KEY) {
      return NextResponse.json(
        { error: "Hume API configuration missing" },
        { status: 500 }
      );
    }

    const accessToken = await fetchAccessToken({
      apiKey: process.env.HUME_API_KEY,
      secretKey: process.env.HUME_SECRET_KEY,
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to generate access token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error("Error generating Hume access token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 