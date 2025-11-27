import { PublicKey } from '@solana/web3.js';

export const PROGRAM_IDS = {
  devnet: {
    modelRegistry: new PublicKey('34HbFEsYeFa1NrdUyShWXKB36NZ5p4tCjogDbg2p98xm'),
    insurance: new PublicKey('2YbvCZwBSQN9Pe8hmcPDHk2MBCpwHk4tZ11WVuB7LXwC'),
    predictionMarket: new PublicKey('48g4cCBG7hnycaruM7GP5hH8Skfc7a43BrqNWpKX53Fh'),
  },
  mainnet: {
    // Add mainnet program IDs when deployed
    modelRegistry: new PublicKey('11111111111111111111111111111111'),
    insurance: new PublicKey('11111111111111111111111111111111'),
    predictionMarket: new PublicKey('11111111111111111111111111111111'),
  },
};

// Get program IDs based on network
export function getProgramIds(network: 'devnet' | 'mainnet' = 'devnet') {
  return PROGRAM_IDS[network];
}

// USDC Token mint addresses
export const USDC_MINT = {
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // USDC devnet
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC mainnet
};

export function getUSDCMint(network: 'devnet' | 'mainnet' = 'devnet') {
  return USDC_MINT[network];
}
