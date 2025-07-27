"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { CheckCircle2, DollarSign, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Doc } from "@/convex/_generated/dataModel";
import { toast } from "@/components/ui/use-toast";

type PricingCardProps = {
  user:
    | {
        emailAddresses?: Array<{ emailAddress: string }>;
        id?: string;
      }
    | null
    | undefined;
  userPlan?: any; // Add userPlan to check for remaining minutes
  planKey: string;
  title: string;
  monthlyPrice?: number | null;
  isYearly?: boolean;
  monthlyEquivalent?: number;
  description: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  exclusive?: boolean;
  isFree?: boolean;
  currentPlan?: boolean;
  totalMinutes?: number;
  maxSessionDurationMinutes?: number;
  maxSessions?: number;
  getProCheckoutUrl?: any;
  getProCheckoutUrlTest?: any;
};

const PricingHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="text-center mb-8 sm:mb-10 px-4">
    {/* Pill badge */}
    <div className="mx-auto w-fit rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 sm:px-4 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-200">
        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
        <span>Pricing</span>
      </div>
    </div>

    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-300 dark:to-white pb-2">
      {title}
    </h2>
    <p className="text-gray-600 dark:text-gray-300 mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base">
      {subtitle}
    </p>
  </div>
);

const PricingCard = ({
  user,
  userPlan,
  planKey,
  title,
  monthlyPrice,
  isYearly,
  monthlyEquivalent,
  description,
  features,
  actionLabel,
  popular,
  exclusive,
  isFree,
  currentPlan,
  totalMinutes,
  maxSessionDurationMinutes,
  maxSessions,
  getProCheckoutUrl,
  getProCheckoutUrlTest,
}: PricingCardProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Mark component as mounted on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to get checkout URL with correct parameters
  const getCheckoutUrl = async (planKey: string) => {
    if (!isClient) return null;

    // Get the current URL for success redirect
    const successUrl = `${window.location.origin}/success?plan=${planKey}`;

    // Get user email if available
    const email = user?.emailAddresses?.[0]?.emailAddress || "";

    return await getProCheckoutUrl({
      customerEmail: email,
      planKey, // Pass plan key directly, not a fake productPriceId
      successUrl,
      metadata: {
        planKey,
        userId: user?.id || "", // Include userId for webhook processing
      },
    });
  };

  const handleCheckout = async () => {
    if (!isClient) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("Starting checkout process for plan:", planKey);

      // Check if we're in production
      const isProduction =
        window.location.hostname === "www.sereni.day" ||
        window.location.hostname === "sereni.day";

      console.log("Is production environment:", isProduction);
      console.log("Current hostname:", window.location.hostname);

      let checkoutUrl = null;

      // First try the regular function
      try {
        console.log("Attempting main checkout function");
        checkoutUrl = await getCheckoutUrl(planKey);
        console.log("Main checkout function succeeded with URL:", checkoutUrl);
      } catch (mainError) {
        console.error("Failed with main checkout function:", mainError);

        // In production, don't fall back to test function
        if (isProduction) {
          setError(
            "Unable to process checkout. Please try again later or contact support."
          );
          setIsLoading(false);
          return;
        }

        checkoutUrl = null;
      }

      // Only fall back to test function in development environment
      if (!checkoutUrl && !isProduction) {
        try {
          console.log(
            "Falling back to test checkout function (development only)"
          );
          checkoutUrl = await getProCheckoutUrlTest({
            interval: "month",
            planKey,
          });
          console.log(
            "Test checkout function succeeded with URL:",
            checkoutUrl
          );
        } catch (testError) {
          console.error("Test function also failed:", testError);
          setError("Unable to process checkout. Please try again later.");
          setIsLoading(false);
          return;
        }
      }

      if (checkoutUrl) {
        console.log("Redirecting to checkout URL:", checkoutUrl);

        // Verify the URL is valid before redirecting
        try {
          // Check if it's a valid URL
          const url = new URL(checkoutUrl);

          // Check if it contains expected domains
          const validDomains = [
            "polar.sh",
            "sandbox.polar.sh",
            "localhost",
            "sereni.day",
            "ngrok-free.app",
          ];
          const urlDomain = url.hostname;
          const isValidDomain = validDomains.some((domain) =>
            urlDomain.includes(domain)
          );

          if (!isValidDomain) {
            console.warn(
              `Warning: Checkout URL domain ${urlDomain} is not in the list of expected domains`
            );
          }

          // For development environment, handle mock responses properly
          if (process.env.NODE_ENV !== "production") {
            // Check if this is a mock response (contains our success URL as base)
            // This includes both localhost and ngrok URLs going to /success
            const isMockResponse =
              (url.hostname === "localhost" ||
                url.hostname.includes("ngrok-free.app")) &&
              url.pathname.includes("/success");

            if (isMockResponse) {
              // This is expected in development when Polar API is not accessible
              console.log("Development mode: Handling mock checkout response");
              window.location.href = checkoutUrl;
              return;
            }

            // If the URL is not pointing to sandbox.polar.sh and doesn't contain price_id parameter
            if (
              !urlDomain.includes("sandbox.polar.sh") &&
              !url.searchParams.has("price_id") &&
              !isMockResponse
            ) {
              console.error("URL is incorrectly configured for development");
              setError(
                "Checkout configuration error. Please try again later or contact support."
              );
              setIsLoading(false);
              return;
            }
          }

          // Perform the redirect
          window.location.href = checkoutUrl;
        } catch (urlError) {
          console.error("Invalid checkout URL:", urlError);
          setError("Invalid checkout URL. Please try again later.");
        }
      } else {
        setError("Failed to generate checkout URL");
      }
    } catch (error) {
      console.error("Failed to get checkout URL:", error);
      setError("Something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine the button action and text
  const getButtonAction = () => {
    if (!isClient) {
      return {
        text: actionLabel,
        action: () => {},
      };
    }

    if (currentPlan) {
      return {
        text: "Current Plan",
        action: () => {
          // Show toast when user clicks on their current plan
          toast({
            title: "You're already on this plan! 🎉",
            description: `You currently have the ${title} plan. If you purchase this plan again, your minutes will be added to your account.`,
            variant: "default",
          });
        },
      };
    }

    // All plans now require payment - redirect to checkout
    return {
      text: actionLabel,
      action: () => {
        // Quick debug to see if this function is called
        console.log("Button clicked for plan:", planKey);

        if (!user) {
          router.push("/sign-in");
          return;
        }

        // Check if userPlan is still loading
        if (userPlan === undefined) {
          console.log(
            "UserPlan is still loading, allowing purchase to proceed"
          );
        }

        // Debug logging for plan detection
        console.log("Plan purchase attempt:", {
          planKey,
          userPlan,
          userPlanType: typeof userPlan,
          currentPlanKey: userPlan?.currentPlanKey,
          isCurrentPlan: userPlan?.currentPlanKey === planKey,
        });

        // More robust check for current plan
        const currentUserPlanKey = userPlan?.currentPlanKey;
        console.log(
          "Current user plan key:",
          currentUserPlanKey,
          "Target plan:",
          planKey
        );

        // Check if user is trying to purchase their current plan
        if (currentUserPlanKey && currentUserPlanKey === planKey) {
          // Use alert for immediate feedback that won't disappear
          const proceed = window.confirm(
            `You're already subscribed to the ${title} plan!\n\nClicking OK will add more minutes to your account.\nClick Cancel to stay on this page.`
          );

          if (!proceed) {
            console.log("User chose not to proceed with duplicate purchase");
            return;
          }

          console.log("User chose to proceed with adding more minutes");
          // If user confirms, they can proceed to add more minutes
        }

        handleCheckout();
      },
    };
  };

  const buttonConfig = getButtonAction();

  // Note: Users can now purchase multiple plans - minutes will be accumulated
  // Remove prevention system as requested

  return (
    <Card
      className={cn(
        "w-full max-w-sm min-w-[280px] flex flex-col justify-between px-4 py-6 sm:px-6 md:px-8",
        {
          "relative border-2 border-blue-500 dark:border-blue-400": popular,
          "shadow-2xl bg-gradient-to-b from-gray-900 to-gray-800 text-white":
            exclusive,
          "border-green-500 dark:border-green-400": currentPlan && !popular,
        }
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-blue-500 dark:bg-blue-400 px-3 py-1">
          <p className="text-xs sm:text-sm font-medium text-white">
            Most Popular
          </p>
        </div>
      )}

      {currentPlan && !popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-green-500 dark:bg-green-400 px-3 py-1">
          <p className="text-xs sm:text-sm font-medium text-white">
            Current Plan
          </p>
        </div>
      )}

      <div>
        <CardHeader className="space-y-2 pb-4 text-center">
          <CardTitle className="text-xl sm:text-2xl font-bold capitalize">
            {title}
          </CardTitle>
          <CardDescription
            className={cn("text-sm sm:text-base", {
              "text-gray-300": exclusive,
            })}
          >
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-4">
          <div className="flex items-baseline justify-center gap-1">
            <span
              className={cn("text-3xl sm:text-4xl md:text-5xl font-bold", {
                "text-white": exclusive,
              })}
            >
              ${monthlyPrice}
            </span>
            <span
              className={cn("text-muted-foreground text-sm", {
                "text-gray-300": exclusive,
              })}
            >
              {isYearly ? "/year" : "/month"}
            </span>
          </div>

          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
            {/* Display features */}
            {features.map((feature) => (
              <div key={feature} className="flex gap-2 sm:gap-3">
                <CheckCircle2
                  className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-0.5",
                    {
                      "text-blue-400": exclusive,
                    }
                  )}
                />
                <p
                  className={cn("text-sm sm:text-base", {
                    "text-gray-300": exclusive,
                  })}
                >
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </div>

      <CardFooter className="pt-2">
        {error && (
          <div className="w-full mb-4">
            <p className="text-red-500 text-sm font-medium">{error}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Please try again or contact support if the issue persists.
            </p>
          </div>
        )}
        <Button
          onClick={buttonConfig.action}
          disabled={isLoading || currentPlan}
          className={cn("w-full py-4 sm:py-6 text-sm sm:text-lg", {
            "bg-blue-600 hover:bg-blue-500": popular, // Serene plan (popular)
            "bg-white text-gray-900 hover:bg-gray-100": exclusive, // Tranquil plan (exclusive)
            "bg-gray-800 hover:bg-gray-700 text-white":
              !popular && !exclusive && !currentPlan, // Calm plan (default)
            "bg-green-600 hover:bg-green-600 cursor-default": currentPlan,
          })}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            buttonConfig.text
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Create a client-only wrapper for Convex hooks
function PricingCardWithHooks(props: PricingCardProps) {
  const getProCheckoutUrl = useAction(
    api.subscriptions.getOnboardingCheckoutUrl
  );
  const getProCheckoutUrlTest = useAction(
    api.subscriptions.getProOnboardingCheckoutUrlTest
  );

  return (
    <PricingCard
      {...props}
      getProCheckoutUrl={getProCheckoutUrl}
      getProCheckoutUrlTest={getProCheckoutUrlTest}
    />
  );
}

// Use dynamic import for the pricing card
const DynamicPricingCard = dynamic(
  () => Promise.resolve(PricingCardWithHooks),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

function PricingContent() {
  const { user } = useUser();
  const plans = useQuery(api.plans.getPlans) || [];
  const userPlan = useQuery(api.users.getCurrentUserRecord);

  // Note: Multiple plan purchases now accumulate minutes

  // Show all plans in a specific order: monthly, yearly
  const planOrder = ["monthly", "yearly"];
  const sortedPlans = plans.sort((a, b) => {
    const indexA = planOrder.indexOf(a.key);
    const indexB = planOrder.indexOf(b.key);
    return indexA - indexB;
  });

  return (
    <div className="w-full flex justify-center px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full place-items-center justify-items-center">
        {sortedPlans.map((plan: Doc<"plans">) => {
          const isPopular = plan.key === "yearly"; // Mark yearly plan as popular (with discount)
          const isCurrentPlan =
            typeof userPlan === "object" &&
            userPlan !== null &&
            "currentPlanKey" in userPlan
              ? userPlan.currentPlanKey === plan.key
              : false;

          // Calculate price display based on plan type
          const isYearly = plan.key === "yearly";
          const displayPrice = isYearly
            ? (plan.prices?.year?.usd?.amount || 0) / 100 // Yearly price
            : (plan.prices?.month?.usd?.amount || 0) / 100; // Monthly price

          // For yearly plan, also calculate monthly equivalent for comparison
          const monthlyEquivalent = isYearly ? displayPrice / 12 : displayPrice;

          return (
            <div key={plan.key} className="w-full max-w-sm">
              <DynamicPricingCard
                user={user}
                userPlan={userPlan}
                planKey={plan.key}
                title={plan.name}
                monthlyPrice={displayPrice}
                isYearly={isYearly}
                monthlyEquivalent={monthlyEquivalent}
                description={plan.description}
                features={plan.features || []}
                actionLabel={isCurrentPlan ? "Current Plan" : "Start therapy"}
                popular={isPopular}
                exclusive={false} // No exclusive plans in new structure
                isFree={false}
                currentPlan={isCurrentPlan}
                totalMinutes={plan.totalMinutes}
                maxSessionDurationMinutes={plan.maxSessionDurationMinutes}
                maxSessions={plan.maxSessions}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Use dynamic import for the entire pricing content
const DynamicPricingContent = dynamic(() => Promise.resolve(PricingContent), {
  ssr: false,
  loading: () => <div>Loading pricing plans...</div>,
});

export default function Pricing() {
  return (
    <section className="w-full py-12" id="pricing">
      <div className="container mx-auto px-4">
        <PricingHeader
          title="Simple, Transparent Pricing"
          subtitle="Choose the plan that best fits your needs. All plans include our core features."
        />
        <DynamicPricingContent />
      </div>
    </section>
  );
}
