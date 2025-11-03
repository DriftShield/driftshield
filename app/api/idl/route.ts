import { NextResponse } from 'next/server';
import IDL from '@/lib/solana/prediction_bets_idl.json';

export async function GET() {
  return NextResponse.json(IDL, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json',
    },
  });
}
