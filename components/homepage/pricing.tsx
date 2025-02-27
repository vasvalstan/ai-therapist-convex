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
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type PricingCardProps = {
  user: any;
  planKey: string;
  title: string;
  monthlyPrice?: number;
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
};

const PricingHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="text-center mb-10">
    {/* Pill badge */}
    <div className="mx-auto w-fit rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 px-4 py-1 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
        <DollarSign className="h-4 w-4" />
        <span>Pricing</span>
      </div>
    </div>

    <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-300 dark:to-white pb-2">
      {title}
    </h2>
    <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-2xl mx-auto">
      {subtitle}
    </p>
  </div>
);

const PricingCard = ({
  user,
  planKey,
  title,
  monthlyPrice,
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
}: PricingCardProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProCheckoutUrl = useAction(api.subscriptions.getProOnboardingCheckoutUrl);
  const getProCheckoutUrlTest = useAction(api.subscriptions.getProOnboardingCheckoutUrlTest);
  const subscriptionStatus = useQuery(api.subscriptions.getUserSubscriptionStatus);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting checkout process for plan:", planKey);
      
      let checkoutUrl = null;
      
      // First try the regular function
      try {
        console.log("Attempting main checkout function");
        checkoutUrl = await getProCheckoutUrl({
          interval: "month",
          planKey
        });
        console.log("Main checkout function succeeded with URL:", checkoutUrl);
        
        // Verify the URL contains sandbox.polar.sh for development environment
        if (checkoutUrl && !checkoutUrl.includes('sandbox.polar.sh')) {
          console.warn("Warning: Checkout URL does not contain sandbox.polar.sh domain:", checkoutUrl);
        }
      } catch (mainError) {
        console.error("Failed with main checkout function:", mainError);
        checkoutUrl = null;
      }
      
      // If that fails, try the test function
      if (!checkoutUrl) {
        try {
          console.log("Falling back to test checkout function");
          checkoutUrl = await getProCheckoutUrlTest({
            interval: "month",
            planKey
          });
          console.log("Test checkout function succeeded with URL:", checkoutUrl);
        } catch (testError) {
          console.error("Test function also failed:", testError);
          setError("Unable to process checkout. Please try again later.");
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
          const validDomains = ["polar.sh", "sandbox.polar.sh", "localhost", "sereni.day", "ngrok-free.app"];
          const urlDomain = url.hostname;
          const isValidDomain = validDomains.some(domain => urlDomain.includes(domain));
          
          if (!isValidDomain) {
            console.warn(`Warning: Checkout URL domain ${urlDomain} is not in the list of expected domains`);
          }
          
          // For development environment, ensure we're redirecting to sandbox.polar.sh
          if (process.env.NODE_ENV !== 'production') {
            // If the URL is not pointing to sandbox.polar.sh and doesn't contain price_id parameter
            if (!urlDomain.includes('sandbox.polar.sh') && !url.searchParams.has('price_id')) {
              console.error("URL is incorrectly redirecting directly to success URL");
              setError("Checkout configuration error. Please try again later or contact support.");
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
    if (isFree) {
      return {
        text: "Get Started Free",
        action: () => router.push("/sign-up")
      };
    }
    
    if (currentPlan) {
      return {
        text: "Current Plan",
        action: () => router.push("/dashboard")
      };
    }
    
    return {
      text: actionLabel,
      action: () => {
        if (!user) {
          router.push("/sign-in");
          return;
        }
        handleCheckout();
      }
    };
  };
  
  const buttonConfig = getButtonAction();

  return (
    <Card
      className={cn("w-full max-w-sm flex flex-col justify-between px-8 py-6", {
        "relative border-2 border-blue-500 dark:border-blue-400": popular,
        "shadow-2xl bg-gradient-to-b from-gray-900 to-gray-800 text-white": exclusive,
        "border-green-500 dark:border-green-400": currentPlan && !popular,
      })}
    >
      {popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-blue-500 dark:bg-blue-400 px-3 py-1">
          <p className="text-sm font-medium text-white">Most Popular</p>
        </div>
      )}
      
      {currentPlan && !popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-green-500 dark:bg-green-400 px-3 py-1">
          <p className="text-sm font-medium text-white">Current Plan</p>
        </div>
      )}

      <div>
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-2xl font-bold capitalize">{title}</CardTitle>
          <CardDescription
            className={cn("text-base", {
              "text-gray-300": exclusive,
            })}
          >
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-4">
          <div className="flex items-baseline gap-1">
            {isFree ? (
              <span className="text-5xl font-bold">Free</span>
            ) : (
              <>
                <span
                  className={cn("text-5xl font-bold", {
                    "text-white": exclusive,
                  })}
                >
                  ${monthlyPrice}
                </span>
                <span
                  className={cn("text-muted-foreground", {
                    "text-gray-300": exclusive,
                  })}
                >
                  /month
                </span>
              </>
            )}
          </div>

          <div className="mt-8 space-y-4">
            {/* Display plan details */}
            {totalMinutes && (
              <div className="flex gap-3">
                <Sparkles className={cn("h-5 w-5 text-blue-500", {
                  "text-blue-400": exclusive,
                })} />
                <p className={cn("text-base", {
                  "text-gray-300": exclusive,
                })}>
                  {totalMinutes} minutes total
                </p>
              </div>
            )}
            
            {maxSessionDurationMinutes && (
              <div className="flex gap-3">
                <Sparkles className={cn("h-5 w-5 text-blue-500", {
                  "text-blue-400": exclusive,
                })} />
                <p className={cn("text-base", {
                  "text-gray-300": exclusive,
                })}>
                  {maxSessionDurationMinutes} min per session
                </p>
              </div>
            )}
            
            {maxSessions && (
              <div className="flex gap-3">
                <Sparkles className={cn("h-5 w-5 text-blue-500", {
                  "text-blue-400": exclusive,
                })} />
                <p className={cn("text-base", {
                  "text-gray-300": exclusive,
                })}>
                  {maxSessions} sessions total
                </p>
              </div>
            )}
            
            {/* Display features */}
            {features.map((feature) => (
              <div key={feature} className="flex gap-3">
                <CheckCircle2
                  className={cn("h-5 w-5 text-blue-500", {
                    "text-blue-400": exclusive,
                  })}
                />
                <p
                  className={cn("text-base", {
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

      <CardFooter>
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
          className={cn("w-full py-6 text-lg", {
            "bg-blue-600 hover:bg-blue-500": popular,
            "bg-white text-gray-900 hover:bg-gray-100": exclusive,
            "bg-green-600 hover:bg-green-500": isFree && !popular && !exclusive,
            "bg-green-600 hover:bg-green-600 cursor-default": currentPlan,
          })}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : buttonConfig.text}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function Pricing() {
  const { user } = useUser();
  
  // Fetch plans from the database
  const plans = useQuery(api.plans.getAllPlans);
  
  // Fetch current user's plan if logged in
  const currentUser = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  
  // If plans are still loading, show a loading state
  if (!plans) {
    return (
      <section className="px-4 py-24">
        <div className="max-w-7xl mx-auto">
          <PricingHeader
            title="choose your plan"
            subtitle="find the perfect plan for your needs"
          />
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading plans...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  // Sort plans by price (free first, then by price)
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.key === "free") return -1;
    if (b.key === "free") return 1;
    
    const aPrice = a.prices.month?.usd?.amount || 0;
    const bPrice = b.prices.month?.usd?.amount || 0;
    return aPrice - bPrice;
  });

  return (
    <section className="px-4 py-24">
      <div className="max-w-7xl mx-auto">
        <PricingHeader
          title="choose your plan"
          subtitle="find the perfect plan for your needs"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-center gap-8 mt-10"
        >
          {sortedPlans.map((plan) => {
            // Calculate price in dollars
            const monthlyPrice = plan.prices.month?.usd?.amount ? plan.prices.month.usd.amount / 100 : 0;
            
            // Check if this is the user's current plan
            const isCurrentPlan = currentUser?.currentPlanKey === plan.key;
            
            return (
              <PricingCard
                key={plan.key}
                user={user}
                planKey={plan.key}
                title={plan.name}
                description={plan.description}
                monthlyPrice={monthlyPrice}
                features={plan.features || []}
                actionLabel={`Upgrade to ${plan.key}`}
                popular={plan.key === "basic"}
                exclusive={plan.key === "premium"}
                isFree={plan.key === "free"}
                currentPlan={isCurrentPlan}
                totalMinutes={plan.totalMinutes}
                maxSessionDurationMinutes={plan.maxSessionDurationMinutes}
                maxSessions={plan.maxSessions}
              />
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
