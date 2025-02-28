"use client";

import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function SubscriptionStatus() {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get subscription status using Convex's useQuery
  const subscriptionStatus = useQuery(
    api.subscriptions.getUserSubscriptionStatus,
    userId ? {} : "skip"
  );

  // Handle loading and error states
  useEffect(() => {
    if (!userId) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    if (subscriptionStatus === undefined) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
  }, [userId, subscriptionStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-[35vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-muted-foreground">Checking subscription status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="mt-[35vh] mb-3 scroll-m-20 text-5xl font-semibold tracking-tight transition-colors first:mt-0">
          Oops! Something went wrong
        </h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/pricing" className='mt-4'>
          <Button>View Pricing</Button>
        </Link>
      </>
    );
  }

  const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription ?? false;

  return (
    <>
      <h1 className="mt-[35vh] mb-3 scroll-m-20 text-5xl font-semibold tracking-tight transition-colors first:mt-0">
        {hasActiveSubscription ? "Subscription Successful 🎉" : "You Can Subscribe Now"}
      </h1>
      <Link href={hasActiveSubscription ? "/" : "/pricing"} className='mt-4'>
        <Button>{hasActiveSubscription ? "Access Dashboard" : "View Pricing"}</Button>
      </Link>
    </>
  );
} 