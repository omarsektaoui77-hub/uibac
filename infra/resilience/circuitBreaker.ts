let failures = 0;

export function circuitBreaker<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    if (failures > 5) throw new Error("Circuit open");
    try {
      const res = await fn(...args);
      failures = 0;
      return res;
    } catch (e) {
      failures++;
      throw e;
    }
  }) as T;
}
