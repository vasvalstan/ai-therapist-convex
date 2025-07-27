"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SubscriptionStatus() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for mock/test parameters
  const isMock = searchParams.get("mock") === "true";
  const isTest = searchParams.get("test") === "1";
  const planKey = searchParams.get("plan");
  const userEmail = searchParams.get("email");

  // Get subscription status using Convex's useQuery (skip for mock mode)
  const subscriptionStatus = useQuery(
    api.subscriptions.getUserSubscriptionStatus,
    userId && !isMock ? {} : "skip"
  );

  // Handle loading and error states
  useEffect(() => {
    // If this is a mock/test checkout, show success immediately
    if (isMock || isTest) {
      setIsLoading(false);
      return;
    }

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
  }, [userId, subscriptionStatus, isMock, isTest]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-[35vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-muted-foreground">
          Checking subscription status...
        </p>
      </div>
    );
  }

  // Handle mock/test checkout success
  if (isMock || isTest) {
    return (
      <>
        <h1 className="mt-[35vh] mb-3 scroll-m-20 text-5xl font-semibold tracking-tight transition-colors first:mt-0">
          🧪 Test Checkout Successful!
        </h1>
        <div className="text-center space-y-2 mb-6">
          <p className="text-muted-foreground">
            This was a test checkout for development purposes.
          </p>
          {planKey && (
            <p className="text-sm">
              <strong>Plan:</strong>{" "}
              {planKey.charAt(0).toUpperCase() + planKey.slice(1)}
            </p>
          )}
          {userEmail && (
            <p className="text-sm">
              <strong>Email:</strong> {decodeURIComponent(userEmail)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            In production, this would create a real subscription and redirect to
            the dashboard.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/pricing">
            <Button variant="outline">Back to Pricing</Button>
          </Link>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="mt-[35vh] mb-3 scroll-m-20 text-5xl font-semibold tracking-tight transition-colors first:mt-0">
          Oops! Something went wrong
        </h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/pricing" className="mt-4">
          <Button>View Pricing</Button>
        </Link>
      </>
    );
  }

  const hasActiveSubscription =
    subscriptionStatus?.hasActiveSubscription ?? false;

  return (
    <>
      <h1 className="mt-[35vh] mb-3 scroll-m-20 text-5xl font-semibold tracking-tight transition-colors first:mt-0">
        {hasActiveSubscription
          ? "Subscription Successful 🎉"
          : "You Can Subscribe Now"}
      </h1>
      <Link href={hasActiveSubscription ? "/" : "/pricing"} className="mt-4">
        <Button>
          {hasActiveSubscription ? "Access Dashboard" : "View Pricing"}
        </Button>
      </Link>
    </>
  );
}
