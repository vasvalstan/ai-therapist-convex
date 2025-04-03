"use client";

import Pricing from "@/components/homepage/pricing";
import HeroSection from "@/components/homepage/hero-section";
import { AccordionComponent } from "@/components/homepage/accordion-component";
import SideBySide from "@/components/homepage/side-by-side";
import PageWrapper from "@/components/wrapper/page-wrapper";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function Home() {
  // Check for metadata in localStorage when this page loads
  if (typeof window !== 'undefined') {
    try {
      const metadata = localStorage.getItem('hume_metadata');
      if (metadata) {
        console.log("Found Hume metadata in localStorage:", JSON.parse(metadata));
      } else {
        console.log("No Hume metadata found in localStorage");
      }
    } catch (e) {
      console.error("Error checking localStorage:", e);
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col justify-center items-center w-full mt-[1rem] p-3">
        <HeroSection />
      </div>
      <SideBySide />
      <Pricing />
      <AccordionComponent />
      
      {/* Debug button for localStorage testing (development only) */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md mx-auto">
          <h3 className="font-medium mb-2 text-center">Developer Tools</h3>
          <Button 
            onClick={() => {
              try {
                const metadata = localStorage.getItem('hume_metadata');
                if (metadata) {
                  alert(`Found metadata in localStorage: ${metadata}`);
                  console.log("localStorage metadata:", JSON.parse(metadata));
                } else {
                  alert("No metadata found in localStorage");
                }
              } catch (e) {
                console.error("Error reading localStorage:", e);
                alert("Error reading localStorage: " + e);
              }
            }}
            variant="outline" 
            className="w-full"
          >
            Check Metadata in localStorage
          </Button>
        </div>
      )}
    </PageWrapper>
  );
}
