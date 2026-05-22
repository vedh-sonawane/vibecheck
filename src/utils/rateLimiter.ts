export class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private running = false;
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.running) {
        this.process();
      }
    });
  }
  
  private async process() {
    this.running = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 req/sec
      }
    }
    
    this.running = false;
  }
}

export const limiter = new RateLimiter();