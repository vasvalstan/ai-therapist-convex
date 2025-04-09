import { Inter } from "next/font/google";
import Providers from "./providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Sereni - AI Therapy Assistant",
  description: "Your AI therapist, ready to listen and help you process your thoughts and feelings.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={cn(inter.className, "min-h-screen bg-background antialiased")}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
