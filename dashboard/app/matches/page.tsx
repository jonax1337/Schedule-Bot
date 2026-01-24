'use client';

import { ScrimsPanel } from "@/components/scrims-panel";
import { UserLayoutWrapper } from "@/components/user-layout-wrapper";

export default function MatchesPage() {
  return (
    <UserLayoutWrapper breadcrumbs={[{ label: 'Match History' }]}>
      <div className="space-y-4">
        <div className="animate-slideDown">
          <h1 className="text-3xl font-bold tracking-tight">
            Match History
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze team match performance
          </p>
        </div>

        <div className="animate-fadeIn">
          <ScrimsPanel />
        </div>
      </div>
    </UserLayoutWrapper>
  );
}
