interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="text-[15px] font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-[13px] text-text-dim max-w-[360px] mb-4">{description}</p>
      {action}
    </div>
  );
}
