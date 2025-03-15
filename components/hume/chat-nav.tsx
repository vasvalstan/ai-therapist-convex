import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ChatNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = searchParams?.get("tab") || "start";
  
  // Check if we're on a specific chat page (not the history page)
  const isOnSpecificChatPage = pathname && pathname !== "/chat/history" && pathname.startsWith("/chat/");
  
  // If we're on a specific chat page and no tab is specified, default to "chat" tab
  useEffect(() => {
    if (isOnSpecificChatPage && !searchParams?.get("tab")) {
      router.push(`${pathname}?tab=chat`);
    }
  }, [isOnSpecificChatPage, pathname, router, searchParams]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    // If we're already on the chat tab and on a specific chat page, don't do anything
    if (value === "chat" && isOnSpecificChatPage && currentTab === "chat") {
      return;
    }
    
    if (value === "start") {
      // If we're on a specific chat page and trying to go to "start" tab,
      // redirect to the history page with start tab
      if (isOnSpecificChatPage) {
        router.push("/chat/history?tab=start");
      } else {
        router.push("/chat/history?tab=start");
      }
    } else if (value === "progress") {
      // For progress tab, stay on current page but update tab
      if (isOnSpecificChatPage) {
        router.push(`${pathname}?tab=progress`);
      } else {
        router.push("/chat/history?tab=progress");
      }
    } else if (value === "chat") {
      // For chat tab, only applicable on specific chat pages
      if (isOnSpecificChatPage) {
        router.push(`${pathname}?tab=chat`);
      }
    }
  };

  return (
    <div className="border-b">
      <TabsList className="w-full justify-start rounded-none px-4">
        <TabsTrigger value="start" onClick={() => handleTabChange("start")}>Start New Chat</TabsTrigger>
        <TabsTrigger value="progress" onClick={() => handleTabChange("progress")}>Therapy Progress</TabsTrigger>
        {isOnSpecificChatPage && (
          <TabsTrigger value="chat" onClick={() => handleTabChange("chat")}>Current Chat</TabsTrigger>
        )}
      </TabsList>
    </div>
  );
} 