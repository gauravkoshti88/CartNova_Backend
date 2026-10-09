import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy(times) {
    return Math.min(times * 500, 3000);
  },
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.on("ready", () => {
  console.log("Redis is ready");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export default redis;
