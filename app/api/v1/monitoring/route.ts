import { NextResponse } from 'next/server';
import { metrics } from '@/app/lib/monitoring/metrics';

/**
 * GET /api/monitoring
 * 
 * Returns live monitoring statistics for the application
 * 
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "totalRequests": number,
 *     "successRate": number,
 *     "averageResponseTime": number
 *   }
 * }
 */
export async function GET() {
  try {
    const stats = metrics.getStats();

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Monitoring endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve monitoring stats'
      },
      { status: 500 }
    );
  }
}
