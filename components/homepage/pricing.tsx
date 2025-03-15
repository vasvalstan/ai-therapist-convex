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

type PricingCardProps = {
  user: {
    emailAddresses?: Array<{ emailAddress: string }>;
    id?: string;
  } | null | undefined;
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
  const [isClient, setIsClient] = useState(false);

  // Move Convex hooks into useEffect to ensure they only run on client
  const getProCheckoutUrl = useAction(api.subscriptions.getOnboardingCheckoutUrl);
  const getProCheckoutUrlTest = useAction(api.subscriptions.getProOnboardingCheckoutUrlTest);

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
    const email = user?.emailAddresses?.[0]?.emailAddress || '';
    
    // Get product price ID based on plan key
    const productPriceId = `price_${planKey}_monthly`; // Adjust this based on your actual price IDs
    
    return await getProCheckoutUrl({
      customerEmail: email,
      productPriceId,
      successUrl,
      metadata: { planKey }
    });
  };

  const handleCheckout = async () => {
    if (!isClient) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting checkout process for plan:", planKey);
      
      // Check if we're in production
      const isProduction = window.location.hostname === 'www.sereni.day' || 
                          window.location.hostname === 'sereni.day';
      
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
          setError("Unable to process checkout. Please try again later or contact support.");
          setIsLoading(false);
          return;
        }
        
        checkoutUrl = null;
      }
      
      // Only fall back to test function in development environment
      if (!checkoutUrl && !isProduction) {
        try {
          console.log("Falling back to test checkout function (development only)");
          checkoutUrl = await getProCheckoutUrlTest({
            interval: "month",
            planKey
          });
          console.log("Test checkout function succeeded with URL:", checkoutUrl);
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
    if (!isClient) {
      return {
        text: actionLabel,
        action: () => {}
      };
    }

    if (isFree) {
      return {
        text: "Get Started Free",
        action: () => router.push("/sign-up")
      };
    }
    
    if (currentPlan) {
      return {
        text: "Current Plan",
        action: () => router.push("/")
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
                  {isFree ? "Unlimited" : totalMinutes} minutes total
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
                  {isFree ? "Unlimited" : maxSessionDurationMinutes} min per session
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
                  {isFree ? "Unlimited" : maxSessions} sessions total
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

// Create a dynamic version of the Pricing component
function PricingContent() {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <PricingHeader
        title="Simple, transparent pricing"
        subtitle="Choose the plan that best fits your needs."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2"
      >
        {/* Free Plan */}
        <PricingCard
          user={user}
          planKey="free"
          title="Free"
          description="Perfect for trying out our service"
          features={[
            "5 minutes per session",
            "1 session per day",
            "Basic emotion analysis",
            "Text chat only",
          ]}
          actionLabel="Get Started Free"
          isFree={true}
          totalMinutes={5}
          maxSessionDurationMinutes={5}
          maxSessions={1}
        />

        {/* Pro Plan */}
        <PricingCard
          user={user}
          planKey="pro"
          title="Pro"
          monthlyPrice={9.99}
          description="For users who want the full experience"
          features={[
            "60 minutes per session",
            "Unlimited sessions",
            "Advanced emotion analysis",
            "Voice chat",
            "Priority support",
          ]}
          actionLabel="Get Pro"
          popular={true}
          totalMinutes={60}
          maxSessionDurationMinutes={60}
          maxSessions={-1}
        />
      </motion.div>
    </div>
  );
}

// Use dynamic import with SSR disabled
const DynamicPricing = dynamic(() => Promise.resolve(PricingContent), {
  ssr: false,
});

export default function Pricing() {
  return <DynamicPricing />;
}
