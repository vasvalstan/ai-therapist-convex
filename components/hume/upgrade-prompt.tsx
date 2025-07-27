import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { FeedbackForm } from "./feedback-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface UpgradePromptProps {
  reason: string;
  chatId?: string;
}

export function UpgradePrompt({ reason, chatId }: UpgradePromptProps) {
  const router = useRouter();
  const plans = useQuery(api.plans.getPlans);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upgrade");

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Navigate to pricing page with chat ID in query params
      router.push(`/pricing${chatId ? `?chatId=${chatId}` : ""}`);
    } catch (error) {
      console.error("Error navigating to pricing:", error);
      toast({
        title: "Error",
        description: "Failed to navigate to pricing page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[80vh]">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Time Limit Reached
          </CardTitle>
          <CardDescription>Your conversation has been saved</CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upgrade">
            <CardContent>
              <p className="mb-4 text-center">{reason}</p>
              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span>Monthly plan: $18.79/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Yearly plan: $120/year + founder access</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/pricing" className="w-full max-w-xs">
                <Button
                  className="w-full"
                  onClick={handleUpgrade}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              </Link>
            </CardFooter>
          </TabsContent>

          <TabsContent value="feedback">
            <CardContent>
              <FeedbackForm sessionId={chatId} source="trial_end" />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
