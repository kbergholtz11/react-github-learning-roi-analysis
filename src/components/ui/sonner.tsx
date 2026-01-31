"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[var(--github-green)]" />,
        info: <InfoIcon className="size-4 text-[var(--github-blue)]" />,
        warning: <TriangleAlertIcon className="size-4 text-[var(--github-orange)]" />,
        error: <OctagonXIcon className="size-4 text-[var(--github-red)]" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

/**
 * GitHub-style toast helper functions
 * Provides semantic methods for common toast patterns
 */
const toast = {
  /** Success toast with green accent */
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(message, options),

  /** Error toast with red accent */
  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(message, options),

  /** Warning toast with orange accent */
  warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) =>
    sonnerToast.warning(message, options),

  /** Info toast with blue accent */
  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) =>
    sonnerToast.info(message, options),

  /** Loading toast - returns ID for later dismissal/update */
  loading: (message: string, options?: Parameters<typeof sonnerToast.loading>[1]) =>
    sonnerToast.loading(message, options),

  /** Dismiss a specific toast or all toasts */
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),

  /** Promise-based toast - shows loading, then success/error */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => sonnerToast.promise(promise, messages),

  /** GitHub-style undo toast with action button */
  undo: (message: string, onUndo: () => void, options?: Parameters<typeof sonnerToast>[1]) =>
    sonnerToast(message, {
      action: {
        label: "Undo",
        onClick: onUndo,
      },
      duration: 5000,
      ...options,
    }),

  /** Custom toast with manual control */
  custom: sonnerToast,
};

export { Toaster, toast }
