declare module 'redis' {
  export interface RedisClientType {
    connect(): Promise<void>;
    quit(): Promise<string>;
    on(event: string, listener: (...args: any[]) => void): this;
    [key: string]: any;
  }

  export function createClient(config?: any): RedisClientType;
}
