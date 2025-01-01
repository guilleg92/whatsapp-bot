const { promisify } = require('util');

class RedisStore {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.getAsync = promisify(redisClient.get).bind(redisClient);
    this.setAsync = promisify(redisClient.set).bind(redisClient);
    this.delAsync = promisify(redisClient.del).bind(redisClient);
  }

  async set(key, value) {
    try {
      await this.setAsync(key, JSON.stringify(value));
    } catch (err) {
      console.error('Error al guardar en Redis:', err);
    }
  }

  async get(key) {
    try {
      const data = await this.getAsync(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Error al obtener de Redis:', err);
      return null;
    }
  }

  async remove(key) {
    try {
      await this.delAsync(key);
    } catch (err) {
      console.error('Error al eliminar de Redis:', err);
    }
  }
}

module.exports = RedisStore;
