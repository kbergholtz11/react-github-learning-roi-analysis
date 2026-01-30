"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

export function SignOutButton({ className, variant = "ghost" }: SignOutButtonProps) {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      variant={variant}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  );
}
