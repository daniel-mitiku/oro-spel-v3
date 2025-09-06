import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseWord(word: string): string {
  if (!word) return "";
  const cleaned = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").toLowerCase();
  return cleaned.replace(/(.)\1+/g, "$1");
}
