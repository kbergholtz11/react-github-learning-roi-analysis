"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

interface SignInButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function SignInButton({ className, variant = "default" }: SignInButtonProps) {
  return (
    <Button
      onClick={() => signIn("github", { callbackUrl: "/" })}
      variant={variant}
      className={className}
    >
      <Github className="mr-2 h-4 w-4" />
      Sign in with GitHub
    </Button>
  );
}
