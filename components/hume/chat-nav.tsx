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
      router.push("/chat/history?tab=start");
    } else if (value === "progress") {
      // For progress tab, stay on current page but update tab
      if (isOnSpecificChatPage) {
        router.push(`${pathname}?tab=progress`);
      } else {
        router.push("/chat/history?tab=progress");
      }
    } else if (value === "chat" && isOnSpecificChatPage) {
      // For chat tab, only applicable on specific chat pages
      router.push(`${pathname}?tab=chat`);
    } else if (value === "transcript" && isOnSpecificChatPage) {
      // For transcript tab
      router.push(`${pathname}?tab=transcript`);
    } else if (value === "emotions" && isOnSpecificChatPage) {
      // For emotions tab
      router.push(`${pathname}?tab=emotions`);
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