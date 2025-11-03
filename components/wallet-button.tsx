'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (publicKey) {
    const address = publicKey.toString();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 w-full justify-start">
            <Wallet className="h-4 w-4" />
            <span className="font-mono text-xs">
              {address.slice(0, 4)}...{address.slice(-4)}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground truncate">
                {address.slice(0, 12)}...{address.slice(-12)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-7 w-7 p-0"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="gap-2 text-red-600 cursor-pointer">
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="gap-2 w-full"
      variant="default"
    >
      <Wallet className="h-4 w-4" />
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
