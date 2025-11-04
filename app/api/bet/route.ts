import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';

// Store pending bet payments (use Redis/DB in production)
const pendingBetPayments = new Map<string, {
  amount: number;
  recipient: string;
  marketId: string;
  outcome: string; // Support multi-outcome markets
  betAmount: number;
  timestamp: number;
  userWallet: string;
}>();

const PAYMENT_EXPIRY = 5 * 60 * 1000; // 5 minutes
const X402_PAYMENT_AMOUNT = 0.01; // 0.01 SOL per bet

// Treasury wallet for X402 payments
const TREASURY_WALLET = process.env.NEXT_PUBLIC_X402_TREASURY_WALLET || '53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp';

// Solana connection
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

/**
 * GET handler - Returns 402 Payment Required with payment details for placing a bet
 */
export async function GET(request: NextRequest) {
  const marketId = request.nextUrl.searchParams.get('marketId');
  const outcome = request.nextUrl.searchParams.get('outcome');
  const betAmount = request.nextUrl.searchParams.get('betAmount');
  const userWallet = request.nextUrl.searchParams.get('userWallet');

  if (!marketId || !outcome || !betAmount || !userWallet) {
    return NextResponse.json(
      { error: 'Missing required parameters: marketId, outcome, betAmount, userWallet' },
      { status: 400 }
    );
  }

  // Accept any outcome (for multi-outcome markets)
  // Validation of valid outcomes happens on-chain

  const betAmountNum = parseFloat(betAmount);
  if (isNaN(betAmountNum) || betAmountNum <= 0) {
    return NextResponse.json(
      { error: 'Invalid bet amount' },
      { status: 400 }
    );
  }

  const reference = uuidv4();

  // Store payment reference with bet details
  pendingBetPayments.set(reference, {
    amount: X402_PAYMENT_AMOUNT,
    recipient: TREASURY_WALLET,
    marketId,
    outcome: outcome, // Support any outcome for multi-outcome markets
    betAmount: betAmountNum,
    timestamp: Date.now(),
    userWallet,
  });

  // Clean up expired payments
  for (const [ref, payment] of pendingBetPayments.entries()) {
    if (Date.now() - payment.timestamp > PAYMENT_EXPIRY) {
      pendingBetPayments.delete(ref);
    }
  }

  // Return 402 Payment Required
  return NextResponse.json(
    {
      message: 'Payment Required to Place Bet',
      statusCode: 402,
      paymentDetails: {
        recipient: TREASURY_WALLET,
        amount: X402_PAYMENT_AMOUNT,
        token: 'SOL',
        reference,
        memo: `X402 bet fee - ${outcome} on ${marketId}`,
        expiresIn: PAYMENT_EXPIRY / 1000, // in seconds
        betDetails: {
          marketId,
          outcome,
          betAmount: betAmountNum,
        }
      },
    },
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
        'X-Payment-Amount': X402_PAYMENT_AMOUNT.toString(),
        'X-Payment-Token': 'SOL',
      }
    }
  );
}

/**
 * POST handler - Verifies X402 payment and authorizes bet placement
 */
export async function POST(request: NextRequest) {
  try {
    const { signature, reference } = await request.json();

    if (!signature || !reference) {
      return NextResponse.json(
        { error: 'Signature and reference required' },
        { status: 400 }
      );
    }

    // Check if reference exists
    const betPayment = pendingBetPayments.get(reference);
    if (!betPayment) {
      return NextResponse.json(
        { error: 'Invalid or expired bet payment reference' },
        { status: 400 }
      );
    }

    // Verify transaction on Solana
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    let transaction;
    try {
      transaction = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction from blockchain' },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify transaction succeeded
    if (transaction.meta?.err !== null) {
      return NextResponse.json(
        { error: 'Transaction failed' },
        { status: 400 }
      );
    }

    // Verify recipient and amount
    const recipientPubkey = new PublicKey(betPayment.recipient);
    const userPubkey = new PublicKey(betPayment.userWallet);
    const accountKeys = transaction.transaction.message.getAccountKeys();

    console.log('[X402 Bet] Verifying payment:', {
      signature,
      reference,
      marketId: betPayment.marketId,
      outcome: betPayment.outcome,
      betAmount: betPayment.betAmount,
    });

    // Find recipient in transaction
    const recipientIndex = accountKeys.staticAccountKeys.findIndex(
      key => key.equals(recipientPubkey)
    );

    if (recipientIndex === -1) {
      console.error('[X402 Bet] Recipient not found in transaction');
      return NextResponse.json(
        { error: 'Payment recipient mismatch' },
        { status: 400 }
      );
    }

    // Verify sender
    const senderIndex = accountKeys.staticAccountKeys.findIndex(
      key => key.equals(userPubkey)
    );

    if (senderIndex === -1) {
      console.error('[X402 Bet] Sender wallet mismatch');
      return NextResponse.json(
        { error: 'Payment sender mismatch' },
        { status: 400 }
      );
    }

    // Check the recipient's balance change
    const recipientPreBalance = transaction.meta!.preBalances[recipientIndex];
    const recipientPostBalance = transaction.meta!.postBalances[recipientIndex];
    const amountReceived = (recipientPostBalance - recipientPreBalance) / LAMPORTS_PER_SOL;

    console.log('[X402 Bet] Payment verification:', {
      preBalance: recipientPreBalance,
      postBalance: recipientPostBalance,
      received: amountReceived,
      expected: betPayment.amount,
    });

    // Allow 2% tolerance for rounding
    const expectedAmount = betPayment.amount;
    if (amountReceived < expectedAmount * 0.98) {
      console.error('[X402 Bet] Insufficient payment');
      return NextResponse.json(
        { error: `Insufficient payment. Expected ${expectedAmount} SOL, received ${amountReceived.toFixed(6)} SOL` },
        { status: 400 }
      );
    }

    console.log('[X402 Bet] Payment verified successfully!');

    // Payment verified! Remove from pending
    pendingBetPayments.delete(reference);

    // Return authorization to place bet
    return NextResponse.json({
      success: true,
      message: 'X402 payment verified - bet authorized',
      authorization: {
        marketId: betPayment.marketId,
        outcome: betPayment.outcome,
        betAmount: betPayment.betAmount,
        x402Signature: signature,
        x402Reference: reference,
        timestamp: Date.now(),
      },
    });

  } catch (error) {
    console.error('[X402 Bet] Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
