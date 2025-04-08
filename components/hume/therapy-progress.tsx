"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { BarChart2 } from "lucide-react";

export function TherapyProgress() {
  // Get the user's conversation summary
  const summary = useQuery(api.summary.getUserSummary);

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
    <div className="flex flex-col p-4 md:p-6 h-full overflow-auto">
      <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">Your Therapy Progress</h2>
      
      <div className="bg-card border border-border rounded-lg p-4 md:p-6">
        <div className="text-sm text-muted-foreground mb-4">
          Based on {summary.sessionIds.length} conversation{summary.sessionIds.length === 1 ? '' : 's'} • 
          Updated {formatDistanceToNow(summary.lastUpdated, { addSuffix: true })}
        </div>
        
        <div className="prose prose-sm md:prose max-w-none dark:prose-invert">
          {summary.summary}
        </div>
      </div>
    </div>
  );
} 