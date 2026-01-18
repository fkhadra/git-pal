import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type DeepNonNullable<T> = {
  [Key in keyof T]-?: DeepNonNullable<NonNullable<T[Key]>>;
};

export type ExtractEventPayload<T, K extends keyof any> =
  T extends Record<K, infer V> ? V : never;

export function nil<T>(v: T): v is NonNullable<typeof v> {
  return v != null;
}

export function themeSwitcher(theme: string) {
  switch (theme) {
    case "light":
      document.documentElement.classList.toggle("dark", false);
      break;
    case "dark":
      document.documentElement.classList.toggle("dark", true);
      break;
    default:
      document.documentElement.classList.toggle(
        "dark",
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
      break;
  }
}

export async function withDelay<T>(fn: Promise<T>, delay = 1000) {
  const [result] = await Promise.allSettled([
    fn,
    new Promise((resolve) => setTimeout(resolve, delay)),
  ]);

  if (result.status === "rejected") {
    throw result.reason;
  }

  return result.value;
}
