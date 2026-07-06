declare module 'fastify-socket.io' {
  import { FastifyInstance } from 'fastify';
  const plugin: (instance: FastifyInstance, options?: any, done?: (err?: Error) => void) => void;
  export default plugin;
}
