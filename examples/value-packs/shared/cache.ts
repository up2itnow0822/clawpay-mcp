/**
 * shared/cache.ts — File-based cache with TTL
 *
 * Prevents double-paying for the same data within a configurable time window.
 * Cache entries are stored as JSON in a local .cache/ directory.
 *
 * Usage:
 *   const cache = new FileCache({ ttlMs: 60 * 60 * 1000 }); // 1-hour TTL
 *   cache.set('btc-price', { price: 42000 });
 *   const hit = cache.get<{ price: number }>('btc-price');
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number; // Unix ms timestamp
  cachedAt: number;
  source?: string;   // URL or endpoint that produced this data
}

export interface CacheOptions {
  /** Cache directory (default: ./.cache) */
  dir?: string;
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttlMs?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  saves: number;
}

// ─── FileCache ─────────────────────────────────────────────────────────────

export class FileCache {
  private readonly dir: string;
  private readonly ttlMs: number;
  private readonly stats: CacheStats = { hits: 0, misses: 0, saves: 0 };

  constructor(opts: CacheOptions = {}) {
    this.dir = opts.dir ?? path.join(process.cwd(), '.cache');
    this.ttlMs = opts.ttlMs ?? 60 * 60 * 1000; // 1 hour default
    this.ensureDir();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Retrieve a cached value. Returns null on miss or expiry.
   */
  get<T>(key: string): T | null {
    const filePath = this.keyToPath(key);

    if (!fs.existsSync(filePath)) {
      this.stats.misses++;
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const entry: CacheEntry<T> = JSON.parse(raw);

      if (Date.now() > entry.expiresAt) {
        // Expired — remove and return null
        fs.unlinkSync(filePath);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value;
    } catch {
      // Corrupted entry — treat as miss
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store a value in the cache with TTL.
   */
  set<T>(key: string, value: T, opts: { ttlMs?: number; source?: string } = {}): void {
    const ttl = opts.ttlMs ?? this.ttlMs;
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + ttl,
      cachedAt: Date.now(),
      source: opts.source,
    };

    const filePath = this.keyToPath(key);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf8');
    this.stats.saves++;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache entry metadata (including timestamps).
   */
  getEntry<T>(key: string): CacheEntry<T> | null {
    const filePath = this.keyToPath(key);

    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath);
        return null;
      }
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    const filePath = this.keyToPath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    const files = fs.readdirSync(this.dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      fs.unlinkSync(path.join(this.dir, file));
    }
  }

  /**
   * Remove expired entries from disk.
   */
  prune(): number {
    const files = fs.readdirSync(this.dir).filter((f) => f.endsWith('.json'));
    let removed = 0;
    for (const file of files) {
      const filePath = path.join(this.dir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const entry = JSON.parse(raw) as CacheEntry<unknown>;
        if (Date.now() > entry.expiresAt) {
          fs.unlinkSync(filePath);
          removed++;
        }
      } catch {
        fs.unlinkSync(filePath);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Return hit/miss/save stats for this session.
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Return how many milliseconds remain until a key expires.
   * Returns 0 if the key doesn't exist or is expired.
   */
  ttlRemaining(key: string): number {
    const filePath = this.keyToPath(key);
    if (!fs.existsSync(filePath)) return 0;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const entry = JSON.parse(raw) as CacheEntry<unknown>;
      const remaining = entry.expiresAt - Date.now();
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private keyToPath(key: string): string {
    // Hash the key so any string is a valid filename
    const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    return path.join(this.dir, `${safe}_${hash}.json`);
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }
}

// ─── Module-level singleton ────────────────────────────────────────────────

let _defaultCache: FileCache | null = null;

export function getDefaultCache(opts?: CacheOptions): FileCache {
  if (!_defaultCache) {
    _defaultCache = new FileCache(opts);
  }
  return _defaultCache;
}
