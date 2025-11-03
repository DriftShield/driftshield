import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js';

export type Network = 'devnet' | 'mainnet-beta' | 'localnet';

const RPC_ENDPOINTS = {
  devnet: clusterApiUrl('devnet'),
  'mainnet-beta': clusterApiUrl('mainnet-beta'),
  localnet: 'http://localhost:8899',
};

export function getConnection(
  network: Network = 'devnet',
  commitment: Commitment = 'confirmed'
): Connection {
  const endpoint = RPC_ENDPOINTS[network];
  return new Connection(endpoint, commitment);
}

// Singleton connection instance
let connectionInstance: Connection | null = null;

export function getSolanaConnection(network: Network = 'devnet'): Connection {
  if (!connectionInstance) {
    connectionInstance = getConnection(network);
  }
  return connectionInstance;
}
