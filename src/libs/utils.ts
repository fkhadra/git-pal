import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type DeepNonNullable<T> = {
  [Key in keyof T]-?: DeepNonNullable<NonNullable<T[Key]>>;
};

export function nil<T>(v: T): v is NonNullable<typeof v> {
  return v != null;
}
