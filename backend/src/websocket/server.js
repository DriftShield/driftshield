const WebSocket = require('ws');
const { verify } = require('jsonwebtoken');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // Map of channel -> Set of client IDs
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Set up Redis pub/sub for broadcasting
    this.setupRedisPubSub();

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, req) {
    const clientId = this.generateClientId();
    ws.clientId = clientId;
    ws.userId = null;
    ws.subscriptions = new Set();
    ws.isAlive = true;

    logger.info('New WebSocket connection', { clientId });

    // Set up ping/pong for connection health
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(ws, data);
      } catch (error) {
        logger.error('WebSocket message error', {
          error: error.message,
          clientId,
        });
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        error: error.message,
        clientId,
      });
    });

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      clientId,
      message: 'Connected to DriftShield WebSocket server',
    });
  }

  /**
   * Handle incoming message
   */
  async handleMessage(ws, data) {
    const { type, payload } = data;

    switch (type) {
      case 'authenticate':
        await this.handleAuthenticate(ws, payload);
        break;

      case 'subscribe':
        await this.handleSubscribe(ws, payload);
        break;

      case 'unsubscribe':
        await this.handleUnsubscribe(ws, payload);
        break;

      case 'ping':
        this.send(ws, { type: 'pong' });
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle authentication
   */
  async handleAuthenticate(ws, payload) {
    const { token } = payload;

    if (!token) {
      this.sendError(ws, 'Token required');
      return;
    }

    try {
      // Verify JWT token
      const decoded = verify(token, process.env.JWT_SECRET);

      ws.userId = decoded.userId;
      ws.authenticated = true;

      // Store connection
      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId).add(ws);

      logger.info('WebSocket authenticated', {
        clientId: ws.clientId,
        userId: decoded.userId,
      });

      this.send(ws, {
        type: 'authenticated',
        userId: decoded.userId,
      });

      // Auto-subscribe to user's channel
      await this.subscribe(ws, `user:${decoded.userId}`);
    } catch (error) {
      logger.error('WebSocket authentication failed', {
        error: error.message,
        clientId: ws.clientId,
      });
      this.sendError(ws, 'Authentication failed');
    }
  }

  /**
   * Handle subscribe request
   */
  async handleSubscribe(ws, payload) {
    const { channels } = payload;

    if (!Array.isArray(channels)) {
      this.sendError(ws, 'Channels must be an array');
      return;
    }

    for (const channel of channels) {
      await this.subscribe(ws, channel);
    }

    this.send(ws, {
      type: 'subscribed',
      channels,
    });
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(ws, payload) {
    const { channels } = payload;

    if (!Array.isArray(channels)) {
      this.sendError(ws, 'Channels must be an array');
      return;
    }

    for (const channel of channels) {
      this.unsubscribe(ws, channel);
    }

    this.send(ws, {
      type: 'unsubscribed',
      channels,
    });
  }

  /**
   * Subscribe to a channel
   */
  subscribe(ws, channel) {
    // Add to client's subscriptions
    ws.subscriptions.add(channel);

    // Add to channel's subscribers
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(ws.clientId);

    logger.debug('Client subscribed', {
      clientId: ws.clientId,
      channel,
    });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(ws, channel) {
    ws.subscriptions.delete(channel);

    if (this.subscriptions.has(channel)) {
      this.subscriptions.get(channel).delete(ws.clientId);

      if (this.subscriptions.get(channel).size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    logger.debug('Client unsubscribed', {
      clientId: ws.clientId,
      channel,
    });
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(ws) {
    logger.info('WebSocket disconnected', {
      clientId: ws.clientId,
      userId: ws.userId,
    });

    // Remove from clients map
    if (ws.userId && this.clients.has(ws.userId)) {
      this.clients.get(ws.userId).delete(ws);

      if (this.clients.get(ws.userId).size === 0) {
        this.clients.delete(ws.userId);
      }
    }

    // Remove from all subscriptions
    for (const channel of ws.subscriptions) {
      if (this.subscriptions.has(channel)) {
        this.subscriptions.get(channel).delete(ws.clientId);

        if (this.subscriptions.get(channel).size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }
  }

  /**
   * Set up Redis pub/sub for broadcasting
   */
  setupRedisPubSub() {
    // Create a separate Redis client for subscribing
    const Redis = require('ioredis');
    this.redisSub = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

    // Subscribe to all update channels
    this.redisSub.psubscribe('updates:*', (err, count) => {
      if (err) {
        logger.error('Redis psubscribe error', { error: err.message });
      } else {
        logger.info(`Subscribed to ${count} Redis channels`);
      }
    });

    // Handle messages from Redis
    this.redisSub.on('pmessage', (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        this.broadcastToChannel(channel.replace('updates:', ''), data);
      } catch (error) {
        logger.error('Redis message parse error', { error: error.message });
      }
    });
  }

  /**
   * Broadcast message to a channel
   */
  broadcastToChannel(channel, data) {
    if (!this.subscriptions.has(channel)) {
      return;
    }

    const subscribers = this.subscriptions.get(channel);
    let sentCount = 0;

    this.wss.clients.forEach((client) => {
      if (subscribers.has(client.clientId) && client.readyState === WebSocket.OPEN) {
        this.send(client, {
          type: 'broadcast',
          channel,
          data,
        });
        sentCount++;
      }
    });

    logger.debug('Broadcast sent', {
      channel,
      subscribers: sentCount,
    });
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, data) {
    if (!this.clients.has(userId)) {
      return;
    }

    const connections = this.clients.get(userId);

    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, data);
      }
    });
  }

  /**
   * Send message to WebSocket client
   */
  send(ws, data) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error('WebSocket send error', { error: error.message });
    }
  }

  /**
   * Send error message
   */
  sendError(ws, message) {
    this.send(ws, {
      type: 'error',
      error: message,
    });
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Start heartbeat interval to check connection health
   */
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          logger.warn('Terminating inactive WebSocket', { clientId: ws.clientId });
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      authenticatedUsers: this.clients.size,
      totalSubscriptions: this.subscriptions.size,
      channels: Array.from(this.subscriptions.keys()),
    };
  }
}

// Export singleton instance
module.exports = new WebSocketServer();

