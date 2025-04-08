const { createClient } = require('redis');

const client = createClient({
    url: process.env.REDIS_URL
});

(async () => {
    try {
        await client.connect();
        console.log('✅ Redis client connected');
    } catch (err) {
        console.error('❌ Redis connection failed:', err.message);
        // Không throw lỗi để tránh làm crash server
        // Bạn có thể gán client là null hoặc set cờ "redisAvailable = false"
    }
})();

client.on('error', (err) => {
    console.error('Redis error:', err.message);
});

module.exports = client;
