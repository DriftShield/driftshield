import { NextRequest, NextResponse } from 'next/server';
import { X402PaymentHandler } from 'x402-solana/server';

const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'solana' | 'solana-devnet';
const treasuryAddress = process.env.ADDRESS || process.env.TREASURY_WALLET || '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp';
const facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.payai.network';
const usdcMint = network === 'solana'
  ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
  : 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // Devnet USDC

// Create x402 payment handler
const x402 = new X402PaymentHandler({
  network: network === 'devnet' ? 'solana-devnet' : 'solana',
  treasuryAddress,
  facilitatorUrl,
});

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

/**
 * POST handler - Place bet with X402 payment
 * The x402 middleware is applied in middleware.ts
 * This route handler receives the request after payment verification
 */
export async function POST(request: NextRequest) {
  try {
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

    // Extract payment header
    const paymentHeader = x402.extractPayment(request.headers);

    // Create payment requirements
    const paymentRequirements = await x402.createPaymentRequirements({
      price: {
        amount: "1000000", // $1.00 USDC (6 decimals)
        asset: {
          address: usdcMint
        }
      },
      network: network === 'devnet' ? 'solana-devnet' : 'solana',
      config: {
        description: 'Place a bet on prediction market',
        resource: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://driftshield.xyz'}/api/x402-bet`,
      }
    });

    if (!paymentHeader) {
      // Return 402 with payment requirements
      const response = x402.create402Response(paymentRequirements);
      return NextResponse.json(response.body, { status: response.status });
    }

    // Verify payment
    const verified = await x402.verifyPayment(paymentHeader, paymentRequirements);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid payment' }, { status: 402 });
    }

    console.log('[X402 Bet] Payment verified!', paymentHeader);

    // At this point, payment has been verified
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

    console.log('[X402 Bet] Payment verified!', {
      marketId,
      outcome,
      betAmount: betAmountNum,
      userWallet,
    });

    // Settle payment with facilitator
    await x402.settlePayment(paymentHeader, paymentRequirements);

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
