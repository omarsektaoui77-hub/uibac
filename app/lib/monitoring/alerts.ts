class AlertManager {
  private readonly SUCCESS_RATE_THRESHOLD = 80;
  private readonly RESPONSE_TIME_THRESHOLD = 1000;

  checkAlerts(successRate: number, averageResponseTime: number): void {
    if (successRate < this.SUCCESS_RATE_THRESHOLD) {
      this.triggerAlert(
        'SUCCESS_RATE_LOW',
        `Success rate ${successRate}% below threshold ${this.SUCCESS_RATE_THRESHOLD}%`
      );
    }

    if (averageResponseTime > this.RESPONSE_TIME_THRESHOLD) {
      this.triggerAlert(
        'RESPONSE_TIME_HIGH',
        `Average response time ${averageResponseTime}ms above threshold ${this.RESPONSE_TIME_THRESHOLD}ms`
      );
    }
  }

  private triggerAlert(type: string, message: string): void {
    const alert = {
      level: 'alert',
      type,
      message,
      timestamp: Date.now()
    };

    // Non-blocking console.error for alerts
    console.error(JSON.stringify(alert));
  }
}

export const alertManager = new AlertManager();
