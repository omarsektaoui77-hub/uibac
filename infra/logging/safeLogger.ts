export function safeLog(...args: any[]) {
  try {
    console.log(...args);
  } catch (e) {
    // swallow stream errors
  }
}

export function safeWarn(...args: any[]) {
  try {
    console.warn(...args);
  } catch (e) {
    // swallow stream errors
  }
}

export function safeError(...args: any[]) {
  try {
    console.error(...args);
  } catch (e) {
    // swallow stream errors
  }
}
