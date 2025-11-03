// API Client for DriftShield Backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';

export interface AuthChallenge {
  message: string;
  nonce: string;
  timestamp: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    walletAddress: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  };
}

export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  balance?: {
    available: number;
    lockedInMarkets: number;
    lockedInInsurance: number;
    claimableWinnings: number;
    total: number;
  };
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = `${API_URL}${API_BASE}`;
    // Try to load token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async requestChallenge(walletAddress: string): Promise<AuthChallenge> {
    return this.request<AuthChallenge>('/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  async verifySignature(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, message }),
    });

    this.setToken(response.token);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  }
}

export const apiClient = new ApiClient();
