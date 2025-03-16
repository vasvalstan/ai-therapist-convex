"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CustomLinkProps extends React.HTMLAttributes<HTMLDivElement> {
  href: string;
  children: React.ReactNode;
}

export default function CustomLink({
  children,
  href,
  className,
  ...props
}: CustomLinkProps) {
  const router = useRouter();
  
  return (
    <div
      onMouseDown={() => router.push(href)}
      className={cn("hover:cursor-pointer", className)}
      {...props}
    >
      {children}
    </div>
  );
}
