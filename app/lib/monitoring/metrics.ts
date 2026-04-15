interface RequestEvent {
  route: string;
  status: number;
  duration: number;
  timestamp: number;
}

class MetricsCollector {
  private events: RequestEvent[] = [];
  private maxEvents = 1000;

  recordRequest(route: string, status: number, duration: number): void {
    const event: RequestEvent = {
      route,
      status,
      duration,
      timestamp: Date.now()
    };

    this.events.push(event);

    // Keep rolling window of last 1000 events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getStats(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
  } {
    if (this.events.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0
      };
    }

    const totalRequests = this.events.length;
    const successfulRequests = this.events.filter(e => e.status >= 200 && e.status < 300).length;
    const successRate = (successfulRequests / totalRequests) * 100;
    const errorRate = 100 - successRate;
    const totalDuration = this.events.reduce((sum, e) => sum + e.duration, 0);
    const averageResponseTime = totalDuration / totalRequests;

    // Calculate P95 response time
    const sortedDurations = this.events.map(e => e.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p95ResponseTime = sortedDurations[p95Index] || 0;

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime * 100) / 100
    };
  }

  clear(): void {
    this.events = [];
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
