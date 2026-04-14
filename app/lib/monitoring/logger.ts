interface LogEntry {
  route: string;
  status: number;
  duration: number;
  timestamp: number;
}

class StructuredLogger {
  log(route: string, status: number, duration: number): void {
    const entry: LogEntry = {
      route,
      status,
      duration,
      timestamp: Date.now()
    };

    // Output structured JSON logs
    console.log(JSON.stringify(entry));
  }

  error(route: string, message: string): void {
    const entry = {
      level: 'error',
      route,
      message,
      timestamp: Date.now()
    };

    console.error(JSON.stringify(entry));
  }
}

export const logger = new StructuredLogger();
