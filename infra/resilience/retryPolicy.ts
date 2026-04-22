export async function retry(fn: () => Promise<any>, retries: number = 3): Promise<any> {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    return retry(fn, retries - 1);
  }
}
