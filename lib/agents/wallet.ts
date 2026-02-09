/**
 * Server-side agent wallet system
 * Each agent has a deterministic keypair derived from their ID + server secret.
 * In production, use proper HSM / key management.
 */

import { Keypair, PublicKey, Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { createHash } from "crypto";

// Server-side secret for deriving agent keypairs
// In production this MUST come from env vars / secrets manager
const AGENT_WALLET_SECRET = process.env.AGENT_WALLET_SECRET || "predictfy-agent-wallet-secret-v1-demo";

/**
 * Derive a deterministic Keypair for an agent.
 * Uses HMAC-SHA256(secret, agentId) as the seed.
 */
export function getAgentKeypair(agentId: string): Keypair {
  const seed = createHash("sha256")
    .update(`${AGENT_WALLET_SECRET}:${agentId}`)
    .digest();
  return Keypair.fromSeed(seed.slice(0, 32));
}

/**
 * Get the public key for an agent
 */
export function getAgentPublicKey(agentId: string): PublicKey {
  return getAgentKeypair(agentId).publicKey;
}

/**
 * Create a WalletContextState-compatible object from a Keypair.
 * This lets us reuse the existing Solana SDK functions which expect WalletContextState.
 */
export function keypairToWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    connected: true,
    connecting: false,
    disconnecting: false,
    wallet: null,
    wallets: [],
    autoConnect: false,
    select: () => {},
    connect: async () => {},
    disconnect: async () => {},
    sendTransaction: async () => "" as any,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (tx instanceof Transaction) {
        tx.sign(keypair);
      } else {
        (tx as VersionedTransaction).sign([keypair]);
      }
      return tx;
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      for (const tx of txs) {
        if (tx instanceof Transaction) {
          tx.sign(keypair);
        } else {
          (tx as VersionedTransaction).sign([keypair]);
        }
      }
      return txs;
    },
    signMessage: async (message: Uint8Array) => {
      // Not needed for on-chain operations
      return new Uint8Array();
    },
  };
}

/**
 * Get a Solana Connection using RPC from env
 */
export function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Get balance for an agent wallet
 */
export async function getAgentBalance(agentId: string): Promise<number> {
  const connection = getConnection();
  const pubkey = getAgentPublicKey(agentId);
  const balance = await connection.getBalance(pubkey);
  return balance / 1e9; // Convert lamports to SOL
}
