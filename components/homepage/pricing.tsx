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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { CheckCircle2, DollarSign } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PricingSwitchProps = {
  onSwitch: (value: string) => void;
};

type PricingCardProps = {
  user: any;
  isYearly?: boolean;
  title: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  description: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  exclusive?: boolean;
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

const PricingSwitch = ({ onSwitch }: PricingSwitchProps) => (
  <div className="flex justify-center items-center gap-3">
    <Tabs defaultValue="0" className="w-[400px]" onValueChange={onSwitch}>
      <TabsList className="w-full">
        <TabsTrigger value="0" className="w-full">
          Monthly
        </TabsTrigger>
        <TabsTrigger value="1" className="w-full">
          Yearly
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
);

const PricingCard = ({
  user,
  isYearly,
  title,
  monthlyPrice,
  yearlyPrice,
  description,
  features,
  actionLabel,
  popular,
  exclusive,
}: PricingCardProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProCheckoutUrl = useAction(api.subscriptions.getProOnboardingCheckoutUrl);
  const getProCheckoutUrlTest = useAction(api.subscriptions.getProOnboardingCheckoutUrlTest);
  const subscriptionStatus = useQuery(api.subscriptions.getUserSubscriptionStatus);

  const handleCheckout = async (interval: "month" | "year") => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting checkout process for interval:", interval);
      
      let checkoutUrl = null;
      
      // First try the regular function
      try {
        console.log("Attempting main checkout function");
        checkoutUrl = await getProCheckoutUrl({
          interval
        });
        console.log("Main checkout function succeeded");
      } catch (mainError) {
        console.error("Failed with main checkout function:", mainError);
        checkoutUrl = null;
      }
      
      // If that fails, try the test function
      if (!checkoutUrl) {
        try {
          console.log("Falling back to test checkout function");
          checkoutUrl = await getProCheckoutUrlTest({
            interval
          });
          console.log("Test checkout function succeeded");
        } catch (testError) {
          console.error("Test function also failed:", testError);
          setError("Unable to process checkout. Please try again later.");
          return;
        }
      }

      if (checkoutUrl) {
        console.log("Redirecting to checkout URL:", checkoutUrl);
        window.location.href = checkoutUrl;
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

  return (
    <Card
      className={cn("w-full max-w-sm flex flex-col justify-between px-8 py-6", {
        "relative border-2 border-blue-500 dark:border-blue-400": popular,
        "shadow-2xl bg-gradient-to-b from-gray-900 to-gray-800 text-white":
          exclusive,
      })}
    >
      {popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-blue-500 dark:bg-blue-400 px-3 py-1">
          <p className="text-sm font-medium text-white">Most Popular</p>
        </div>
      )}

      <div>
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
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
            <span
              className={cn("text-5xl font-bold", {
                "text-white": exclusive,
              })}
            >
              ${isYearly ? yearlyPrice : monthlyPrice}
            </span>
            <span
              className={cn("text-muted-foreground", {
                "text-gray-300": exclusive,
              })}
            >
              /month
            </span>
          </div>

          <div className="mt-8 space-y-4">
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
          onClick={() => {
            if (!user) {
              router.push("/sign-in");
              return;
            }
            handleCheckout(isYearly ? "year" : "month");
          }}
          disabled={isLoading}
          className={cn("w-full py-6 text-lg", {
            "bg-blue-600 hover:bg-blue-500": popular,
            "bg-white text-gray-900 hover:bg-gray-100": exclusive,
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
          ) : actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function Pricing() {
  const [isYearly, setIsYearly] = useState<boolean>(false);
  const togglePricingPeriod = (value: string) =>
    setIsYearly(parseInt(value) === 1);
  const { user } = useUser();

  const plans = [
    {
      title: "plus",
      monthlyPrice: 12,
      yearlyPrice: 120,
      description: "all the yapping you need, but on a student budget.",
      features: [
        "6 sessions/month",
        "10min session duration",
        "super empathetic ai voice model",
        "extended session history",
        "sneak peek at beta features"
      ],
      actionLabel: "upgrade to plus",
    },
    {
      title: "pro",
      monthlyPrice: 20,
      yearlyPrice: 200,
      description: "for when you've got a lot more on your mind.",
      features: [
        "all in plus, plus...",
        "20 sessions/month",
        "30min session duration",
        "direct support straight from the soul devs team"
      ],
      actionLabel: "upgrade to pro",
      popular: true
    }
  ];

  return (
    <section className="px-4 py-24">
      <div className="max-w-7xl mx-auto">
        <PricingHeader
          title="upgrade your plan"
          subtitle="unlimited access. cancel anytime"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-center gap-8 mt-10"
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.title}
              user={user}
              {...plan}
              isYearly={isYearly}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
