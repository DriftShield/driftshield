import { NextRequest, NextResponse } from 'next/server';
import { polymarketClient } from '@/lib/polymarket/client';

/**
 * GET /api/polymarket/markets
 * Fetch markets from Polymarket
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const trending = searchParams.get('trending') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    let markets;

    if (search) {
      markets = await polymarketClient.searchMarkets(search, limit);
    } else if (trending) {
      markets = await polymarketClient.getTrendingMarkets(limit);
    } else if (category) {
      markets = await polymarketClient.getMarketsByCategory(category, limit);
    } else {
      markets = await polymarketClient.getSimplifiedMarkets({ limit });
    }

    return NextResponse.json({
      success: true,
      markets,
      count: markets.length,
    });
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch markets',
      },
      { status: 500 }
    );
  }
}
