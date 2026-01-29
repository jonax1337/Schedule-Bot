'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface BreadcrumbSub {
  label: string;
  onNavigateBack: () => void;
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
