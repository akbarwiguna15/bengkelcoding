import { Badge } from "@/components/ui/badge";
import { getModelLabel, getModelColor } from "@/lib/utils";

interface LearningModelBadgeProps {
  model: string;
}

export function LearningModelBadge({ model }: LearningModelBadgeProps) {
  const color = getModelColor(model) as "pcb" | "copper" | "reflect";
  return <Badge variant={color}>{getModelLabel(model)}</Badge>;
}
