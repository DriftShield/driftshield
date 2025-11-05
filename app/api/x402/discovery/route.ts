import { NextRequest, NextResponse } from 'next/server';
import {
  createX402Response,
  createBetAccepts,
  createMarketAccepts,
  createAnalyticsAccepts,
} from '@/lib/x402/types';

const payTo = process.env.ADDRESS || process.env.TREASURY_WALLET || '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp';

/**
 * X402 Discovery Endpoint
 * Returns x402scan-compliant metadata for all protected endpoints
 *
 * This endpoint enables:
 * - Listing on x402scan
 * - UI-driven invocation from x402scan app
 * - Schema validation and documentation
 */
export async function GET(request: NextRequest) {
  try {
    // Create accepts for all protected endpoints
    const accepts = [
      createBetAccepts(payTo, '/api/x402-bet'),
      createMarketAccepts(payTo, '/api/x402/create-market'),
      createAnalyticsAccepts(payTo, '/api/x402/analytics'),
    ];

    // Create x402scan-compliant response
    const response = createX402Response(
      accepts,
      payTo, // facilitator/payer address
    );

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-X402-Version': '1',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[X402 Discovery] Error:', error);

    const errorResponse = createX402Response(
      [],
      undefined,
      error instanceof Error ? error.message : 'Internal server error'
    );

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
