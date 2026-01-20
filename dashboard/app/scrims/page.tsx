'use client';

import { ScrimsPanel } from "@/components/scrims-panel";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ScrimsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8 animate-slideDown">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Scrim History
                </h1>
                <p className="text-muted-foreground mt-2">
                  Track and analyze team scrim performance
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Scrims Panel */}
        <div className="animate-fadeIn">
          <ScrimsPanel />
        </div>
      </div>
    </div>
  );
}
