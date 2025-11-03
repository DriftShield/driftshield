const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { ShdwDrive } = require('@shadow-drive/sdk');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class ShadowDriveService {
  constructor() {
    this.connection = null;
    this.drive = null;
    this.wallet = null;
    this.storageAccount = null;
    this.initialized = false;
  }

  /**
   * Initialize Shadow Drive client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Check if Shadow Drive is configured
      if (!process.env.SHADOW_DRIVE_STORAGE_ACCOUNT) {
        logger.warn('Shadow Drive not configured, uploads will be skipped');
        return;
      }

      // Create Solana connection
      this.connection = new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        'confirmed',
      );

      // Load wallet keypair
      const walletPath = process.env.SHADOW_DRIVE_WALLET_PATH || 
                        process.env.ORACLE_WALLET_PATH ||
                        path.join(process.env.HOME, '.config/solana/id.json');

      try {
        const secretKey = JSON.parse(await fs.readFile(walletPath, 'utf-8'));
        this.wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
        logger.info(`Shadow Drive wallet loaded: ${this.wallet.publicKey.toString()}`);
      } catch (error) {
        logger.error('Failed to load Shadow Drive wallet:', error.message);
        throw new Error('Shadow Drive wallet not found. Set SHADOW_DRIVE_WALLET_PATH');
      }

      // Initialize Shadow Drive client
      this.drive = await new ShdwDrive(this.connection, this.wallet).init();

      // Get storage account
      this.storageAccount = new PublicKey(process.env.SHADOW_DRIVE_STORAGE_ACCOUNT);

      this.initialized = true;
      logger.info('Shadow Drive client initialized successfully');
      logger.info(`Storage account: ${this.storageAccount.toString()}`);

      // Get storage account info
      const accountInfo = await this.drive.getStorageAccount(this.storageAccount);
      logger.info(`Storage: ${accountInfo.storage} bytes used of ${accountInfo.storageAvailable} bytes`);
    } catch (error) {
      logger.error('Failed to initialize Shadow Drive:', error.message);
      this.initialized = false;
      // Don't throw - allow app to run without Shadow Drive
    }
  }

  /**
   * Upload receipt JSON to Shadow Drive
   * 
   * @param {Object} receipt - Receipt data object
   * @param {string} modelId - Model ID for organizing files
   * @returns {Promise<Object>} Upload result with URL and transaction signature
   */
  async uploadReceipt(receipt, modelId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      logger.warn('Shadow Drive not initialized, skipping upload');
      return {
        url: this._generateMockUrl(receipt.receipt_hash),
        signature: null,
        uploaded: false,
        reason: 'Shadow Drive not configured',
      };
    }

    try {
      // Convert receipt to JSON buffer
      const receiptJson = JSON.stringify(receipt, null, 2);
      const buffer = Buffer.from(receiptJson, 'utf-8');

      // Generate filename with timestamp and model ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `receipts/${modelId}/${timestamp}_${receipt.receipt_hash.substring(0, 8)}.json`;

      logger.info(`Uploading receipt to Shadow Drive: ${filename}`);

      // Upload file to Shadow Drive
      const uploadResult = await this.drive.uploadFile(
        this.storageAccount,
        {
          name: filename,
          file: buffer,
        },
      );

      logger.info('Receipt uploaded successfully to Shadow Drive');
      logger.info(`URL: ${uploadResult.finalized_locations[0]}`);
      logger.info(`Transaction: ${uploadResult.transaction_signature}`);

      return {
        url: uploadResult.finalized_locations[0],
        signature: uploadResult.transaction_signature,
        filename,
        size: buffer.length,
        uploaded: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Shadow Drive upload failed:', error.message);

      // Return mock URL as fallback
      return {
        url: this._generateMockUrl(receipt.receipt_hash),
        signature: null,
        uploaded: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload multiple receipts in batch
   * 
   * @param {Array<Object>} receipts - Array of receipt objects
   * @param {string} modelId - Model ID
   * @returns {Promise<Array<Object>>} Array of upload results
   */
  async uploadReceiptsBatch(receipts, modelId) {
    const results = [];

    for (const receipt of receipts) {
      try {
        const result = await this.uploadReceipt(receipt, modelId);
        results.push({
          receiptHash: receipt.receipt_hash,
          ...result,
        });
      } catch (error) {
        logger.error(`Failed to upload receipt ${receipt.receipt_hash}:`, error.message);
        results.push({
          receiptHash: receipt.receipt_hash,
          uploaded: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Download receipt from Shadow Drive
   * 
   * @param {string} url - Shadow Drive URL
   * @returns {Promise<Object>} Receipt data
   */
  async downloadReceipt(url) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const receipt = await response.json();
      return receipt;
    } catch (error) {
      logger.error('Failed to download receipt from Shadow Drive:', error.message);
      throw error;
    }
  }

  /**
   * Delete file from Shadow Drive
   * 
   * @param {string} url - File URL to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(url) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Shadow Drive not initialized');
    }

    try {
      // Extract filename from URL
      const filename = url.split('/').pop();

      const result = await this.drive.deleteFile(
        this.storageAccount,
        filename,
      );

      logger.info(`File deleted from Shadow Drive: ${filename}`);

      return {
        deleted: true,
        filename,
        signature: result.transaction_signature,
      };
    } catch (error) {
      logger.error('Failed to delete file from Shadow Drive:', error.message);
      throw error;
    }
  }

  /**
   * List files in storage account
   * 
   * @returns {Promise<Array>} List of files
   */
  async listFiles() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Shadow Drive not initialized');
    }

    try {
      const files = await this.drive.listObjects(this.storageAccount);
      return files.keys || [];
    } catch (error) {
      logger.error('Failed to list Shadow Drive files:', error.message);
      throw error;
    }
  }

  /**
   * Get storage account info
   * 
   * @returns {Promise<Object>} Storage account information
   */
  async getStorageInfo() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Shadow Drive not initialized');
    }

    try {
      const accountInfo = await this.drive.getStorageAccount(this.storageAccount);

      return {
        publicKey: accountInfo.publicKey.toString(),
        storage: accountInfo.storage,
        storageAvailable: accountInfo.storageAvailable,
        owner: accountInfo.owner1.toString(),
        accountCounterSeed: accountInfo.accountCounterSeed,
        creationTime: accountInfo.creationTime,
        creationEpoch: accountInfo.creationEpoch,
        immutable: accountInfo.immutable,
        toBeDeleted: accountInfo.toBeDeleted,
        deleteRequestEpoch: accountInfo.deleteRequestEpoch,
        version: accountInfo.version,
      };
    } catch (error) {
      logger.error('Failed to get storage info:', error.message);
      throw error;
    }
  }

  /**
   * Create new storage account
   * 
   * @param {string} name - Storage account name
   * @param {string} size - Storage size (e.g., '1GB', '100MB')
   * @returns {Promise<Object>} Created storage account info
   */
  async createStorageAccount(name, size) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Shadow Drive not initialized');
    }

    try {
      const result = await this.drive.createStorageAccount(name, size);

      logger.info(`Storage account created: ${result.shdw_bucket}`);
      logger.info(`Transaction: ${result.transaction_signature}`);

      return {
        storageAccount: result.shdw_bucket,
        signature: result.transaction_signature,
        name,
        size,
      };
    } catch (error) {
      logger.error('Failed to create storage account:', error.message);
      throw error;
    }
  }

  /**
   * Add storage to existing account
   * 
   * @param {string} size - Additional storage size
   * @returns {Promise<Object>} Result
   */
  async addStorage(size) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Shadow Drive not initialized');
    }

    try {
      const result = await this.drive.addStorage(this.storageAccount, size);

      logger.info(`Storage added: ${size}`);
      logger.info(`Transaction: ${result.transaction_signature}`);

      return {
        added: true,
        size,
        signature: result.transaction_signature,
      };
    } catch (error) {
      logger.error('Failed to add storage:', error.message);
      throw error;
    }
  }

  /**
   * Check if Shadow Drive is available
   * 
   * @returns {boolean} True if initialized and available
   */
  isAvailable() {
    return this.initialized;
  }

  /**
   * Generate mock URL for testing/fallback
   * 
   * @private
   * @param {string} hash - Receipt hash
   * @returns {string} Mock URL
   */
  _generateMockUrl(hash) {
    return `https://shdw-drive.genesysgo.net/receipts/${hash}.json`;
  }

  /**
   * Verify receipt integrity
   * 
   * @param {string} url - Receipt URL
   * @param {string} expectedHash - Expected receipt hash
   * @returns {Promise<Object>} Verification result
   */
  async verifyReceipt(url, expectedHash) {
    try {
      const receipt = await this.downloadReceipt(url);

      // Recalculate hash
      const crypto = require('crypto');
      const receiptJson = JSON.stringify({
        ...receipt,
        receipt_hash: undefined, // Exclude hash field from hash calculation
      }, Object.keys(receipt).sort());

      const calculatedHash = crypto.createHash('sha256').update(receiptJson).digest('hex');

      const isValid = calculatedHash === expectedHash;

      return {
        valid: isValid,
        expectedHash,
        calculatedHash,
        receipt: isValid ? receipt : null,
      };
    } catch (error) {
      logger.error('Receipt verification failed:', error.message);
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new ShadowDriveService();

