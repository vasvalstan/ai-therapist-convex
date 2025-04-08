import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { MessageCircle, FileText, BarChart2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

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
      router.push(`${pathname}?tab=chat`);
    }
  }, [isOnSpecificChatPage, pathname, router, searchParams, chatId]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    // If we're already on the selected tab, don't do anything to avoid unnecessary navigation
    if (value === currentTab) {
      return;
    }
    
    if (value === "history") {
      router.push("/chat/history");
    } else if (value === "start") {
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
    } else if (value === "transcript" && isOnSpecificChatPage) {
      router.push(`${pathname}?tab=transcript`);
    } else if (value === "emotions" && isOnSpecificChatPage) {
      router.push(`${pathname}?tab=emotions`);
    }
  };

  const NavButton = ({ value, icon: Icon, children }: { value: string; icon: any; children: React.ReactNode }) => {
    const isActive = currentTab === value || (!currentTab && value === "history");
    return (
      <button
        onClick={() => handleTabChange(value)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {children}
      </button>
    );
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2 w-full">
          <NavButton value="history" icon={Home}>
            Chat History
          </NavButton>
          
          <NavButton value="start" icon={MessageCircle}>
            Start New Chat
          </NavButton>
          
          <NavButton value="progress" icon={BarChart2}>
            Therapy Progress
          </NavButton>

          {isOnSpecificChatPage && (
            <>
              <NavButton value="chat" icon={MessageCircle}>
                Current Chat
              </NavButton>
              
              <NavButton value="transcript" icon={FileText}>
                Transcript
              </NavButton>
              
              <NavButton value="emotions" icon={BarChart2}>
                Emotions
              </NavButton>
            </>
          )}

          {title && (
            <div className="ml-auto text-sm font-medium truncate max-w-[200px]">{title}</div>
          )}
        </div>
      </div>
    </div>
  );
} 