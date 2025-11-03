const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');

// Program IDs
const PROGRAM_IDS = {
  devnet: {
    modelRegistry: new PublicKey('34HbFEsYeFa1NrdUyShWXKB36NZ5p4tCjogDbg2p98xm'),
    insurance: new PublicKey('2YbvCZwBSQN9Pe8hmcPDHk2MBCpwHk4tZ11WVuB7LXwC'),
    predictionMarket: new PublicKey('APvSf7hDoZDyYgshb4LPm2mpBanbiWgdqJ53TKvKQ7Da'),
  },
};

class SolanaService {
  constructor() {
    this.network = process.env.SOLANA_NETWORK || 'devnet';
    this.connection = new Connection(
      this.network === 'mainnet-beta'
        ? clusterApiUrl('mainnet-beta')
        : clusterApiUrl('devnet'),
      'confirmed'
    );
    this.programIds = PROGRAM_IDS[this.network] || PROGRAM_IDS.devnet;
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (status.value === null) {
        return { confirmed: false, error: 'Transaction not found' };
      }

      if (status.value.err) {
        return {
          confirmed: false,
          error: JSON.stringify(status.value.err)
        };
      }

      return {
        confirmed: status.value.confirmationStatus === 'confirmed' ||
                   status.value.confirmationStatus === 'finalized',
        confirmationStatus: status.value.confirmationStatus,
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return { confirmed: false, error: error.message };
    }
  }

  /**
   * Get account balance in SOL
   */
  async getBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / web3.LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to fetch wallet balance');
    }
  }

  /**
   * Verify transaction signature
   */
  async verifyTransaction(signature) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return { valid: false, error: 'Transaction not found' };
      }

      return {
        valid: true,
        blockTime: tx.blockTime,
        slot: tx.slot,
        fee: tx.meta?.fee,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get model data from chain
   */
  async getModelData(modelId) {
    try {
      const [modelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('model'), Buffer.from(modelId)],
        this.programIds.modelRegistry
      );

      const accountInfo = await this.connection.getAccountInfo(modelPDA);

      if (!accountInfo) {
        return null;
      }

      // TODO: Deserialize account data using IDL
      return {
        address: modelPDA.toString(),
        exists: true,
        // Add deserialized fields here
      };
    } catch (error) {
      console.error('Error fetching model data:', error);
      return null;
    }
  }

  /**
   * Get insurance policy data from chain
   */
  async getPolicyData(owner, modelPubkey) {
    try {
      const ownerPubkey = new PublicKey(owner);
      const modelKey = new PublicKey(modelPubkey);

      const [policyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('policy'), ownerPubkey.toBuffer(), modelKey.toBuffer()],
        this.programIds.insurance
      );

      const accountInfo = await this.connection.getAccountInfo(policyPDA);

      if (!accountInfo) {
        return null;
      }

      // TODO: Deserialize using IDL
      return {
        address: policyPDA.toString(),
        exists: true,
      };
    } catch (error) {
      console.error('Error fetching policy data:', error);
      return null;
    }
  }

  /**
   * Get prediction market data from chain
   */
  async getMarketData(creator, modelPubkey) {
    try {
      const creatorPubkey = new PublicKey(creator);
      const modelKey = new PublicKey(modelPubkey);

      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), creatorPubkey.toBuffer(), modelKey.toBuffer()],
        this.programIds.predictionMarket
      );

      const accountInfo = await this.connection.getAccountInfo(marketPDA);

      if (!accountInfo) {
        return null;
      }

      // TODO: Deserialize using IDL
      return {
        address: marketPDA.toString(),
        exists: true,
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }

  /**
   * Monitor transaction until confirmed
   */
  async monitorTransaction(signature, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTransactionStatus(signature);

      if (status.confirmed) {
        return { success: true, status };
      }

      if (status.error && !status.error.includes('not found')) {
        return { success: false, error: status.error };
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { success: false, error: 'Transaction confirmation timeout' };
  }

  /**
   * Get recent transactions for a wallet
   */
  async getWalletTransactions(walletAddress, limit = 10) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit }
      );

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          return {
            signature: sig.signature,
            blockTime: tx?.blockTime,
            slot: sig.slot,
            err: sig.err,
            fee: tx?.meta?.fee,
          };
        })
      );

      return transactions;
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }
}

module.exports = new SolanaService();
