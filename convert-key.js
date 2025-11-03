const { Keypair } = require('@solana/web3.js');
const bs58Module = require('bs58');
const bs58 = bs58Module.default || bs58Module;
const fs = require('fs');

// Your base58 private key
const base58PrivateKey = '3ej67ZNkUmGmtcmWSxeHq9up7e4RhY5eEafMJpsk3hPNaZLF9uCBSDAcCcP7EgnG5Edh2c5yYwdEbqrsmREarrF3';

try {
  // Decode base58 to Uint8Array
  const decoded = bs58.decode(base58PrivateKey);

  // Convert to regular array
  const keyArray = Array.from(decoded);

  // Write to file
  fs.writeFileSync('/tmp/devnet-keypair.json', JSON.stringify(keyArray));

  console.log('✅ Keypair converted and saved to /tmp/devnet-keypair.json');
  console.log('Public key:', Keypair.fromSecretKey(decoded).publicKey.toBase58());
} catch (error) {
  console.error('❌ Error:', error.message);
}
