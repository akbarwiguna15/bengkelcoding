"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "approve" | "reject" | "sm";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-copper text-white border-none px-5 py-2.5 text-[13.5px] font-semibold",
  ghost:
    "bg-transparent border border-line text-text-primary px-5 py-2.5 text-[13.5px]",
  approve: "bg-pcb text-white border-pcb px-3.5 py-1.5 text-[12.5px]",
  reject:
    "bg-white text-rust border border-rust px-3.5 py-1.5 text-[12.5px]",
  sm: "bg-white border border-line px-3.5 py-1.5 text-[12.5px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "font-sans cursor-pointer transition-colors inline-flex items-center justify-center",
        variantStyles[variant],
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
