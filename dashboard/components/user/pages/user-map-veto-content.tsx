'use client';

import { MapVetoPlanner } from "@/components/shared";

export function UserMapVetoContent() {
  return (
    <div className="space-y-4">
      <div className="animate-fadeIn">
        <MapVetoPlanner />
      </div>
    </div>
  );
}
