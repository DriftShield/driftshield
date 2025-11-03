/**
 * Admin configuration
 * Only this address can create and resolve markets
 */
export const ADMIN_WALLET = '9wfAUGMwbVQ28qZN5iCFffzwbMVpKs1UemazQeHZv3xd';

/**
 * Check if a wallet address is the admin
 */
export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress === ADMIN_WALLET;
}
