"use client";

import { AccordionComponent } from "@/components/homepage/accordion-component";
import Pricing from "@/components/homepage/pricing";
import PageWrapper from "@/components/wrapper/page-wrapper";
import { motion } from "framer-motion";
import { Check, DollarSign, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  const features = [
    "Empathetic AI Therapy",
    "Voice Conversations",
    "Secure & Private",
    "Available 24/7",
    "Session History",
    "Emotional Analysis",
    "No Judgment",
    "Personalized Experience",
  ];

  return (
    <PageWrapper>
      <div className="container mx-auto px-4">
        <section className="relative flex flex-col items-center justify-center py-20">
          {/* Background gradient */}
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 dark:bg-blue-500 opacity-20 blur-[100px]"></div>
          </div>

          <div className="space-y-6 text-center">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-fit rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 px-4 py-1 mb-6"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                <DollarSign className="h-4 w-4" />
                <span>Simple, Transparent Pricing</span>
              </div>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-300 dark:to-white animate-gradient-x pb-2"
            >
              Choose Your Plan
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
            >
              Start your journey with our powerful AI therapy service with
              flexible subscription options
            </motion.p>
          </div>
        </section>

        <section className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-300 dark:to-white">
                Everything You Need
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Our AI therapy service comes packed with all the essential
                features you need for meaningful conversations. No more wasting
                time on repetitive therapy sessions.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="py-8">
            <Pricing />
          </div>
        </section>

        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Sereni?</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our AI therapy service provides a unique combination of
              accessibility, privacy, and personalized support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              title="Available Anytime"
              description="Get support whenever you need it, without scheduling appointments or waiting for availability."
            />
            <FeatureCard
              title="Complete Privacy"
              description="Share your thoughts in a completely private environment with no human judgment."
            />
            <FeatureCard
              title="Affordable Therapy"
              description="Access quality therapeutic conversations at a fraction of the cost of traditional therapy."
            />
            <FeatureCard
              title="Consistent Experience"
              description="Every session provides the same high-quality, empathetic experience without variability."
            />
          </div>
        </section>

        <section className="pb-20">
          <AccordionComponent />
        </section>
      </div>
    </PageWrapper>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-lg mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}
