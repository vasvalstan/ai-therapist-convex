"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { BarChart2, CheckCircle2, AlertCircle, Lightbulb, BookOpen, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Id } from "@/convex/_generated/dataModel";

interface EmotionalProgress {
  mainThemes: string[];
  improvements: string[];
  challenges: string[];
  recommendations: string[];
}

interface TherapyProgress {
  userId: string;
  sessionIds: Id<"chatHistory">[];
  transcripts: {
    sessionId: Id<"chatHistory">;
    content: string;
    timestamp: number;
  }[];
  progressSummary: string;
  emotionalProgress: EmotionalProgress;
  lastUpdated: number;
}

export function TherapyProgress() {
  // Get the user's therapy progress
  const summary = useQuery(api.summary.getTherapyProgress) as TherapyProgress | undefined | null;

  if (summary === undefined) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-r-transparent" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-full text-center">
        <BarChart2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Progress Data Yet</h2>
        <p className="text-muted-foreground max-w-md">
          Start conversations to build your therapy progress insights. Your AI therapist will track patterns and progress over time.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="flex flex-col p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">Your Therapy Progress</h2>
        
        <div className="text-sm text-muted-foreground mb-6">
          Based on {summary.sessionIds.length} conversation{summary.sessionIds.length === 1 ? '' : 's'} • 
          Updated {formatDistanceToNow(summary.lastUpdated, { addSuffix: true })}
        </div>

        {/* Main Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4 md:p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-[#4285f4]" />
              <h3 className="font-semibold">Main Themes</h3>
            </div>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {summary.emotionalProgress?.mainThemes?.map((theme, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <Circle className="h-2 w-2 flex-shrink-0 text-[#4285f4]" />
                    <span>{theme}</span>
                  </li>
                )) || <li className="text-sm text-muted-foreground">No themes identified yet</li>}
              </ul>
            </ScrollArea>
          </Card>

          {/* Improvements */}
          <Card className="p-4 md:p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-[#4285f4]" />
              <h3 className="font-semibold">Improvements</h3>
            </div>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {summary.emotionalProgress?.improvements?.map((improvement, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <Circle className="h-2 w-2 flex-shrink-0 text-[#4285f4]" />
                    <span>{improvement}</span>
                  </li>
                )) || <li className="text-sm text-muted-foreground">No improvements tracked yet</li>}
              </ul>
            </ScrollArea>
          </Card>

          {/* Challenges */}
          <Card className="p-4 md:p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-[#4285f4]" />
              <h3 className="font-semibold">Current Challenges</h3>
            </div>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {summary.emotionalProgress?.challenges?.map((challenge, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <Circle className="h-2 w-2 flex-shrink-0 text-[#4285f4]" />
                    <span>{challenge}</span>
                  </li>
                )) || <li className="text-sm text-muted-foreground">No challenges identified yet</li>}
              </ul>
            </ScrollArea>
          </Card>

          {/* Recommendations */}
          <Card className="p-4 md:p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-[#4285f4]" />
              <h3 className="font-semibold">Therapeutic Recommendations</h3>
            </div>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-2">
                {summary.emotionalProgress?.recommendations?.map((recommendation, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <Circle className="h-2 w-2 flex-shrink-0 text-[#4285f4]" />
                    <span>{recommendation}</span>
                  </li>
                )) || <li className="text-sm text-muted-foreground">No recommendations available yet</li>}
              </ul>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
} 