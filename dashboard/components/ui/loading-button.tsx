"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function LoadingButton({
  loading,
  loadingText = "Loading...",
  icon: Icon,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {Icon && <Icon className="mr-1 h-4 w-4" />}
          {children}
        </>
      )}
    </Button>
  );
}
