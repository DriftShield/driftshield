import * as fs from 'fs';

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  endDate: string;
  active: boolean;
  closed: boolean;
}

async function testFetch() {
  const response = await fetch(
    `${POLYMARKET_API}/markets?limit=10&offset=0&closed=false&active=true`
  );
  
  const data = await response.json();
  
  console.log('First 10 markets:');
  for (const market of data.slice(0, 10)) {
    const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString() : 'No date';
    const expired = market.endDate && new Date(market.endDate) < new Date() ? '(EXPIRED)' : '';
    console.log(`  - ${market.question.slice(0, 50)}: ${endDate} ${expired}`);
  }
}

testFetch();
