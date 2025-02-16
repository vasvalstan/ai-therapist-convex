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

  const getProCheckoutUrl = useAction(api.subscriptions.getProOnboardingCheckoutUrl);
  const subscriptionStatus = useQuery(api.subscriptions.getUserSubscriptionStatus);

  const handleCheckout = async (interval: "month" | "year") => {
    try {
      const checkoutProUrl = await getProCheckoutUrl({
        interval
      });

      if (checkoutProUrl) {
        window.location.href = checkoutProUrl;
      }
    } catch (error) {
      console.error("Failed to get checkout URL:", error);
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
        <Button
          onClick={() => {
            if (!user) {
              router.push("/sign-in");
              return;
            }
            handleCheckout("month")
          }}
          className={cn("w-full py-6 text-lg", {
            "bg-blue-600 hover:bg-blue-500": popular,
            "bg-white text-gray-900 hover:bg-gray-100": exclusive,
          })}
        >
          {actionLabel}
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
        "8 sessions/month",
        "20min session duration",
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
