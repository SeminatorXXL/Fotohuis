const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.2.22',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || ''
});

let isHealthy = true;
let lastError = null;
let healthCheckStarted = false;
const listeners = new Set();

function emitStatus() {
  const snapshot = { isHealthy, lastError };
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[db] status listener failed:', err);
    }
  }
}

function setHealth(nextHealthy, err = null) {
  const changed = isHealthy !== nextHealthy;
  isHealthy = nextHealthy;
  lastError = err || null;

  if (!changed) return;

  if (isHealthy) {
    console.log('[db] Connection restored');
  } else {
    console.error('[db] Connection lost:', err?.message || err);
  }

  emitStatus();
}

async function checkHealth() {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
      setHealth(true, null);
    } finally {
      connection.release();
    }
  } catch (err) {
    setHealth(false, err);
  }
}

function startHealthCheck(intervalMs = 30000) {
  if (healthCheckStarted) return;
  healthCheckStarted = true;

  void checkHealth();
  setInterval(() => {
    void checkHealth();
  }, intervalMs).unref();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function markUnhealthy(err) {
  setHealth(false, err);
}

const db = {
  async query(...args) {
    try {
      const result = await pool.query(...args);
      if (!isHealthy) setHealth(true, null);
      return result;
    } catch (err) {
      markUnhealthy(err);
      throw err;
    }
  },

  async execute(...args) {
    try {
      const result = await pool.execute(...args);
      if (!isHealthy) setHealth(true, null);
      return result;
    } catch (err) {
      markUnhealthy(err);
      throw err;
    }
  },

  async getConnection(...args) {
    try {
      const connection = await pool.getConnection(...args);
      if (!isHealthy) setHealth(true, null);
      return connection;
    } catch (err) {
      markUnhealthy(err);
      throw err;
    }
  },

  end(...args) {
    return pool.end(...args);
  },

  startHealthCheck,
  checkHealth,
  subscribe,
  isHealthy: () => isHealthy,
  getLastError: () => lastError
};

module.exports = db;
