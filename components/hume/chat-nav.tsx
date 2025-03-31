import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ChatNavProps {
  title?: string;
}

export function ChatNav({ title }: ChatNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Check if we're on a specific chat page (not the history page)
  const isOnSpecificChatPage = pathname && pathname !== "/chat/history" && pathname.startsWith("/chat/");
  
  // Get the current chat ID from the URL
  const chatId = isOnSpecificChatPage ? pathname?.split('/chat/')[1]?.split('?')[0] : null;
  
  // Get the current tab, defaulting to "chat" if we're on a specific chat page,
  // otherwise default to "start"
  const currentTab = searchParams?.get("tab") || (isOnSpecificChatPage ? "chat" : "start");
  
  // If we're on a specific chat page and no tab is specified, default to "chat" tab
  useEffect(() => {
    if (isOnSpecificChatPage && !searchParams?.get("tab")) {
      // Force navigation to the chat tab to ensure the chat content is displayed
      console.log(`Redirecting to chat tab for ${chatId}`);
      router.push(`${pathname}?tab=chat`);
    }
  }, [isOnSpecificChatPage, pathname, router, searchParams, chatId]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    // Current state logging to help with debugging
    console.log("Tab change:", { 
      from: currentTab, 
      to: value, 
      isOnSpecificChatPage, 
      chatId, 
      pathname 
    });
    
    // If we're already on the selected tab, don't do anything to avoid unnecessary navigation
    if (value === currentTab) {
      return;
    }
    
    if (value === "start") {
      // Going to start tab - always go to history page first
      router.push("/chat/history?tab=start");
    } else if (value === "progress") {
      // For progress tab, stay on current page but update tab
      router.push(`${isOnSpecificChatPage ? pathname : "/chat/history"}?tab=progress`);
    } else if (value === "chat") {
      if (isOnSpecificChatPage) {
        // For chat tab on specific chat page
        router.push(`${pathname}?tab=chat`);
      } else {
        // If not on a specific chat page, redirect to chat history
        router.push("/chat/history");
      }
    } else if (value === "transcript" || value === "emotions") {
      // These tabs are only applicable for specific chat pages
      if (isOnSpecificChatPage) {
        router.push(`${pathname}?tab=${value}`);
      } else {
        // If not on a specific chat, first go to chat history
        router.push("/chat/history");
      }
    }
  };

  return (
    <div className="border-b">
      <div className="flex justify-between items-center px-4">
        <TabsList className="w-full justify-start rounded-none">
          <TabsTrigger value="start" onClick={() => handleTabChange("start")}>Start New Chat</TabsTrigger>
          <TabsTrigger value="progress" onClick={() => handleTabChange("progress")}>Therapy Progress</TabsTrigger>
          {isOnSpecificChatPage && (
            <>
              <TabsTrigger value="chat" onClick={() => handleTabChange("chat")}>Current Chat</TabsTrigger>
              <TabsTrigger value="transcript" onClick={() => handleTabChange("transcript")}>Transcript</TabsTrigger>
              <TabsTrigger value="emotions" onClick={() => handleTabChange("emotions")}>Emotions</TabsTrigger>
            </>
          )}
        </TabsList>
        {title && (
          <div className="text-sm font-medium truncate max-w-[200px]">{title}</div>
        )}
      </div>
    </div>
  );
} 