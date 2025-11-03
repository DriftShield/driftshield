const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const logger = require('../utils/logger');

// Determine network
const network = process.env.SOLANA_NETWORK || 'devnet';
const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network);
const wsUrl = process.env.SOLANA_WS_URL;
const commitment = process.env.SOLANA_COMMITMENT || 'confirmed';

// Create Solana connection
const connection = new Connection(rpcUrl, {
  commitment,
  wsEndpoint: wsUrl,
});

// Program IDs
const PROGRAM_IDS = {
  modelRegistry: process.env.MODEL_REGISTRY_PROGRAM_ID
    ? new PublicKey(process.env.MODEL_REGISTRY_PROGRAM_ID)
    : null,
  driftMarket: process.env.DRIFT_MARKET_PROGRAM_ID
    ? new PublicKey(process.env.DRIFT_MARKET_PROGRAM_ID)
    : null,
  oracle: process.env.ORACLE_PROGRAM_ID
    ? new PublicKey(process.env.ORACLE_PROGRAM_ID)
    : null,
};

// USDC Mint Address
const USDC_MINT = process.env.USDC_MINT_ADDRESS
  ? new PublicKey(process.env.USDC_MINT_ADDRESS)
  : new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC

// Verify connection
async function verifyConnection() {
  try {
    const version = await connection.getVersion();
    logger.info(`Connected to Solana ${network}:`, version);
    return true;
  } catch (error) {
    logger.error('Failed to connect to Solana:', error);
    return false;
  }
}

module.exports = {
  connection,
  network,
  commitment,
  PROGRAM_IDS,
  USDC_MINT,
  verifyConnection,
};
