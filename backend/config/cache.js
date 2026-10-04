// High-performance in-memory TTL cache to eliminate redundant Supabase cloud round-trips
const store = new Map();

function get(key) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return null;
  }
  return item.data;
}

function set(key, data, ttlSeconds = 30) {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

function del(key) {
  store.delete(key);
}

function delPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

module.exports = {
  get,
  set,
  del,
  delPrefix
};
