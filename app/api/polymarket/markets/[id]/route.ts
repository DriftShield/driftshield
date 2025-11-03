import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';

/**
 * GET /api/polymarket/markets/[id]
 * Fetch a single market by ID from Polymarket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;

    if (!marketId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market ID is required',
        },
        { status: 400 }
      );
    }

    const market = await polymarketClient.getMarket(marketId);

    if (!market) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      market,
    });
  } catch (error) {
    console.error('Error fetching Polymarket market:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market',
      },
      { status: 500 }
    );
  }
}
