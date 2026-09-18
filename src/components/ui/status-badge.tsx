import { cn } from "@/lib/utils";

type StatusVariant = "pending" | "ok" | "revisi" | "running" | "stuck";

const variantStyles: Record<StatusVariant, string> = {
  pending: "bg-amber-soft text-amber",
  ok: "bg-pcb-soft text-pcb",
  revisi: "bg-rust-soft text-rust",
  running: "bg-pcb-soft text-pcb",
  stuck: "bg-amber-soft text-amber",
};

const variantLabels: Record<StatusVariant, string> = {
  pending: "menunggu verifikasi",
  ok: "disetujui",
  revisi: "perlu revisi",
  running: "sedang dikerjakan",
  stuck: "macet",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11.5px] font-semibold font-mono px-2.5 py-1",
        variantStyles[variant],
        className
      )}
    >
      {variant === "pending" && "●"}
      {variant === "ok" && "✓"}
      {variant === "revisi" && "✕"}
      {variant === "running" && "●"}
      {variant === "stuck" && "⏱"}
      {" "}
      {label || variantLabels[variant]}
    </span>
  );
}
