import { CallAnalysisType } from '../types';
import { SERVER_CONFIG } from '../config/server';

export class StreamingAnalyzer {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private analysisHistory: Array<Partial<CallAnalysisType>> = [];
  private chunkCount = 0;

  constructor(
    private onAnalysisUpdate: (analysis: Partial<CallAnalysisType>) => void,
    private onError: (error: string) => void
  ) {
    // Bind all methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendAudio = this.sendAudio.bind(this);
    this.clearTimeouts = this.clearTimeouts.bind(this);
    this.handleConnectionError = this.handleConnectionError.bind(this);
  }

  private clearTimeouts(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private handleAnalysisResponse(response: any) {
    try {
      if (response.suspicious !== undefined) {
        const analysis: Partial<CallAnalysisType> = {
          suspicious: response.suspicious,
          confidence: response.confidence,
          sentiments: response.sentiments,
          reasons: response.reasons,
          timestamps: response.timestamps.map((t: any) => ({
            start: t.start,
            end: t.end,
            text: t.text,
            type: t.type as "otp" | "remote_access" | "social_engineering"
          }))
        };
        
        this.onAnalysisUpdate(analysis);
      }
    } catch (error) {
      console.error('Error processing analysis response:', error);
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.shouldReconnect) return reject('Connection not allowed');
      
      this.clearTimeouts();
      if (this.ws) this.disconnect();
  
      try {
        console.log('🔌 Connecting to WebSocket:', SERVER_CONFIG.WS_URL);
        
        this.ws = new WebSocket(`${SERVER_CONFIG.WS_URL}/ws`);
        this.shouldReconnect = true;
  
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };
  
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
          this.handleConnectionError();
        };

        this.ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log('Received WebSocket response:', response);
            this.handleAnalysisResponse(response);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
  
        // Add connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
            this.handleConnectionError();
          }
        }, 5000); // 5 second timeout
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        reject(error);
        this.handleConnectionError();
      }
    });
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');
    this.shouldReconnect = false;
    this.clearTimeouts();
    
    if (this.ws) {
      try {
        this.ws.close();
        this.ws = null;
        this.isConnected = false;
        console.log('✅ WebSocket disconnected cleanly');
      } catch (error) {
        console.error('❌ Error closing WebSocket:', error);
      }
    }
  }

  private handleConnectionError(): void {
    this.clearTimeouts();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.shouldReconnect) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.reconnectTimeout = setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.onError('Failed to establish WebSocket connection');
    }
  }

  sendAudio(base64Audio: string): void {
    if (this.ws && this.isConnected) {
      try {
        this.ws.send(base64Audio);
        console.log('Sent audio chunk:', {
          length: base64Audio.length
        });
      } catch (error) {
        console.error('Error sending audio:', error);
        this.onError('Failed to send audio data');
      }
    } else {
      console.warn('WebSocket not connected, state:', {
        wsExists: !!this.ws,
        isConnected: this.isConnected
      });
      this.connect();
    }
  }
}