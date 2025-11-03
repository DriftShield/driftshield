'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  createRegisterModelInstruction,
  createPurchasePolicyInstruction,
  createMarketInstruction,
  createPlaceBetInstruction,
  PROGRAM_IDS,
} from '@/lib/solana/instructions';

export default function ProgramsPage() {
  const { connected, walletAddress, connect } = useWallet();
  const [activeTab, setActiveTab] = useState<'model' | 'insurance' | 'market'>('model');
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Model Registration Form
  const [modelForm, setModelForm] = useState({
    modelId: '',
    name: '',
    modelType: '',
    framework: '',
    baselineAccuracy: '',
  });

  // Insurance Form
  const [insuranceForm, setInsuranceForm] = useState({
    modelPubkey: '',
    coverageAmount: '',
    premium: '',
    accuracyThreshold: '',
    durationDays: '',
  });

  // Prediction Market Form
  const [marketForm, setMarketForm] = useState({
    modelPubkey: '',
    question: '',
    minStake: '',
    resolutionTime: '',
  });

  const handleRegisterModel = async () => {
    if (!window.solana || !walletAddress) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTxSignature(null);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const owner = new PublicKey(walletAddress);

      // Create register model instruction
      const { instruction, modelPDA } = createRegisterModelInstruction(
        owner,
        modelForm.modelId,
        modelForm.name,
        modelForm.modelType,
        modelForm.framework,
        parseFloat(modelForm.baselineAccuracy)
      );

      // Build transaction
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = owner;

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction
      const signed = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      setTxSignature(signature);
      alert(`✅ Model registered successfully!\n\nModel PDA: ${modelPDA.toString()}\n\nView on Solana Explorer`);

    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseInsurance = async () => {
    if (!window.solana || !walletAddress) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTxSignature(null);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const owner = new PublicKey(walletAddress);
      const modelPubkey = new PublicKey(insuranceForm.modelPubkey);

      // Create purchase policy instruction
      const { instruction, policyPDA } = createPurchasePolicyInstruction(
        owner,
        modelPubkey,
        parseFloat(insuranceForm.coverageAmount),
        parseFloat(insuranceForm.premium),
        parseFloat(insuranceForm.accuracyThreshold),
        parseInt(insuranceForm.durationDays)
      );

      // Build transaction
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = owner;

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction
      const signed = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      setTxSignature(signature);
      alert(`✅ Insurance policy purchased!\n\nPolicy PDA: ${policyPDA.toString()}\n\nCoverage: ${insuranceForm.coverageAmount} USDC`);

    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarket = async () => {
    if (!window.solana || !walletAddress) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTxSignature(null);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const creator = new PublicKey(walletAddress);
      const modelPubkey = new PublicKey(marketForm.modelPubkey);
      const resolutionDate = new Date(marketForm.resolutionTime);

      // Create market instruction
      const { instruction, marketPDA } = createMarketInstruction(
        creator,
        modelPubkey,
        marketForm.question,
        parseFloat(marketForm.minStake),
        resolutionDate
      );

      // Build transaction
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = creator;

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction
      const signed = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      setTxSignature(signature);
      alert(`✅ Prediction market created!\n\nMarket PDA: ${marketPDA.toString()}\n\nQuestion: ${marketForm.question}`);

    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-card p-8 rounded-lg border text-center space-y-4">
          <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Connect your Phantom wallet to interact with deployed programs on Solana Devnet
          </p>
          <button
            onClick={connect}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">🔗 Program Interactions</h1>
          <p className="text-muted-foreground">
            Interact with your deployed Solana programs on Devnet
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Connected: <span className="font-mono">{walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('model')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'model'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Model Registry
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'insurance'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Insurance
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'market'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Prediction Markets
          </button>
        </div>

        {/* Program Info */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">Model Registry</h3>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {PROGRAM_IDS.modelRegistry.toString()}
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">Insurance</h3>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {PROGRAM_IDS.insurance.toString()}
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">Prediction Market</h3>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {PROGRAM_IDS.predictionMarket.toString()}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-card p-8 rounded-lg border">
          {activeTab === 'model' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Register New Model</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Model ID</label>
                  <input
                    type="text"
                    value={modelForm.modelId}
                    onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                    placeholder="my-sentiment-model"
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model Name</label>
                  <input
                    type="text"
                    value={modelForm.name}
                    onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                    placeholder="Customer Sentiment Analyzer"
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Model Type</label>
                    <select
                      value={modelForm.modelType}
                      onChange={(e) => setModelForm({ ...modelForm, modelType: e.target.value })}
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    >
                      <option value="">Select type...</option>
                      <option value="classification">Classification</option>
                      <option value="regression">Regression</option>
                      <option value="nlp">NLP</option>
                      <option value="computer_vision">Computer Vision</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Framework</label>
                    <select
                      value={modelForm.framework}
                      onChange={(e) => setModelForm({ ...modelForm, framework: e.target.value })}
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    >
                      <option value="">Select framework...</option>
                      <option value="pytorch">PyTorch</option>
                      <option value="tensorflow">TensorFlow</option>
                      <option value="sklearn">Scikit-learn</option>
                      <option value="huggingface">Hugging Face</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Baseline Accuracy (%)
                  </label>
                  <input
                    type="number"
                    value={modelForm.baselineAccuracy}
                    onChange={(e) => setModelForm({ ...modelForm, baselineAccuracy: e.target.value })}
                    placeholder="92.5"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your model's current accuracy on validation data
                  </p>
                </div>

                <button
                  onClick={handleRegisterModel}
                  disabled={loading || !modelForm.modelId || !modelForm.name}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Register Model on Blockchain'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'insurance' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Purchase Insurance Policy</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Model Public Key</label>
                  <input
                    type="text"
                    value={insuranceForm.modelPubkey}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, modelPubkey: e.target.value })}
                    placeholder="Enter model PDA address"
                    className="w-full px-4 py-2 bg-background border rounded-lg font-mono text-sm"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Coverage Amount (USDC)</label>
                    <input
                      type="number"
                      value={insuranceForm.coverageAmount}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, coverageAmount: e.target.value })}
                      placeholder="1000"
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Premium (USDC)</label>
                    <input
                      type="number"
                      value={insuranceForm.premium}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, premium: e.target.value })}
                      placeholder="100"
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Accuracy Threshold (%)</label>
                    <input
                      type="number"
                      value={insuranceForm.accuracyThreshold}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, accuracyThreshold: e.target.value })}
                      placeholder="85"
                      step="0.1"
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pay out if accuracy falls below this
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (Days)</label>
                    <input
                      type="number"
                      value={insuranceForm.durationDays}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, durationDays: e.target.value })}
                      placeholder="30"
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePurchaseInsurance}
                  disabled={loading || !insuranceForm.modelPubkey}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Purchase Insurance'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'market' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Create Prediction Market</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Model Public Key</label>
                  <input
                    type="text"
                    value={marketForm.modelPubkey}
                    onChange={(e) => setMarketForm({ ...marketForm, modelPubkey: e.target.value })}
                    placeholder="Enter model PDA address"
                    className="w-full px-4 py-2 bg-background border rounded-lg font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Market Question</label>
                  <input
                    type="text"
                    value={marketForm.question}
                    onChange={(e) => setMarketForm({ ...marketForm, question: e.target.value })}
                    placeholder="Will this model maintain >90% accuracy for 30 days?"
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Stake (USDC)</label>
                    <input
                      type="number"
                      value={marketForm.minStake}
                      onChange={(e) => setMarketForm({ ...marketForm, minStake: e.target.value })}
                      placeholder="10"
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Resolution Date</label>
                    <input
                      type="date"
                      value={marketForm.resolutionTime}
                      onChange={(e) => setMarketForm({ ...marketForm, resolutionTime: e.target.value })}
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateMarket}
                  disabled={loading || !marketForm.modelPubkey}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Create Market'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {txSignature && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-800 font-medium mb-2">Transaction Successful!</p>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on Solana Explorer →
            </a>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-6 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            ℹ️ How This Works
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Your programs are deployed on Solana Devnet</li>
            <li>• Each interaction creates a PDA (Program Derived Address) for your data</li>
            <li>• Transactions are signed with your Phantom wallet</li>
            <li>• All data is stored permanently on-chain</li>
            <li>• Full transaction implementation requires the program IDL files</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
