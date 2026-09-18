import { cn } from "@/lib/utils";

type BadgeVariant = "pcb" | "copper" | "reflect" | "amber" | "rust" | "default";

const variantStyles: Record<BadgeVariant, string> = {
  pcb: "text-pcb border-pcb bg-pcb-soft",
  copper: "text-copper border-copper bg-copper-soft",
  reflect: "text-reflect border-reflect bg-reflect-soft",
  amber: "text-amber border-amber bg-amber-soft",
  rust: "text-rust border-rust bg-rust-soft",
  default: "text-text-dim border-line bg-white",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block text-[10.5px] font-mono px-2 py-0.5 border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
