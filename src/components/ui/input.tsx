"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "border border-line bg-white px-3 py-2.5 text-[13.5px] font-sans text-text-primary",
          "placeholder:text-text-dim focus:outline-none focus:border-pcb",
          error && "border-rust",
          className
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-rust">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
