const x = class x {
};
x.ERROR = 0, x.WARN = 1, x.INFO = 2, x.DEBUG = 3, x.TRACE = 4;
let d = x;
const B = {
  warn: d.WARN
}, N = {
  0: "ERROR",
  1: "WARN",
  2: "INFO",
  3: "DEBUG",
  4: "TRACE"
}, $ = {
  0: console.error,
  1: console.error,
  2: console.log,
  3: console.log,
  4: console.log
};
class _ {
  constructor(t) {
    this.namespace = t, this.level = B.warn;
  }
  shouldLog(t) {
    return t <= this.level;
  }
  doLog(t, e, ...i) {
    const n = `[${this.namespace}:${N[t]}]`;
    typeof e == "string" ? $[t](`${n} ${e}`, ...i) : $[t](n, e, ...i);
  }
  log(t, e, ...i) {
    this.shouldLog(t) && this.doLog(t, e, ...i);
  }
  /**
   * Log debug information (verbose output for development)
   * Supports printf-style formatting: logger.debug('Value: %s, Count: %d', value, count)
   */
  trace(t, ...e) {
  }
  /**
   * Log debug information (verbose output for development)
   * Supports printf-style formatting: logger.debug('Value: %s, Count: %d', value, count)
   */
  debug(t, ...e) {
  }
  /**
   * Log general information
   * Supports printf-style formatting: logger.info('User %s logged in', username)
   */
  info(t, ...e) {
  }
  /**
   * Log warnings
   * Supports printf-style formatting: logger.warn('Timeout after %dms', timeout)
   */
  warn(t, ...e) {
    this.log(d.WARN, t, ...e);
  }
  /**
   * Log errors
   * Supports printf-style formatting: logger.error('Failed to load %s: %o', file, error)
   */
  error(t, ...e) {
    this.log(d.ERROR, t, ...e);
  }
  getTimeLabel(t, e) {
    return `[${this.namespace}:${N[t]}] ${e}`;
  }
  doTime(t, e) {
    console.time(this.getTimeLabel(t, e));
  }
  doTimeEnd(t, e) {
    console.timeEnd(this.getTimeLabel(t, e));
  }
  /**
   * Log with timing information
   * Useful for performance debugging
   */
  timeLevel(t, e) {
  }
  /**
   * End timing and log duration
   */
  timeEndLevel(t, e) {
  }
  /**
   * Log with timing information
   * Useful for performance debugging
   */
  time(t) {
    this.doTime(d.INFO, t);
  }
  /**
   * End timing and log duration
   */
  timeEnd(t) {
    this.doTimeEnd(d.INFO, t);
  }
  logDir(t, e, i, n) {
    this.doLog(t, "DIR %s", e), console.dir(i, n);
  }
  /**
   * Display an interactive list of object properties
   * Useful for exploring complex objects in development
   * @param obj - The object to inspect
   * @param options - Optional display options
   */
  dirLevel(t, e, i, n) {
  }
  /**
   * Display an interactive list of object properties
   * Useful for exploring complex objects in development
   * @param obj - The object to inspect
   * @param options - Optional display options
   */
  dir(t, e, i) {
    this.logDir(d.INFO, t, e, i);
  }
  /**
   * Clear the console
   */
  clear() {
    console.clear();
  }
}
const y = (l) => new _(l), p = y("tile/fetcher/CanvasPool");
class Q {
  constructor() {
    this.available = [], this.idleSize = 5, this.idleTimeout = 3e4, this.idleTimer = null, this.totalCreated = 0, this.totalAcquired = 0, this.totalReleased = 0;
  }
  /**
   * Acquire a canvas from the pool (creates new if none available)
   */
  acquire() {
    this.totalAcquired++;
    let t = this.available.pop();
    return t ? p.debug(
      "Canvas acquired from pool (pool size: %d → %d, total acquired: %d)",
      this.available.length + 1,
      this.available.length,
      this.totalAcquired
    ) : (t = document.createElement("canvas"), this.totalCreated++, p.debug(
      "Canvas created - new canvas (total created: %d, pool size: %d)",
      this.totalCreated,
      this.available.length
    )), this._resetIdleTimer(), t;
  }
  /**
   * Return a canvas to the pool for reuse
   */
  release(t) {
    t ? (this.totalReleased++, this.available.push(t), p.debug(
      "Canvas released to pool (pool size: %d → %d, total released: %d)",
      this.available.length - 1,
      this.available.length,
      this.totalReleased
    ), this._resetIdleTimer()) : p.warn("Canvas release attempted with null/undefined canvas");
  }
  /**
   * Reset the idle timer for automatic cleanup
   */
  _resetIdleTimer() {
    this.idleTimer ? (clearTimeout(this.idleTimer), p.debug("Idle timer reset - previous timer cleared")) : p.debug("Idle timer started - %d ms until auto-trim", this.idleTimeout), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
  }
  /**
   * Trim excess canvases to prevent memory buildup
   */
  _trim() {
    const t = this.available.length;
    let e = 0;
    if (t > this.idleSize) {
      for (p.debug(
        "Auto-trim triggered - pool size %d exceeds idle limit %d",
        t,
        this.idleSize
      ); this.available.length > this.idleSize; )
        this.available.pop(), e++;
      p.info(
        "Canvas pool trimmed - removed %d canvases (pool size: %d → %d)",
        e,
        t,
        this.available.length
      );
    } else
      p.debug(
        "Auto-trim skipped - pool size %d within idle limit %d",
        t,
        this.idleSize
      );
    this.idleTimer = null;
  }
}
const I = y("tile/fetcher/TileFetcher");
class W {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(t, e = 5e3) {
    this.tileUrlTemplate = t, this.timeout = e, this.canvasPool = new Q();
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  async loadTile(t) {
    const e = `${t.z}/${t.x}/${t.y}`, i = this.getTileUrl(t);
    return await this.fetchTile(i, e);
  }
  // ========================================================================
  // PRIVATE
  // ========================================================================
  getTileUrl(t) {
    return this.tileUrlTemplate.replace("{z}", t.z.toString()).replace("{x}", t.x.toString()).replace("{y}", t.y.toString());
  }
  /**
   * Fetch a tile image and return both ImageData and ImageBitmap for memory management
   * @param url - The URL of the tile to fetch
   * @param tileKey - The tile identifier for logging
   * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
   */
  async fetchTile(t, e) {
    const i = `fetch-${e}`;
    I.timeLevel(d.DEBUG, i);
    try {
      const n = await this.fetchWithTimeout(t);
      if (I.timeEndLevel(d.DEBUG, i), !n.ok)
        throw new Error(`HTTP ${n.status}: ${n.statusText}`);
      const s = await n.blob();
      return await this.blobToImageDataAndBitmap(s, e);
    } catch (n) {
      throw I.timeEndLevel(d.DEBUG, i), n instanceof Error ? new Error(`Failed to fetch tile from ${t}: ${n.message}`) : new Error(`Failed to fetch tile from ${t}: Unknown error`);
    }
  }
  // ========================================================================
  // PRIVATE - HTTP OPERATIONS
  // ========================================================================
  /**
   * Fetch with timeout support using AbortController
   */
  async fetchWithTimeout(t) {
    const e = new AbortController(), i = setTimeout(() => e.abort(), this.timeout);
    try {
      return await fetch(t, {
        signal: e.signal
      });
    } finally {
      clearTimeout(i);
    }
  }
  // ========================================================================
  // PRIVATE - IMAGE PROCESSING
  // ========================================================================
  /**
   * Convert blob to ImageData and ImageBitmap using createImageBitmap
   * This approach avoids memory leaks from Image objects and blob URLs
   * Uses canvas pool for efficient resource management
   */
  async blobToImageDataAndBitmap(t, e) {
    const i = this.canvasPool.acquire(), n = `bitmap-${e}`;
    I.timeLevel(d.DEBUG, n);
    try {
      const s = i.getContext("2d", { willReadFrequently: !0 });
      if (!s)
        throw new Error("Failed to get 2D canvas context");
      const o = await createImageBitmap(t);
      i.width = o.width, i.height = o.height, s.drawImage(o, 0, 0);
      const a = s.getImageData(0, 0, o.width, o.height);
      return I.timeEndLevel(d.DEBUG, n), { data: a, bitmap: o };
    } catch (s) {
      throw I.timeEndLevel(d.DEBUG, n), new Error(
        `Failed to process image: ${s instanceof Error ? s.message : "Unknown error"}`
      );
    } finally {
      this.canvasPool.release(i);
    }
  }
}
const m = y("tile/cache/ReentrantLock");
class k {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(t) {
    this.locks = /* @__PURE__ */ new Map(), this.loadingCount = 0, this.waitQueue = [], this.maxConcurrent = t;
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  /**
   * Acquire lock for key with deduplication and concurrency limiting
   * @param key - Unique identifier for the operation
   * @param fn - Function to execute if not already running
   * @returns Promise resolving to the operation result
   */
  async acquire(t, e) {
    if (m.debug(
      "%s: Lock acquire requested (active: %d/%d, queued: %d)",
      t,
      this.loadingCount,
      this.maxConcurrent,
      this.waitQueue.length
    ), this.locks.has(t))
      return m.debug(
        "%s: Lock deduplication - already loading, returning existing promise",
        t
      ), this.locks.get(t);
    if (await this.acquireLoadingSlot(t), this.locks.has(t))
      return m.debug(
        "%s: Lock race condition - already loading after slot acquired, releasing slot",
        t
      ), this.releaseLoadingSlot(t), this.locks.get(t);
    m.debug("%s: Lock creating new promise", t);
    const i = (async () => {
      try {
        m.debug("%s: Promise executing function", t);
        const n = await e();
        return m.debug("%s: Promise resolved successfully", t), n;
      } catch (n) {
        throw m.error("%s: Promise rejected - %o", t, n), n;
      } finally {
        m.debug("%s: Promise cleanup - removing lock and releasing slot", t), this.locks.delete(t), this.releaseLoadingSlot(t);
      }
    })();
    return this.locks.set(t, i), m.debug("%s: Lock registered promise (total locks: %d)", t, this.locks.size), i;
  }
  // ========================================================================
  // PRIVATE - SEMAPHORE OPERATIONS
  // ========================================================================
  /**
   * Acquire a loading slot (semaphore acquire)
   */
  async acquireLoadingSlot(t) {
    if (this.loadingCount < this.maxConcurrent) {
      this.loadingCount++, m.debug(
        "%s: Semaphore acquired slot immediately (%d/%d active, %d queued)",
        t,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
      return;
    }
    return m.debug(
      "%s: Semaphore waiting for slot (%d/%d active, %d queued)",
      t,
      this.loadingCount,
      this.maxConcurrent,
      this.waitQueue.length
    ), m.timeLevel(d.DEBUG, t), new Promise((e) => {
      this.waitQueue.push(() => {
        m.timeEndLevel(d.DEBUG, t), this.loadingCount++, m.debug(
          "%s: Semaphore acquired slot after waiting (%d/%d active, %d queued)",
          t,
          this.loadingCount,
          this.maxConcurrent,
          this.waitQueue.length
        ), e();
      });
    });
  }
  /**
   * Release a loading slot (semaphore release)
   */
  releaseLoadingSlot(t) {
    if (this.waitQueue.length > 0) {
      m.debug(
        "%s: Semaphore: releasing slot to waiting request (%d/%d active, %d queued)",
        t,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
      const e = this.waitQueue.shift();
      e && e();
    } else
      this.loadingCount--, m.debug(
        "%s: Semaphore: released slot (%d/%d active, %d queued)",
        t,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
  }
}
const E = y("tile/cache/Cache");
class j {
  // ========================================================================
  // CONSTRUCTOR & VALIDATION
  // ========================================================================
  constructor(t, e, i, n) {
    if (this.head = null, this.tail = null, t <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = t, this.keyMapper = e, this.valueBuilder = i, this.cleanupFn = n, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new k(t);
  }
  // ========================================================================
  // PUBLIC API - CACHE OPERATIONS
  // ========================================================================
  /**
   * Get item from cache or build if not present
   * @param k - Key to retrieve
   * @returns Promise resolving to cached or newly built value
   */
  async get(t) {
    const e = this.keyMapper(t), i = this.cache.get(e);
    return i ? (this.moveToFront(e), i) : (E.debug("%s miss", e), this.lock.acquire(e, async () => {
      const n = this.cache.get(e);
      if (n)
        return E.debug("%s Missed at first but now OK", e), this.moveToFront(e), n;
      E.info("%s loading", e), E.timeLevel(d.INFO, e);
      const s = await this.valueBuilder(t);
      return E.info("%s loaded", e), E.timeEndLevel(d.INFO, e), this.set(e, s), s;
    }));
  }
  /**
   * Clear all cached items
   */
  clear() {
    if (E.debug("clear"), this.cleanupFn)
      for (const t of this.cache.values())
        this.cleanupFn(t);
    this.cache.clear(), this.lruOrder.clear(), this.head = null, this.tail = null;
  }
  // ========================================================================
  // PROTECTED API - INSPECTION METHODS
  // ========================================================================
  /**
   * Check if item exists in cache
   * @param k - Key to check
   * @returns True if key exists in cache
   */
  has(t) {
    const e = this.keyMapper(t);
    return this.cache.has(e);
  }
  /**
   * Get all cached keys
   * @returns Array of all cached keys
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }
  /**
   * Get the least recently used keys in order
   * @param count - Maximum number of keys to return
   * @returns Array of LRU keys from least to most recently used
   */
  getLRUKeys(t = 10) {
    const e = [];
    let i = this.tail;
    for (; i && e.length < t; )
      e.push(i), i = this.lruOrder.get(i)?.prev || null;
    return e;
  }
  // ========================================================================
  // PRIVATE - CACHE STORAGE OPERATIONS
  // ========================================================================
  /**
   * Store item in cache with automatic eviction
   */
  set(t, e) {
    this.cache.size >= this.maxSize && this.evictLeastRecentlyUsed(), this.cache.set(t, e), this.addToFront(t);
  }
  /**
   * Remove item from cache with cleanup
   */
  delete(t) {
    if (E.debug("%s delete", t), !this.cache.has(t))
      return !1;
    const e = this.cache.get(t);
    return this.cache.delete(t), this.removeFromLRU(t), e && this.cleanupFn && this.cleanupFn(e), !0;
  }
  // ========================================================================
  // PRIVATE - LRU EVICTION OPERATIONS
  // ========================================================================
  /**
   * Remove the least recently used item to make space
   */
  evictLeastRecentlyUsed() {
    if (!this.tail)
      return;
    const t = this.tail;
    this.delete(t);
  }
  // ========================================================================
  // PRIVATE - LRU LINKED LIST OPERATIONS
  // ========================================================================
  /**
   * Add a key to the front of the LRU list (most recently used)
   */
  addToFront(t) {
    const e = { prev: null, next: this.head };
    if (this.lruOrder.set(t, e), this.head) {
      const i = this.lruOrder.get(this.head);
      i.prev = t;
    } else
      this.tail = t;
    this.head = t;
  }
  /**
   * Move an existing key to the front of the LRU list
   */
  moveToFront(t) {
    this.head !== t && (this.removeFromLRU(t), this.addToFront(t));
  }
  /**
   * Remove a key from the LRU doubly-linked list
   */
  removeFromLRU(t) {
    const e = this.lruOrder.get(t);
    if (e) {
      if (e.prev) {
        const i = this.lruOrder.get(e.prev);
        i.next = e.next;
      } else
        this.head = e.next;
      if (e.next) {
        const i = this.lruOrder.get(e.next);
        i.prev = e.prev;
      } else
        this.tail = e.prev;
      this.lruOrder.delete(t);
    }
  }
}
class H {
  constructor(t, e, i) {
    this.tileFetcher = new W(t, e);
    const n = (s) => {
      s.bitmap.close();
    };
    this.cache = new j(
      i,
      (s) => `${s.z}/${s.x}/${s.y}`,
      (s) => this.tileFetcher.loadTile(s),
      n
    );
  }
  async getTile(t) {
    return await this.cache.get(t);
  }
  clearCache() {
    this.cache.clear();
  }
}
class V {
  // ========================================================================
  // PUBLIC API - ELEVATION DECODING
  // ========================================================================
  /**
   * Decode elevation from RGB values using Terrarium encoding
   * Formula: elevation = (red * 256 + green + blue / 256) - 32768
   * @param rgb - RGB color values from terrain tile pixel
   * @returns Elevation in meters, rounded to 2 decimal places
   */
  static decodeElevation(t) {
    const e = t.red * 256 + t.green + t.blue / 256 - 32768;
    return Math.round(e * 100) / 100;
  }
  /**
   * Get elevation from ImageData at specific pixel position (convenience method)
   * @param imageData - Image data from terrain tile
   * @param position - Pixel coordinates within the tile
   * @returns Elevation in meters at the specified position
   */
  static getElevationFromImageData(t, e) {
    const i = this.getRGBFromImageData(t, e);
    return this.decodeElevation(i);
  }
  // ========================================================================
  // PUBLIC API - PIXEL DATA EXTRACTION
  // ========================================================================
  /**
   * Extract RGB values from ImageData at specific pixel position
   * @param imageData - Image data from terrain tile
   * @param position - Pixel coordinates within the tile
   * @returns RGB color values for elevation decoding
   */
  static getRGBFromImageData(t, e) {
    if (e.x < 0 || e.x >= t.width)
      throw new Error(
        `Invalid x position: ${e.x}. Must be between 0 and ${t.width - 1}`
      );
    if (e.y < 0 || e.y >= t.height)
      throw new Error(
        `Invalid y position: ${e.y}. Must be between 0 and ${t.height - 1}`
      );
    const i = (e.y * t.width + e.x) * 4;
    return {
      red: t.data[i],
      green: t.data[i + 1],
      blue: t.data[i + 2]
      // Alpha channel (index + 3) is ignored for Terrarium encoding
    };
  }
}
const v = 256;
function K(l) {
  return l * Math.PI / 180;
}
function Y(l) {
  return l >= -85.0511 && l <= 85.0511;
}
function X(l) {
  return l >= -180 && l <= 180;
}
function J(l) {
  return Number.isInteger(l) && l >= 0 && l <= 15;
}
function F(l) {
  let { x: t, y: e } = l;
  const i = l.tile;
  let n = i.x, s = i.y;
  const o = i.z;
  t < 0 && (t += v, n -= 1), t >= v && (t -= v, n += 1), e < 0 && (e += v, s -= 1), e >= v && (e -= v, s += 1);
  const a = Math.pow(2, o) - 1;
  return n = Math.max(0, Math.min(a, n)), s = Math.max(0, Math.min(a, s)), { tile: { z: o, x: n, y: s }, x: t, y: e };
}
function U(l, t) {
  if (!Y(l.latitude))
    throw new Error(
      `Invalid latitude: ${l.latitude}. Must be between -85.0511 and 85.0511`
    );
  if (!X(l.longitude))
    throw new Error(`Invalid longitude: ${l.longitude}. Must be between -180 and 180`);
  if (!J(t))
    throw new Error(`Invalid zoom level: ${t}. Must be between 0 and 15`);
  const e = K(l.latitude), i = Math.pow(2, t), n = (l.longitude + 180) / 360 * i, s = (1 - Math.log(Math.tan(e) + 1 / Math.cos(e)) / Math.PI) / 2 * i;
  let o = Math.floor(n), a = Math.floor(s);
  const r = i - 1;
  return o = Math.max(0, Math.min(r, o)), a = Math.max(0, Math.min(r, a)), {
    x: o,
    y: a,
    xFloat: n,
    yFloat: s,
    z: t
  };
}
function Z(l, t) {
  const e = U(l, t);
  return {
    x: e.x,
    y: e.y,
    z: e.z
  };
}
function O(l, t) {
  const e = U(l, t), i = Math.floor((e.xFloat - e.x) * v), n = Math.floor((e.yFloat - e.y) * v);
  return {
    tile: {
      z: t,
      x: e.x,
      y: e.y
    },
    x: Math.max(0, Math.min(v - 1, i)),
    y: Math.max(0, Math.min(v - 1, n))
  };
}
class tt {
  constructor(t) {
    this.tileManager = t;
  }
  // ========================================================================
  // PUBLIC API - ELEVATION CALCULATIONS
  // ========================================================================
  async getElevation(t, e, i = !0) {
    try {
      if (i)
        return await this.getInterpolatedElevationInternal(t, e);
      {
        const n = O(t, e);
        return await this.getElevationFromPixel(n);
      }
    } catch (n) {
      throw n instanceof Error ? new Error(`Failed to get elevation: ${n.message}`) : new Error("Failed to get elevation: Unknown error");
    }
  }
  // ========================================================================
  // PRIVATE - HELPER METHODS
  // ========================================================================
  async getInterpolatedElevationInternal(t, e) {
    const i = O(t, e), n = {
      tile: i.tile,
      x: i.x,
      y: i.y
    }, s = Math.floor(n.x), o = Math.floor(n.y), a = s + 1, r = o + 1, c = n.x - s, g = n.y - o, u = await this.getElevationFromPixel(
      F({ tile: n.tile, x: s, y: o })
    ), f = await this.getElevationFromPixel(
      F({ tile: n.tile, x: a, y: o })
    ), w = await this.getElevationFromPixel(
      F({ tile: n.tile, x: s, y: r })
    ), M = await this.getElevationFromPixel(
      F({ tile: n.tile, x: a, y: r })
    ), G = u * (1 - c) + f * c, q = w * (1 - c) + M * c;
    return G * (1 - g) + q * g;
  }
  /**
   * Get elevation for a specific pixel (internal helper)
   */
  async getElevationFromPixel(t) {
    const e = await this.tileManager.getTile(t.tile);
    return V.getElevationFromImageData(e.data, t);
  }
}
function S(l) {
  return { ...l, elevation: l.elevation ?? 0 };
}
class T {
  constructor(t, e, i) {
    this.x = t, this.y = e, this.z = i;
  }
  /**
   * Calculate Euclidean distance between two vectors
   */
  distanceTo(t) {
    const e = this.x - t.x, i = this.y - t.y, n = this.z - t.z;
    return Math.hypot(e, i, n);
  }
  /**
   * Subtract two vectors
   */
  subtract(t) {
    return new T(this.x - t.x, this.y - t.y, this.z - t.z);
  }
  /**
   * Add two vectors
   */
  add(t) {
    return new T(this.x + t.x, this.y + t.y, this.z + t.z);
  }
  /**
   * Multiply vector by scalar
   */
  multiply(t) {
    return new T(this.x * t, this.y * t, this.z * t);
  }
  /**
   * Calculate dot product with another vector
   */
  dot(t) {
    return this.x * t.x + this.y * t.y + this.z * t.z;
  }
  /**
   * Calculate cross product with another vector
   */
  cross(t) {
    return new T(
      this.y * t.z - this.z * t.y,
      this.z * t.x - this.x * t.z,
      this.x * t.y - this.y * t.x
    );
  }
  /**
   * Calculate the magnitude (length) of the vector
   */
  magnitude() {
    return Math.hypot(this.x, this.y, this.z);
  }
  /**
   * Normalize the vector to unit length
   */
  normalize() {
    const t = this.magnitude();
    return t === 0 ? new T(0, 0, 0) : this.multiply(1 / t);
  }
  /**
   * Calculate perpendicular distance from this point to a line segment defined by two points
   * Uses the formula: ||(p-a) × (p-b)|| / ||b-a||
   * where p is this point, a and b are the line segment endpoints
   */
  distanceToSegment(t, e) {
    const i = e.subtract(t), n = i.magnitude();
    if (n === 0)
      return this.distanceTo(t);
    const o = this.subtract(t).dot(i) / (n * n), a = Math.max(0, Math.min(1, o)), r = t.add(i.multiply(a));
    return this.distanceTo(r);
  }
}
const z = {
  /** Semi-major axis in meters (WGS84 ellipsoid) */
  SEMI_MAJOR_AXIS: 6378137,
  /** Mean radius in meters (used for distance calculations) */
  MEAN_RADIUS: 6371e3,
  /** First eccentricity squared (WGS84 ellipsoid) */
  FIRST_ECCENTRICITY_SQUARED: 0.00669437999014
}, L = {
  /** Degrees to radians conversion factor */
  DEG_TO_RAD: Math.PI / 180
}, D = {
  /** Minimum points needed for smoothing operations */
  MIN_SMOOTHING_POINTS: 3,
  /** Minimum segment distance in meters for path processing */
  MIN_SEGMENT_DISTANCE: 1
};
class A {
  /**
   * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
   * @param coordinates - Geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns ECEF coordinates as Vector3D
   */
  static toEcef(t, e = 3) {
    const i = t.latitude * Math.PI / 180, n = t.longitude * Math.PI / 180, s = e * (t.elevation || 0), o = Math.sin(i), a = z.SEMI_MAJOR_AXIS / Math.sqrt(1 - z.FIRST_ECCENTRICITY_SQUARED * o * o), r = Math.cos(i), c = Math.cos(n), g = Math.sin(n), u = (a + s) * r * c, f = (a + s) * r * g, w = (a * (1 - z.FIRST_ECCENTRICITY_SQUARED) + s) * o;
    return new T(u, f, w);
  }
  /**
   * Convert multiple coordinates to ECEF vectors
   * @param coordinates - Array of geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns Array of ECEF coordinates as Vector3D
   */
  static convertBatch(t, e = 3) {
    return t.map((i) => this.toEcef(i, e));
  }
}
const C = y("utils/DouglasPeucker");
class et {
  /**
   * Simplify a path using the Douglas-Peucker algorithm in 3D space
   * @param points - Array of coordinates with elevation
   * @param tolerance - Maximum allowed distance from simplified line in meters
   * @param zExaggeration - Elevation exaggeration factor for ECEF conversion (default: 3)
   * @returns Simplified array of coordinates
   */
  static simplify(t, e, i = 3) {
    if (C.info("simplify %s", t.length), t.length <= 2)
      return C.warn("too small"), [...t];
    C.timeLevel(d.INFO, "simplify");
    const n = t.length - 1, s = [];
    s.push(t[0]);
    const o = this.simplifyRecursive(
      t,
      0,
      n,
      e,
      i
    );
    return s.push(...o), s.push(t[n]), C.timeEndLevel(d.INFO, "simplify"), C.debug("simplified -> %s", s.length), s;
  }
  /**
   * Recursive step of the Douglas-Peucker algorithm
   * @param points - Array of all points
   * @param firstIndex - Index of first point in current segment
   * @param lastIndex - Index of last point in current segment
   * @param tolerance - Maximum allowed distance in meters
   * @param zExaggeration - Elevation exaggeration factor
   * @returns Array of points to include in simplified path
   */
  static simplifyRecursive(t, e, i, n, s) {
    let o = 0, a = -1;
    const r = [], c = A.toEcef(t[e], s), g = A.toEcef(t[i], s);
    for (let u = e + 1; u < i; u++) {
      const w = A.toEcef(t[u], s).distanceToSegment(c, g);
      w > o && (o = w, a = u);
    }
    if (o > n && a !== -1) {
      if (a - e > 1) {
        const u = this.simplifyRecursive(
          t,
          e,
          a,
          n,
          s
        );
        r.push(...u);
      }
      if (r.push(t[a]), i - a > 1) {
        const u = this.simplifyRecursive(
          t,
          a,
          i,
          n,
          s
        );
        r.push(...u);
      }
    }
    return r;
  }
}
class b {
  /**
   * Calculate great circle distance between two geographic coordinates using Haversine formula
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in meters
   */
  static haversine(t, e) {
    const i = t.latitude * L.DEG_TO_RAD, n = e.latitude * L.DEG_TO_RAD, s = (e.latitude - t.latitude) * L.DEG_TO_RAD, o = (e.longitude - t.longitude) * L.DEG_TO_RAD, a = Math.sin(s / 2) * Math.sin(s / 2) + Math.cos(i) * Math.cos(n) * Math.sin(o / 2) * Math.sin(o / 2), r = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return z.MEAN_RADIUS * r;
  }
  /**
   * Calculate Euclidean distance between two 3D points
   * @param point1 - First 3D point
   * @param point2 - Second 3D point
   * @returns Distance in meters
   */
  static euclidean3D(t, e) {
    const i = t.x - e.x, n = t.y - e.y, s = t.z - e.z;
    return Math.sqrt(i * i + n * n + s * s);
  }
  /**
   * Calculate perpendicular distance from a point to a line segment in 3D space
   * @param point - Point to measure from
   * @param segmentStart - Start point of line segment
   * @param segmentEnd - End point of line segment
   * @returns Perpendicular distance in meters
   */
  static pointToSegment3D(t, e, i) {
    const n = i.subtract(e), s = t.subtract(e), o = n.dot(n);
    if (o === 0)
      return b.euclidean3D(t, e);
    const a = Math.max(0, Math.min(1, s.dot(n) / o)), r = e.add(n.multiply(a));
    return b.euclidean3D(t, r);
  }
  /**
   * Calculate cumulative distances along a path of coordinates
   * @param points - Array of coordinates
   * @returns Array of cumulative distances in meters
   */
  static cumulativeDistances(t) {
    const e = [0];
    for (let i = 1; i < t.length; i++) {
      const n = b.haversine(t[i - 1], t[i]);
      e.push(e[i - 1] + n);
    }
    return e;
  }
  /**
   * Calculate total distance along a path of coordinates
   * @param points - Array of coordinates
   * @returns Total distance in meters
   */
  static totalPathDistance(t) {
    if (t.length < 2)
      return 0;
    let e = 0;
    for (let i = 1; i < t.length; i++)
      e += b.haversine(t[i - 1], t[i]);
    return e;
  }
}
const R = y("utils/ElevationSmoother");
class it {
  /**
   * Apply distance-based smoothing to elevation data
   * @param points - Array of coordinates with elevation
   * @param windowSize - Smoothing window in meters (default: 50)
   * @returns Smoothed elevation data
   */
  static smooth(t, e = 50) {
    if (R.debug("smooth %s", t.length), t.length < D.MIN_SMOOTHING_POINTS)
      return R.debug("too small"), t;
    if (e <= 0)
      throw new Error(`Invalid window size: ${e}. Must be positive`);
    R.timeLevel(d.INFO, "smooth");
    const i = b.cumulativeDistances(t), n = [];
    for (let s = 0; s < t.length; s++) {
      const o = this.computeSmoothedValue(s, t, i, e);
      n.push({
        ...t[s],
        elevation: o
      });
    }
    return R.timeEndLevel(d.INFO, "smooth"), n;
  }
  /**
   * Compute smoothed elevation value for a single point
   * @param index - Index of point to smooth
   * @param points - All points
   * @param distances - Cumulative distances
   * @param windowSize - Smoothing window in meters
   * @returns Smoothed elevation value
   */
  static computeSmoothedValue(t, e, i, n) {
    const s = i[t];
    let o = t;
    for (; o > 0 && s - i[o - 1] <= n; )
      o--;
    let a = t;
    for (; a < e.length - 1 && i[a + 1] - s <= n; )
      a++;
    let r = 0, c = 0;
    for (let g = o; g <= a; g++) {
      const f = 1 - Math.abs(i[g] - s) / n;
      r += f, c += e[g].elevation * f;
    }
    return r > 0 ? c / r : e[t].elevation;
  }
}
class P {
  constructor(t) {
    this.source = t;
  }
  static from(t) {
    async function* e() {
      for (const i of t)
        yield i;
    }
    return new P(e());
  }
  mapAsync(t, e = 1) {
    const i = this.source;
    async function* n() {
      const s = [];
      for await (const o of i) {
        const a = t(o);
        s.push(a), s.length >= e && (yield await s.shift());
      }
      for (; s.length > 0; )
        yield await s.shift();
    }
    return new P(n());
  }
  async countProcessed() {
    let t = 0;
    for await (const e of this.source)
      t++;
    return t;
  }
}
const h = y("calculator/BatchCalculator");
class nt {
  constructor(t) {
    this.elevationCalculator = t;
  }
  async setElevations(t, e, i) {
    const n = {}, s = /* @__PURE__ */ new Map(), o = (r) => `${r.z}/${r.x}/${r.y}`;
    for (const r of t) {
      const c = Z(r, e), g = o(c);
      let u = n[g];
      u || (u = [], n[g] = u, s.set(g, c)), u.push(r);
    }
    const a = Array.from(s.values());
    await P.from(a).mapAsync(async (r) => {
      const c = o(r), g = n[c];
      for (const u of g)
        u.elevation = await this.elevationCalculator.getElevation(
          u,
          e,
          i
        );
      return r;
    }, 10).countProcessed();
  }
  /**
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param zoomLevel - Tile zoom level (0-15)
   * @param step - Distance between elevation points in meters
   * @param interpolation - Use bilinear interpolation for smoother results
   * @param smoothingOptions - Optional distance-based smoothing options
   * @param filterOptions - Optional filtering options using Douglas-Peucker algorithm
   */
  async getElevationsAlong(t, e, i, n, s, o) {
    const a = "path-elevations";
    if (h.timeLevel(d.INFO, a), h.info(
      "Path processing started - waypoints: %d, step: %dm, zoom: %d, interpolation: %s",
      t.length,
      i,
      e,
      n
    ), t.length < 2)
      throw h.error("Path validation failed - insufficient waypoints: %d", t.length), new Error("Path must contain at least 2 coordinates");
    if (i <= 1)
      throw h.error("Path validation failed - step too small: %dm", i), new Error(`Step is too small: ${i} meters`);
    h.debug("Generating coordinates along path");
    const r = "coordinate-generation";
    h.timeLevel(d.DEBUG, r);
    let c = Array.from(this.generateCoordinatesAlong(t, i));
    if (h.timeEndLevel(d.DEBUG, r), h.debug("Generated %d coordinates along path", c.length), h.debug("Fetching elevations for generated coordinates"), await this.setElevations(c, e, n), h.debug("Combined coordinates with elevations - points: %d", c.length), s?.enabled === !0 && c.length >= 3) {
      const g = s.windowSize ?? 50, u = c.length;
      h.debug("Applying elevation smoothing - windowSize: %dm", g);
      const f = "smoothing";
      h.timeLevel(d.DEBUG, f), c = it.smooth(c, g), h.timeEndLevel(d.DEBUG, f), h.debug(
        "Smoothing completed - points: %d → %d",
        u,
        c.length
      );
    } else s?.enabled === !0 && h.debug(
      "Smoothing skipped - insufficient points: %d (minimum: 3)",
      c.length
    );
    if (o?.enabled === !0 && c.length > 2) {
      const g = o?.tolerance ?? 10, u = o?.zExaggeration ?? 3, f = c.length;
      h.debug(
        "Applying Douglas-Peucker filtering - tolerance: %d, zExaggeration: %d",
        g,
        u
      );
      const w = "filtering";
      h.timeLevel(d.DEBUG, w);
      const M = et.simplify(c, g, u);
      return h.timeEndLevel(d.DEBUG, w), h.debug(
        "Filtering completed - points: %d → %d (%f % reduction)",
        f,
        M.length,
        ((f - M.length) / f * 100).toFixed(1)
      ), h.timeEndLevel(d.INFO, a), h.info(
        "Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s",
        t.length,
        M.length,
        s?.enabled,
        o?.enabled
      ), M;
    } else o?.enabled === !0 && h.debug(
      "Filtering skipped - insufficient points: %d (minimum: 3)",
      c.length
    );
    return h.timeEndLevel(d.INFO, a), h.info(
      "Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s",
      t.length,
      c.length,
      s?.enabled,
      o?.enabled
    ), c;
  }
  /**
   * Generate coordinates along a path with multiple waypoints
   * @param path - Array of coordinates defining the path
   * @param step - Distance between points in meters
   */
  *generateCoordinatesAlong(t, e) {
    if (t.length < 2) {
      h.debug("Path generation skipped - insufficient waypoints: %d", t.length);
      return;
    }
    h.debug("Generating coordinates - waypoints: %d, step: %dm", t.length, e), yield S(t[0]);
    let i = 1, n = 0;
    for (let s = 0; s < t.length - 1; s++) {
      const o = b.haversine(t[s], t[s + 1]);
      if (o < D.MIN_SEGMENT_DISTANCE) {
        n++, h.debug(
          "Segment %d skipped - distance too short: %.2fm (minimum: %.2fm)",
          s + 1,
          o,
          D.MIN_SEGMENT_DISTANCE
        );
        continue;
      }
      h.debug("Processing segment %d - distance: %.2fm", s + 1, o);
      let a = !0, r = 0;
      for (const c of this.generateCoordinatesBetween(t[s], t[s + 1], e)) {
        if (a) {
          a = !1;
          continue;
        }
        yield c, i++, r++;
      }
      h.debug("Segment %d completed - generated: %d points", s + 1, r);
    }
    n > 0 ? h.debug(
      "Path generation completed - generated: %d points, skipped segments: %d",
      i,
      n
    ) : h.debug("Path generation completed - generated: %d points", i);
  }
  /**
   * Generate coordinates between two points at regular intervals
   * @param coordinate1 - Start coordinate
   * @param coordinate2 - End coordinate
   * @param step - Distance between points in meters
   */
  *generateCoordinatesBetween(t, e, i) {
    const n = b.haversine(t, e);
    if (yield S(t), n <= i) {
      yield S(e);
      return;
    }
    const s = Math.floor(n / i), o = e.latitude - t.latitude, a = e.longitude - t.longitude;
    for (let r = 1; r <= s; r++) {
      const c = r * i / n;
      yield {
        latitude: t.latitude + o * c,
        longitude: t.longitude + a * c,
        elevation: 0
      };
    }
    yield S(e);
  }
}
const st = y("ElevationProvider");
class ot {
  // ============================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ============================================================================
  constructor(t = {}) {
    this.config = {
      zoomLevel: t.zoomLevel ?? 12,
      cacheSize: t.cacheSize ?? 100,
      tileUrlTemplate: t.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: t.timeout ?? 5e3
    }, st.dir("Config :", this.config), this.validateConfig(), this.tileManager = new H(
      this.config.tileUrlTemplate,
      this.config.timeout,
      this.config.cacheSize
    ), this.calculator = new tt(this.tileManager), this.batchCalculator = new nt(this.calculator);
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get attribution information for elevation data
   */
  static getAttribution() {
    return {
      text: "Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1. Data processing by Mapzen/Tilezen.",
      url: "https://github.com/tilezen/joerd"
    };
  }
  // ============================================================================
  // PUBLIC API - SINGLE COORDINATE METHODS
  // ============================================================================
  /**
   * Get elevation at specific coordinates
   * @param latitude - Latitude in decimal degrees
   * @param longitude - Longitude in decimal degrees
   * @param options - Optional parameters
   */
  async getElevation(t, e, i) {
    const n = i?.interpolation ?? !0, s = { latitude: t, longitude: e };
    return await this.calculator.getElevation(s, this.config.zoomLevel, n);
  }
  // ============================================================================
  // PUBLIC API - BULK COORDINATE METHODS
  // ============================================================================
  /**
   * Get elevations for multiple coordinates from an interable
   * @param coordinates - Iteratable of coordinates
   * @param options - Optional parameters
   */
  async setElevations(t, e) {
    const i = e?.interpolation ?? !0;
    await this.batchCalculator.setElevations(t, this.config.zoomLevel, i);
  }
  /**
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param options - Optional parameters
   */
  async getElevationsAlong(t, e) {
    const i = e?.step ?? 10, n = e?.interpolation ?? !0, s = e?.smoothingOptions, o = e?.filterOptions;
    return this.batchCalculator.getElevationsAlong(
      t,
      this.config.zoomLevel,
      i,
      n,
      s,
      o
    );
  }
  // ============================================================================
  // PUBLIC API - CACHE MANAGEMENT
  // ============================================================================
  /**
   * Clear tile cache
   */
  clearCache() {
    this.tileManager.clearCache();
  }
  // ============================================================================
  // PRIVATE - VALIDATION
  // ============================================================================
  validateConfig() {
    const { zoomLevel: t, cacheSize: e, timeout: i } = this.config;
    if (!Number.isInteger(t) || t < 0 || t > 15)
      throw new Error(
        `Invalid zoom level: ${t}. Must be an integer between 0 and 15`
      );
    if (!Number.isInteger(e) || e <= 0)
      throw new Error(`Invalid cache size: ${e}. Must be a positive integer`);
    if (!Number.isInteger(i) || i <= 0)
      throw new Error(`Invalid timeout: ${i}. Must be a positive integer`);
  }
}
export {
  ot as ElevationProvider,
  ot as default
};
//# sourceMappingURL=index.esm.js.map
