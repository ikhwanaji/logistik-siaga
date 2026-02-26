import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility untuk menggabungkan class Tailwind secara cerdas.
 * Menggabungkan kekuatan clsx (kondisional) dan tailwind-merge (resolusi konflik).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}