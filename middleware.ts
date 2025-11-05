import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { paymentMiddleware, type SolanaAddress } from 'x402-next';

const facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.payai.network';
const payTo = (process.env.ADDRESS || process.env.TREASURY_WALLET || '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp') as SolanaAddress;

/**
 * Combined middleware: CORS + X402 Payment
 */
export async function middleware(request: NextRequest) {
  // Check if this is an X402 protected route
  if (request.nextUrl.pathname.startsWith('/api/x402-bet')) {
    // Apply X402 payment middleware
    const x402Middleware = paymentMiddleware(
      payTo,
      {
        // Bet placement endpoint - requires $1.00 USDC payment
        'POST /api/x402-bet': {
          price: '$1.00',
          network: 'solana',
          config: {
            description: 'Place a bet on prediction market',
            maxTimeoutSeconds: 60,
          }
        },
      },
      {
        url: facilitatorUrl,
      }
    );

    // Apply x402 middleware
    const x402Response = await x402Middleware(request);
    if (x402Response) {
      return x402Response;
    }
  }

  // Apply CORS headers
  const response = NextResponse.next()

  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

  return response
}

export const config = {
  matcher: [
    "/:path*",
    "/api/x402-bet/:path*",
  ],
}
