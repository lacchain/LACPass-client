import { REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } from '@config';
import { createClient, RedisClient } from 'redis';

export const createRedisClient = (): RedisClient => {
  const redisClient = createClient({
    host: REDIS_HOST as string,
    password: REDIS_PASSWORD as string,
    port: REDIS_PORT as string
  });
  redisClient.on('error', error => {
    console.error(`Redis error: ${error} \n
      Please check your Redis instance.`);
    process.exit(1);
  });

  return redisClient;
};
