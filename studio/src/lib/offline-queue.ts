/**
 * Offline Queue System
 * Queues failed requests and retries them when connection is restored
 */

interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly STORAGE_KEY = 'offline-queue';
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.loadFromStorage();
    
    // Process queue when back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Connection restored, processing queue...');
        this.processQueue();
      });

      // Process queue on initialization if online
      if (navigator.onLine) {
        this.processQueue();
      }
    }
  }

  /**
   * Add a request to the queue
   */
  async add(url: string, options: RequestInit = {}): Promise<void> {
    // Don't queue if we're online and can make the request immediately
    if (navigator.onLine) {
      try {
        await fetch(url, options);
        return;
      } catch (error) {
        console.log('Request failed, adding to queue:', error);
      }
    }

    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      url,
      options,
      timestamp: Date.now(),
    };

    this.queue.push(request);
    
    // Limit queue size
    if (this.queue.length > this.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
    }
    
    this.saveToStorage();

    console.log(`📴 Request queued (${this.queue.length} in queue)`);
  }

  /**
   * Process all queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`🔄 Processing ${this.queue.length} queued requests...`);

    let successCount = 0;
    let failCount = 0;

    while (this.queue.length > 0 && navigator.onLine) {
      const request = this.queue[0];
      
      try {
        const response = await fetch(request.url, request.options);
        
        if (response.ok) {
          this.queue.shift(); // Remove from queue
          successCount++;
          this.saveToStorage();
        } else {
          console.error(`Failed to process queued request: ${response.status}`);
          failCount++;
          break; // Stop processing on error
        }
      } catch (error) {
        console.error('Failed to process queued request:', error);
        failCount++;
        break; // Stop processing on error
      }
    }

    this.processing = false;

    if (successCount > 0) {
      console.log(`✅ Processed ${successCount} queued requests`);
    }
    if (failCount > 0) {
      console.log(`❌ Failed to process ${failCount} requests`);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { count: number; processing: boolean; online: boolean } {
    return {
      count: this.queue.length,
      processing: this.processing,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.saveToStorage();
    console.log('🗑️ Queue cleared');
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} queued requests from storage`);
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

/**
 * Hook to use offline queue in React components
 */
export function useOfflineQueue() {
  const [status, setStatus] = React.useState(offlineQueue.getStatus());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(offlineQueue.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...status,
    add: offlineQueue.add.bind(offlineQueue),
    clear: offlineQueue.clear.bind(offlineQueue),
  };
}

// For non-React usage
import React from 'react';

// Made with Bob
