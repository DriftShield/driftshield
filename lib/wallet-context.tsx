'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, User } from './api-client';
import bs58 from 'bs58';
import { SolanaWalletProvider } from '@/components/providers/solana-wallet-provider';

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  walletAddress: string | null;
  user: User | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    const checkAuth = async () => {
      const wasConnected = localStorage.getItem('wallet_connected');
      const savedAddress = localStorage.getItem('wallet_address');

      if (wasConnected === 'true' && savedAddress) {
        // Auto-reconnect to wallet
        try {
          const { solana } = window as any;
          if (solana) {
            const response = await solana.connect({ onlyIfTrusted: true });
            const publicKey = response.publicKey.toString();

            if (publicKey === savedAddress) {
              setWalletAddress(publicKey);
              const mockUser: User = {
                id: crypto.randomUUID(),
                walletAddress: publicKey,
                username: publicKey.slice(0, 8),
                displayName: `User ${publicKey.slice(0, 4)}`,
                role: 'user',
              };
              setUser(mockUser);
              setConnected(true);
            }
          }
        } catch (err) {
          // Auto-connect failed, user will need to manually connect
          console.log('Auto-connect failed:', err);
          localStorage.removeItem('wallet_connected');
          localStorage.removeItem('wallet_address');
        }
      }
    };

    checkAuth();
  }, []);

  const connect = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Check if Phantom wallet is installed
      const { solana } = window as any;

      if (!solana) {
        throw new Error('Please install Phantom wallet to continue');
      }

      // Connect to wallet
      const response = await solana.connect();
      const publicKey = response.publicKey.toString();
      setWalletAddress(publicKey);

      // For X402 demo: Create a mock user without backend authentication
      // In production, you would use the full authentication flow with apiClient
      const mockUser: User = {
        id: crypto.randomUUID(),
        walletAddress: publicKey,
        username: publicKey.slice(0, 8),
        displayName: `User ${publicKey.slice(0, 4)}`,
        role: 'user',
      };

      setUser(mockUser);
      setConnected(true);

      // Store connection state
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_address', publicKey);

    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      // Disconnect from Phantom
      const { solana } = window as any;
      if (solana) {
        await solana.disconnect();
      }

      setConnected(false);
      setWalletAddress(null);
      setUser(null);

      // Clear stored state
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('auth_token');
    } catch (err: any) {
      // Silently handle disconnect errors (they're usually harmless)
      // Just update the state regardless
      setConnected(false);
      setWalletAddress(null);
      setUser(null);
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('auth_token');
    }
  };

  return (
    <SolanaWalletProvider>
      <WalletContext.Provider
        value={{
          connected,
          connecting,
          walletAddress,
          user,
          connect,
          disconnect,
          error,
        }}
      >
        {children}
      </WalletContext.Provider>
    </SolanaWalletProvider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
