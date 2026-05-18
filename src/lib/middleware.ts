import { type NextRequest, NextResponse } from 'next/server';

/**
 * CORS Middleware
 */
export function withCORS(handler: Function) {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXTAUTH_URL,
    ].filter(Boolean);

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':
            allowedOrigins.includes(origin || '') ? origin || '*' : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(request);

    response.headers.set(
      'Access-Control-Allow-Origin',
      allowedOrigins.includes(origin || '') ? origin || '*' : ''
    );
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  };
}

/**
 * Rate Limiting
 */
const requestMap = new Map<string, number[]>();

export function withRateLimit(
  handler: Function,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return async (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    const times = requestMap.get(ip) || [];
    const recentRequests = times.filter((t) => now - t < windowMs);

    if (recentRequests.length >= limit) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    recentRequests.push(now);
    requestMap.set(ip, recentRequests);

    return handler(request);
  };
}
