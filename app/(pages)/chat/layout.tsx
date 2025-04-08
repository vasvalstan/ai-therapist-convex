import { ReactNode } from "react";
import { ChatNav } from "@/components/hume/chat-nav";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <main className="flex flex-col min-h-screen max-h-screen">
      <ChatNav />
      {children}
    </main>
  );
} 