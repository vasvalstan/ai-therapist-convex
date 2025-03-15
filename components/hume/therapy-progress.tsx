"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

export function TherapyProgress() {
  // Get the user's conversation summary
  const summary = useQuery(api.summary.getUserSummary);

  if (summary === undefined) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No therapy progress available yet.</p>
        <p className="mt-2 text-sm">Start a conversation to begin tracking your progress.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Your Therapy Progress</h2>
      
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-2">
          Last updated {formatDistanceToNow(summary.lastUpdated, { addSuffix: true })}
        </div>
        
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {summary.summary}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Based on {summary.sessionIds.length} conversation{summary.sessionIds.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
} 