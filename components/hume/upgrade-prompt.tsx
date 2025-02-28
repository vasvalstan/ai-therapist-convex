import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  reason: string;
}

export function UpgradePrompt({ reason }: UpgradePromptProps) {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[80vh]">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Time Limit Reached
          </CardTitle>
          <CardDescription>
            Your conversation has been saved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center">{reason}</p>
          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Free plan: <strong>2 minutes</strong> per conversation</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span>Basic plan: <strong>30 minutes</strong> of chat time</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span>Premium plan: <strong>60 minutes</strong> of chat time</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/pricing" className="w-full max-w-xs">
            <Button className="w-full">View Pricing Plans</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 