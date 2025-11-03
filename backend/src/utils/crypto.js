const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { PublicKey } = require('@solana/web3.js');

const SALT_ROUNDS = 12;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash API key
 */
async function hashApiKey(apiKey) {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Generate API key
 */
function generateApiKey() {
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = key.substring(0, 8);
  return { key: `ds_${key}`, prefix: `ds_${prefix}` };
}

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedText) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const parts = encryptedText.split(':');

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Verify Solana wallet signature
 */
function verifySolanaSignature(message, signature, publicKey) {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Generate authentication challenge
 */
function generateAuthChallenge(walletAddress) {
  const nonce = generateRandomString(16);
  const timestamp = Date.now();

  const message = `Sign this message to authenticate with DriftShield\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

  return {
    message,
    nonce,
    timestamp,
  };
}

/**
 * Hash data using SHA-256
 */
function sha256Hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomString,
  hashApiKey,
  generateApiKey,
  encrypt,
  decrypt,
  verifySolanaSignature,
  generateAuthChallenge,
  sha256Hash,
};
