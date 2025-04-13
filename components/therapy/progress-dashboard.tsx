"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProgressDashboard() {
    const progress = useQuery(api.summary.getTherapyProgress);

    if (!progress) {
        return <ProgressDashboardSkeleton />;
    }

    // Process emotional data for visualization
    const emotionalTrends = progress.transcripts.map((transcript) => ({
        date: format(new Date(transcript.timestamp), "MMM d"),
        progress: calculateProgressScore(progress.emotionalProgress),
    }));

    return (
        <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="space-y-6 p-6">
                <h2 className="text-3xl font-bold tracking-tight">Therapy Progress</h2>
                
                {/* Overall Progress Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Overall Progress</CardTitle>
                        <CardDescription>
                            Last updated: {format(new Date(progress.lastUpdated), "PPP")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{progress.progressSummary}</p>
                        
                        {/* Progress Chart */}
                        <div className="h-[300px] mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={emotionalTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="progress"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Emotional Progress Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Themes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Main Themes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-2">
                                    {progress.emotionalProgress.mainThemes.map((theme, index) => (
                                        <Badge
                                            key={index}
                                            variant="secondary"
                                            className="mr-2 mb-2"
                                        >
                                            {theme}
                                        </Badge>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Improvements */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Areas of Improvement</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[200px]">
                                <ul className="space-y-2">
                                    {progress.emotionalProgress.improvements.map((improvement, index) => (
                                        <li key={index} className="flex items-center">
                                            <span className="text-green-500 mr-2">✓</span>
                                            {improvement}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Current Challenges */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Challenges</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[200px]">
                                <ul className="space-y-2">
                                    {progress.emotionalProgress.challenges.map((challenge, index) => (
                                        <li key={index} className="flex items-center">
                                            <span className="text-yellow-500 mr-2">⚠</span>
                                            {challenge}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Recommendations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Therapeutic Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[200px]">
                                <ul className="space-y-2">
                                    {progress.emotionalProgress.recommendations.map((recommendation, index) => (
                                        <li key={index} className="flex items-center">
                                            <span className="text-blue-500 mr-2">💡</span>
                                            {recommendation}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Session Timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle>Session History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {progress.transcripts.map((transcript, index) => (
                                    <div
                                        key={index}
                                        className="border-l-2 border-muted pl-4 py-2"
                                    >
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(transcript.timestamp), "PPP p")}
                                        </p>
                                        <p className="mt-1 line-clamp-2">{transcript.content.split("\n")[0]}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}

function ProgressDashboardSkeleton() {
    return (
        <div className="space-y-6 p-6">
            <Skeleton className="h-8 w-[300px]" />
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-[300px] w-full mt-6" />
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-[150px]" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[200px] w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function calculateProgressScore(emotionalProgress: any) {
    // Calculate a score based on improvements vs challenges
    const improvementScore = emotionalProgress.improvements.length * 10;
    const challengeScore = emotionalProgress.challenges.length * -5;
    
    // Normalize the score between 0 and 100
    const rawScore = improvementScore + challengeScore + 50; // Add 50 as baseline
    return Math.min(Math.max(rawScore, 0), 100); // Clamp between 0 and 100
} 