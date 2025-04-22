"use client";

import { createContext, useState, useContext, ReactNode } from 'react';

interface HumeContextType {
  isFaceTrackingEnabled: boolean;
  toggleFaceTracking: () => void;
  faceTrackingData: any | null;
  setFaceTrackingData: (data: any) => void;
  humeApiKey: string;
  setHumeApiKey: (apiKey: string) => void;
}

const HumeContext = createContext<HumeContextType | undefined>(undefined);

export function HumeProvider({ children }: { children: ReactNode }) {
  const [isFaceTrackingEnabled, setIsFaceTrackingEnabled] = useState(false);
  const [faceTrackingData, setFaceTrackingData] = useState<any | null>(null);
  
  // Don't store the API key directly in the client code
  const [humeApiKey, setHumeApiKey] = useState<string>("");

  const toggleFaceTracking = () => {
    setIsFaceTrackingEnabled(prev => !prev);
  };

  return (
    <HumeContext.Provider value={{
      isFaceTrackingEnabled,
      toggleFaceTracking,
      faceTrackingData,
      setFaceTrackingData,
      humeApiKey,
      setHumeApiKey
    }}>
      {children}
    </HumeContext.Provider>
  );
}

export const useHume = () => {
  const context = useContext(HumeContext);
  if (context === undefined) {
    throw new Error('useHume must be used within a HumeProvider');
  }
  return context;
};
