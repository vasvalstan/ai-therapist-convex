'use client';

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, BarChart2, Home, Menu, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface ChatNavProps {
  title?: string;
}

export function ChatNav({ title }: ChatNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  
  // Get the current tab, defaulting to "start"
  const currentTab = searchParams?.get("tab") || "start";
  
  // Get session ID from pathname if we're on a chat page
  const pathSegments = pathname.split('/');
  const onChatPage = pathname.startsWith('/chat/') && pathSegments.length >= 3 && pathSegments[2] !== 'history';
  const sessionId = onChatPage ? pathSegments[2] : null;
  
  // Fetch conversation title if on a chat page
  const conversation = useQuery(api.chat.getActiveConversation, 
    sessionId ? { chatId: sessionId } : "skip"
  );
  
  // Determine the display title
  const displayTitle = onChatPage && conversation ? 
    (conversation.title || "Conversation") : title || "Sereni";
  
  // Set initial active button based on route
  useEffect(() => {
    if (onChatPage) {
      setActiveButton("history");
    } else if (pathname === "/chat/history") {
      if (currentTab === "progress") {
        setActiveButton("progress");
      } else if (currentTab === "start") {
        setActiveButton("new-chat");
      } else if (currentTab === "history") {
        setActiveButton("history");
      } else {
        setActiveButton("home");
      }
    } else {
      setActiveButton("home");
    }
  }, [pathname, currentTab, onChatPage]);
  
  // Handle tab changes
  const handleTabChange = (value: string) => {
    // Set active button
    setActiveButton(value);
    
    // Close mobile menu when navigating
    setMobileMenuOpen(false);
    
    // Handle navigation based on the selected tab
    switch (value) {
      case "home":
        router.push("/");
        break;
      case "new-chat":
        router.push("/chat/history?tab=start");
        break;
      case "history":
        router.push("/chat/history?tab=history");
        break;
      case "progress":
        router.push("/chat/history?tab=progress");
        break;
      case "feedback":
        router.push("/chat/history?tab=feedback");
        break;
    }
  };

  const NavButton = ({ value, icon: Icon, children, isMobile = false }: { 
    value: string; 
    icon: any; 
    children: React.ReactNode;
    isMobile?: boolean;
  }) => {
    // Button is active if it matches the active button state
    const isActive = activeButton === value;
    
    return (
      <button
        onClick={() => handleTabChange(value)}
        className={cn(
          "flex items-center gap-1.5 transition-colors",
          isMobile ? "py-1.5 px-3 text-xs whitespace-nowrap" : "px-3 py-2 rounded-full text-sm font-medium",
          isActive 
            ? isMobile 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary text-primary-foreground" 
            : isMobile 
              ? "text-foreground hover:bg-muted" 
              : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {children}
      </button>
    );
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-[100]">
      {/* Mobile navigation */}
      <div className="flex lg:hidden items-center justify-between h-12 px-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        
        <div className="text-base font-medium truncate">
          {displayTitle}
        </div>
        
        <div className="w-8"></div> {/* Empty space for alignment */}
      </div>
      
      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-12 left-0 right-0 bg-background border-b z-[100] shadow-lg overflow-x-auto">
          <div className="flex p-1.5 space-x-1.5">
            <NavButton value="home" icon={Home} isMobile>
              Home
            </NavButton>
            <NavButton value="new-chat" icon={MessageCircle} isMobile>
              New Chat
            </NavButton>
            <NavButton value="history" icon={MessageCircle} isMobile>
              Chat History
            </NavButton>
            <NavButton value="progress" icon={BarChart2} isMobile>
              Therapy Progress
            </NavButton>
            <NavButton value="feedback" icon={Send} isMobile>
              Feedback
            </NavButton>
          </div>
        </div>
      )}
      
      {/* Desktop navigation */}
      <div className="hidden lg:flex h-14 items-center px-4">
        <div className="flex items-center gap-1 mr-auto">
          <NavButton value="home" icon={Home}>
            Home
          </NavButton>
          
          <NavButton value="new-chat" icon={MessageCircle}>
            New Chat
          </NavButton>
          
          <NavButton value="history" icon={MessageCircle}>
            Chat History
          </NavButton>
          
          <NavButton value="progress" icon={BarChart2}>
            Therapy Progress
          </NavButton>
          
          <NavButton value="feedback" icon={Send}>
            Feedback
          </NavButton>
        </div>
        
        {/* Title, if provided */}
        {displayTitle && (
          <div className="text-sm font-medium truncate max-w-[200px]">
            {displayTitle}
          </div>
        )}
      </div>
    </div>
  );
} 