"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SubscriptionStatus() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Action to process Polar session token
  const processSessionToken = useAction(
    api.subscriptions.processCustomerSessionToken
  );

  // Check for different types of success redirects
  const isMock = searchParams.get("mock") === "true";
  const isTest = searchParams.get("test") === "1";
  const customerSessionToken = searchParams.get("customer_session_token");
  const planKey = searchParams.get("plan");
  const userEmail = searchParams.get("email");

  // Detect if this is a real Polar success redirect
  const isPolarSuccess = !!(customerSessionToken && planKey);

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

    // If this is a Polar success redirect, show processing message
    if (isPolarSuccess) {
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
  }, [userId, subscriptionStatus, isMock, isTest, isPolarSuccess]);

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

  // Handle Polar success redirect
  if (isPolarSuccess) {
    return (
      <>
        <h1 className="mt-[35vh] mb-3 scroll-m-20 text-5xl font-semibold tracking-tight transition-colors first:mt-0">
          🎉 Payment Successful!
        </h1>
        <div className="text-center space-y-2 mb-6">
          <p className="text-muted-foreground">
            Your payment has been processed successfully.
          </p>
          {planKey && (
            <p className="text-sm">
              <strong>Plan:</strong>{" "}
              {planKey.charAt(0).toUpperCase() + planKey.slice(1)}
            </p>
          )}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              🔄 We're processing your purchase and updating your account.
              <br />
              Your minutes will be available shortly.
            </p>
            {!processingPayment && (
              <Button
                onClick={async () => {
                  setProcessingPayment(true);
                  try {
                    const result = await processSessionToken({
                      customerSessionToken: customerSessionToken!,
                      planKey: planKey,
                    });
                    console.log("Payment processed:", result);
                    // Optionally redirect or show success
                    window.location.href = "/chat";
                  } catch (error) {
                    console.error("Failed to process payment:", error);
                    setError(
                      "Failed to process payment. Please contact support."
                    );
                  }
                  setProcessingPayment(false);
                }}
                disabled={processingPayment}
                className="mt-3 w-full"
                size="sm"
              >
                {processingPayment ? "Processing..." : "Complete Setup"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Session Token: {customerSessionToken?.slice(0, 20)}...
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/chat">
            <Button>Start Chatting</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline">View Pricing</Button>
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
