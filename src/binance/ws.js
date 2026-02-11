const WebSocket = require('ws');
const klinesCache = require('./klinesCache');

const WS_BASE_URL = 'wss://fstream.binance.com';

/**
 * WebSocket manager for Binance kline streams with auto-reconnect
 */
class BinanceWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 60000; // Max 60 seconds
    this.isConnected = false;
    this.subscriptions = [];
    this.pingInterval = null;
    this.onCandleClosedCallback = null;
  }

  /**
   * Subscribe to combined kline streams for multiple symbols and timeframes
   * @param {Array<string>} symbols - Array of symbols to subscribe
   * @param {Array<string>} timeframes - Array of timeframes to subscribe
   * @param {Function} onCandleClosed - Callback when a candle closes
   */
  connect(symbols, timeframes, onCandleClosed) {
    this.onCandleClosedCallback = onCandleClosed;
    
    // Build stream names: btcusdt@kline_1m/ethusdt@kline_1h
    const streams = [];
    for (const symbol of symbols) {
      for (const tf of timeframes) {
        streams.push(`${symbol.toLowerCase()}@kline_${tf}`);
      }
    }
    
    this.subscriptions = streams;
    const streamUrl = `${WS_BASE_URL}/stream?streams=${streams.join('/')}`;
    
    console.log(`[WS] Connecting to Binance WebSocket...`);
    console.log(`[WS] Subscribing to ${streams.length} streams`);
    
    this.ws = new WebSocket(streamUrl);
    
    this.ws.on('open', () => {
      console.log('[WS] Connected to Binance WebSocket');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Start ping interval to keep connection alive
      this.startPing();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        // Handle combined stream format
        if (message.stream && message.data) {
          this.handleKlineMessage(message.data);
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err.message);
      }
    });

    this.ws.on('error', (err) => {
      console.error('[WS] WebSocket error:', err.message);
    });

    this.ws.on('close', () => {
      console.log('[WS] WebSocket connection closed');
      this.isConnected = false;
      this.stopPing();
      
      // Attempt to reconnect with exponential backoff
      this.reconnect(symbols, timeframes, onCandleClosed);
    });
  }

  /**
   * Handle incoming kline message
   */
  handleKlineMessage(data) {
    const k = data.k;
    
    // Only process closed candles
    if (!k.x) {
      return;
    }

    const symbol = data.s;
    const timeframe = k.i;
    
    const candle = {
      openTime: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      closeTime: k.T,
      quoteVolume: parseFloat(k.q),
      trades: k.n,
      takerBuyBaseVolume: parseFloat(k.V),
      takerBuyQuoteVolume: parseFloat(k.Q),
      isClosed: k.x
    };

    // Update cache
    klinesCache.updateCandle(symbol, timeframe, candle);
    
    console.log(`[WS] Closed candle: ${symbol} ${timeframe} @ ${candle.close}`);
    
    // Trigger callback
    if (this.onCandleClosedCallback) {
      this.onCandleClosedCallback(symbol, timeframe, candle);
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  reconnect(symbols, timeframes, onCandleClosed) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached. Please restart the application.');
      return;
    }

    this.reconnectAttempts++;
    
    console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(symbols, timeframes, onCandleClosed);
    }, this.reconnectDelay);

    // Exponential backoff: double the delay, up to max
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Close WebSocket connection
   */
  close() {
    console.log('[WS] Closing WebSocket connection');
    this.stopPing();
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = new BinanceWebSocket();
