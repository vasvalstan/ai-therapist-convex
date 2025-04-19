"use client";

import { useEffect, useState } from "react";
import { FaceWidgets } from "./FaceWidgets";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface FaceTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

export function FaceTrackingModal({ isOpen, onClose, apiKey }: FaceTrackingModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
        <FaceWidgets apiKey={apiKey} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
