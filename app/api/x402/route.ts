import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Store payment references in memory (use Redis/DB in production)
const pendingPayments = new Map<string, {
  amount: number;
  recipient: string;
  resource: string;
  timestamp: number;
}>();

const PAYMENT_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Your treasury wallet (replace with your actual wallet)
const TREASURY_WALLET = process.env.TREASURY_WALLET || 'YOUR_WALLET_ADDRESS_HERE';

// Solana connection (use env var for network selection)
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

/**
 * GET handler - Returns 402 Payment Required with payment details
 */
export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get('resource');

  if (!resource) {
    return NextResponse.json(
      { error: 'Resource parameter required' },
      { status: 400 }
    );
  }

  // Define pricing for different resources
  const pricing: Record<string, number> = {
    'analytics': 0.001,           // Premium analytics
    'market-data': 0.0005,        // Real-time market data
    'prediction-market': 0.01,    // Place prediction market bet
    'create-market': 0.01,        // Create new market
    'model-inference': 0.003,     // ML model inference
  };

  const amount = pricing[resource] || 0.001;
  const reference = crypto.randomUUID();

  // Store payment reference
  pendingPayments.set(reference, {
    amount,
    recipient: TREASURY_WALLET,
    resource,
    timestamp: Date.now(),
  });

  // Clean up expired payments
  for (const [ref, payment] of pendingPayments.entries()) {
    if (Date.now() - payment.timestamp > PAYMENT_EXPIRY) {
      pendingPayments.delete(ref);
    }
  }

  return NextResponse.json(
    {
      message: 'Payment Required',
      statusCode: 402,
      paymentDetails: {
        recipient: TREASURY_WALLET,
        amount,
        token: 'SOL',
        reference,
        memo: `Access to ${resource}`,
        expiresIn: PAYMENT_EXPIRY / 1000, // in seconds
      },
    },
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}

/**
 * POST handler - Verifies payment and returns protected content
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
    const paymentDetails = pendingPayments.get(reference);
    if (!paymentDetails) {
      return NextResponse.json(
        { error: 'Invalid or expired payment reference' },
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
    const recipientPubkey = new PublicKey(paymentDetails.recipient);
    const accountKeys = transaction.transaction.message.getAccountKeys();

    console.log('Transaction accounts:', accountKeys.staticAccountKeys.map(k => k.toString()));
    console.log('Looking for recipient:', recipientPubkey.toString());

    const recipientIndex = accountKeys.staticAccountKeys.findIndex(
      key => key.equals(recipientPubkey)
    );

    console.log('Recipient index:', recipientIndex);

    if (recipientIndex === -1) {
      console.error('Recipient not found in transaction');
      console.error('Expected:', recipientPubkey.toString());
      console.error('Accounts:', accountKeys.staticAccountKeys.map(k => k.toString()));
      return NextResponse.json(
        { error: 'Payment recipient mismatch' },
        { status: 400 }
      );
    }

    // Check the recipient's balance change (what they actually received)
    const recipientPreBalance = transaction.meta.preBalances[recipientIndex];
    const recipientPostBalance = transaction.meta.postBalances[recipientIndex];
    const amountReceived = (recipientPostBalance - recipientPreBalance) / LAMPORTS_PER_SOL;

    console.log('Recipient balance change:', {
      pre: recipientPreBalance,
      post: recipientPostBalance,
      received: amountReceived,
      expected: paymentDetails.amount
    });

    // Allow 2% tolerance for rounding
    const expectedAmount = paymentDetails.amount;
    if (amountReceived < expectedAmount * 0.98) {
      console.error('Payment amount mismatch:', { received: amountReceived, expected: expectedAmount });
      return NextResponse.json(
        { error: `Insufficient payment. Expected ${expectedAmount} SOL, received ${amountReceived.toFixed(6)} SOL` },
        { status: 400 }
      );
    }

    console.log('Payment verified successfully!');

    // Payment verified! Remove from pending
    pendingPayments.delete(reference);

    // Return protected content based on resource type
    const protectedContent = getProtectedContent(paymentDetails.resource);

    return NextResponse.json({
      success: true,
      message: 'Payment verified',
      data: protectedContent,
      signature,
    });

  } catch (error) {
    console.error('X402 verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Returns protected content based on resource type
 */
function getProtectedContent(resource: string): any {
  const content: Record<string, any> = {
    'analytics': {
      totalVolume: '$1,234,567',
      activeUsers: 4521,
      marketTrends: [
        { market: 'BTC/USD', volume: '$450k', change: '+5.2%' },
        { market: 'ETH/USD', volume: '$320k', change: '+3.8%' },
      ],
      predictions: {
        accuracy: '87.5%',
        profitMargin: '+12.3%',
      }
    },
    'market-data': {
      timestamp: new Date().toISOString(),
      markets: [
        { id: 1, name: 'BTC > $100k by EOY', odds: 0.65, volume: 1234.5 },
        { id: 2, name: 'ETH Merge Success', odds: 0.92, volume: 890.2 },
      ],
      realtimeUpdates: true,
    },
    'prediction-market': {
      marketId: crypto.randomUUID(),
      betPlaced: true,
      position: 'YES',
      amount: 10,
      potentialPayout: 15.5,
    },
    'create-market': {
      marketId: crypto.randomUUID(),
      status: 'created',
      name: 'New Prediction Market',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    'model-inference': {
      prediction: 'HIGH_CONFIDENCE',
      confidence: 0.94,
      recommendations: ['BUY', 'HOLD'],
      executionTime: '250ms',
    },
  };

  return content[resource] || { message: 'Access granted', resource };
}
