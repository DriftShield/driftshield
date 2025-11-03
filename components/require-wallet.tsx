'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/lib/wallet-context';
import { Card } from '@/components/ui/card';
import { WalletButton } from '@/components/wallet-button';
import { Shield } from 'lucide-react';

export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { connected, connecting } = useWallet();
  const router = useRouter();

  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="glass p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold">Connecting...</h2>
          <p className="text-muted-foreground">Please wait while we connect to your wallet</p>
        </Card>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your Solana wallet to access the dashboard and start monitoring your AI models.
            </p>
          </div>
          <WalletButton />
          <div className="text-sm text-muted-foreground">
            Don't have a wallet?{' '}
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Install Phantom
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
