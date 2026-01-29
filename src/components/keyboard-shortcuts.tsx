"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // For shortcuts that require cmd/ctrl, check either
        const modifierMatch = shortcut.meta || shortcut.ctrl
          ? (e.metaKey || e.ctrlKey)
          : (ctrlMatch && metaMatch);

        if (keyMatch && modifierMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    { key: "h", meta: true, shift: true, action: () => router.push("/"), description: "Go to Home" },
    { key: "e", meta: true, shift: true, action: () => router.push("/journey/explorer"), description: "Go to Explorer" },
    { key: "c", meta: true, shift: true, action: () => router.push("/analytics/copilot"), description: "Go to Copilot" },
    { key: "r", meta: true, shift: true, action: () => router.push("/reports"), description: "Go to Reports" },
    
    // Actions
    { key: "?", shift: true, action: () => {
      // Show shortcuts dialog
      const event = new CustomEvent("show-shortcuts-dialog");
      window.dispatchEvent(event);
    }, description: "Show keyboard shortcuts" },
  ];

  useKeyboardShortcuts(shortcuts);

  return <>{children}</>;
}

// Keyboard shortcuts help dialog content
export const keyboardShortcutsList = [
  { category: "Navigation", shortcuts: [
    { keys: ["⌘", "K"], description: "Open search" },
    { keys: ["⌘", "⇧", "H"], description: "Go to Home" },
    { keys: ["⌘", "⇧", "E"], description: "Go to Explorer" },
    { keys: ["⌘", "⇧", "C"], description: "Go to Copilot" },
    { keys: ["⌘", "⇧", "R"], description: "Go to Reports" },
  ]},
  { category: "General", shortcuts: [
    { keys: ["?"], description: "Show keyboard shortcuts" },
    { keys: ["Esc"], description: "Close dialog / Cancel" },
  ]},
];
