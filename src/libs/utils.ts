export type DeepNonNullable<T> = {
  [Key in keyof T]-?: DeepNonNullable<NonNullable<T[Key]>>;
};

export type ExtractEventPayload<T, K extends keyof any> =
  T extends Record<K, infer V> ? V : never;

export function nil<T>(v: T): v is NonNullable<typeof v> {
  return v != null;
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

const NON_DIGITS = /\D/g;

/** Keeps the digits only, for numeric text inputs. */
export function digitsOnly(value: string) {
  return value.replace(NON_DIGITS, "");
}
