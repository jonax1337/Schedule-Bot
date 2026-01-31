'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface BreadcrumbTrailItem {
  label: string;
  onClick: () => void;
}

export interface BreadcrumbSub {
  /** Final (current) page label */
  label: string;
  /** Navigate back to the parent page */
  onNavigateBack: () => void;
  /** Optional intermediate trail items (e.g. folder path) rendered between the tab and final label */
  trail?: BreadcrumbTrailItem[];
}

interface BreadcrumbContextValue {
  subPage: BreadcrumbSub | null;
  setSubPage: (sub: BreadcrumbSub | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  subPage: null,
  setSubPage: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [subPage, setSubPage] = useState<BreadcrumbSub | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ subPage, setSubPage }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbSub() {
  return useContext(BreadcrumbContext);
}
