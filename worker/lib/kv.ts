/**
 * KV Helper — D1-backed key-value storage with in-memory cache
 *
 * When no KV binding exists, uses the D1 kvstore table.
 * Uses in-memory cache to reduce D1 reads.
 */

const CACHE_TTL = 60_000; // 60 seconds
const cache = new Map<string, { value: string; expires: number }>();

export interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * Create KV store based on available binding
 * Uses KV if bound, otherwise D1
 */
export function createKV(env: any): KVStore {
  // If KV namespace binding exists
  if (env.KV?.get) {
    return {
      async get(key) {
        return env.KV.get(key);
      },
      async put(key, value) {
        await env.KV.put(key, value);
      },
      async delete(key) {
        await env.KV.delete(key);
      },
      async list(prefix) {
        const keys = await env.KV.list({ prefix });
        return keys.keys.map((k: any) => k.name);
      },
    };
  }

  // D1-backed KV with cache
  return {
    async get(key: string): Promise<string | null> {
      // Check cache
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }

      // Read from D1
      const row = (await env.DB.prepare('SELECT v FROM kvstore WHERE k = ?')
        .bind(key)
        .first()) as { v: string } | null;

      const value = row?.v ?? null;

      // Store in cache
      if (value !== null) {
        cache.set(key, { value, expires: Date.now() + CACHE_TTL });
      }

      return value;
    },

    async put(key: string, value: string): Promise<void> {
      // Store in D1
      await env.DB.prepare(
        'INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES (?, ?, ?)'
      )
        .bind(key, value, Date.now())
        .run();

      // Update cache
      cache.set(key, { value, expires: Date.now() + CACHE_TTL });
    },

    async delete(key: string): Promise<void> {
      await env.DB.prepare('DELETE FROM kvstore WHERE k = ?')
        .bind(key)
        .run();

      cache.delete(key);
    },

    async list(prefix?: string): Promise<string[]> {
      let query = 'SELECT k FROM kvstore';
      const params: any[] = [];

      if (prefix) {
        query += ' WHERE k LIKE ?';
        params.push(`${prefix}%`);
      }

      const stmt = env.DB.prepare(query);
      const rows = params.length
        ? await stmt.bind(...params).all()
        : await stmt.all();
      const results = (rows.results || []) as { k: string }[];
      return results.map((r) => r.k);
    },
  };
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  cache.clear();
}
