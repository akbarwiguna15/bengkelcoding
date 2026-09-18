import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getModelLabel(model: string): string {
  const labels: Record<string, string> = {
    PROBLEM_SOLVING: "Problem Solving",
    PBL: "Project Based Learning",
    TRANSFORMATIF: "Transformatif",
  };
  return labels[model] || model;
}

export function getModelColor(model: string): string {
  const colors: Record<string, string> = {
    PROBLEM_SOLVING: "pcb",
    PBL: "copper",
    TRANSFORMATIF: "reflect",
  };
  return colors[model] || "pcb";
}

export function getDifficultyLabel(level: number): string {
  const labels: Record<number, string> = {
    1: "Mudah",
    2: "Menengah",
    3: "Sulit",
  };
  return labels[level] || "Menengah";
}
