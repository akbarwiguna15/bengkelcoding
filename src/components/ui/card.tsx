import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  blueprint?: boolean;
}

export function Card({ children, className, blueprint }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-line relative",
        blueprint && "bpanel",
        className
      )}
    >
      {blueprint && (
        <>
          <span className="absolute -top-px -left-px w-2.5 h-2.5 border-t-2 border-l-2 border-pcb" />
          <span className="absolute -top-px -right-px w-2.5 h-2.5 border-t-2 border-r-2 border-pcb" />
          <span className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b-2 border-l-2 border-pcb" />
          <span className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b-2 border-r-2 border-pcb" />
        </>
      )}
      {children}
    </div>
  );
}
