import { NextRequest, NextResponse } from 'next/server';
import { paymentMiddleware, type SolanaAddress } from 'x402-next';

const facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.payai.network';
const payTo = (process.env.ADDRESS || process.env.TREASURY_WALLET || '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp') as SolanaAddress;

// Store bet authorizations after payment (use Redis/DB in production)
const betAuthorizations = new Map<string, {
  marketId: string;
  outcome: string;
  betAmount: number;
  userWallet: string;
  timestamp: number;
}>();

const AUTHORIZATION_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * X402-powered bet placement endpoint
 * Uses PayAI facilitator for payment verification
 * Cost: $1.00 USDC per bet
 */

// Create x402 middleware once
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

/**
 * POST handler - Place bet with X402 payment
 * Applies x402 payment middleware inline
 */
export async function POST(request: NextRequest) {
  try {
    // Apply x402 payment verification
    const x402Response = await x402Middleware(request);
    if (x402Response && x402Response.status !== 200) {
      // Payment required or verification failed
      return x402Response;
    }

    // Parse request body
    const body = await request.json();
    const { marketId, outcome, betAmount, userWallet } = body;

    if (!marketId || !outcome || !betAmount || !userWallet) {
      return NextResponse.json(
        { error: 'Missing required parameters: marketId, outcome, betAmount, userWallet' },
        { status: 400 }
      );
    }

    const betAmountNum = parseFloat(betAmount);
    if (isNaN(betAmountNum) || betAmountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid bet amount' },
        { status: 400 }
      );
    }

    // At this point, payment has been verified by x402
    // Create bet authorization
    const authorizationId = `${userWallet}-${marketId}-${Date.now()}`;

    // Store authorization
    betAuthorizations.set(authorizationId, {
      marketId,
      outcome,
      betAmount: betAmountNum,
      userWallet,
      timestamp: Date.now(),
    });

    // Clean up expired authorizations
    for (const [id, auth] of betAuthorizations.entries()) {
      if (Date.now() - auth.timestamp > AUTHORIZATION_EXPIRY) {
        betAuthorizations.delete(id);
      }
    }

    console.log('[X402 Bet] Payment verified via facilitator!', {
      marketId,
      outcome,
      betAmount: betAmountNum,
      userWallet,
    });

    // Return success with bet authorization
    return NextResponse.json({
      success: true,
      message: 'X402 payment verified - bet authorized',
      authorization: {
        authorizationId,
        marketId,
        outcome,
        betAmount: betAmountNum,
        timestamp: Date.now(),
        expiresIn: AUTHORIZATION_EXPIRY / 1000,
      },
    });

  } catch (error) {
    console.error('[X402 Bet] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Check authorization status
 */
export async function GET(request: NextRequest) {
  const authorizationId = request.nextUrl.searchParams.get('authorizationId');

  if (!authorizationId) {
    return NextResponse.json(
      { error: 'Authorization ID required' },
      { status: 400 }
    );
  }

  const authorization = betAuthorizations.get(authorizationId);

  if (!authorization) {
    return NextResponse.json(
      { error: 'Authorization not found or expired' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    valid: true,
    authorization,
  });
}
