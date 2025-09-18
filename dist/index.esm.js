const y = class y {
};
y.ERROR = 0, y.WARN = 1, y.INFO = 2, y.DEBUG = 3, y.TRACE = 4;
let c = y;
const U = {
  warn: c.WARN
}, A = {
  0: "ERROR",
  1: "WARN",
  2: "INFO",
  3: "DEBUG",
  4: "TRACE"
}, O = {
  0: console.error,
  1: console.error,
  2: console.log,
  3: console.log,
  4: console.log
};
class G {
  constructor(e) {
    this.namespace = e, this.level = U.warn;
  }
  shouldLog(e) {
    return e <= this.level;
  }
  doLog(e, t, ...i) {
    const n = `[${this.namespace}:${A[e]}]`;
    typeof t == "string" ? O[e](`${n} ${t}`, ...i) : O[e](n, t, ...i);
  }
  log(e, t, ...i) {
    this.shouldLog(e) && this.doLog(e, t, ...i);
  }
  /**
   * Log debug information (verbose output for development)
   * Supports printf-style formatting: logger.debug('Value: %s, Count: %d', value, count)
   */
  trace(e, ...t) {
  }
  /**
   * Log debug information (verbose output for development)
   * Supports printf-style formatting: logger.debug('Value: %s, Count: %d', value, count)
   */
  debug(e, ...t) {
  }
  /**
   * Log general information
   * Supports printf-style formatting: logger.info('User %s logged in', username)
   */
  info(e, ...t) {
  }
  /**
   * Log warnings
   * Supports printf-style formatting: logger.warn('Timeout after %dms', timeout)
   */
  warn(e, ...t) {
    this.log(c.WARN, e, ...t);
  }
  /**
   * Log errors
   * Supports printf-style formatting: logger.error('Failed to load %s: %o', file, error)
   */
  error(e, ...t) {
    this.log(c.ERROR, e, ...t);
  }
  getTimeLabel(e, t) {
    return `[${this.namespace}:${A[e]}] ${t}`;
  }
  doTime(e, t) {
    console.time(this.getTimeLabel(e, t));
  }
  doTimeEnd(e, t) {
    console.timeEnd(this.getTimeLabel(e, t));
  }
  /**
   * Log with timing information
   * Useful for performance debugging
   */
  timeLevel(e, t) {
  }
  /**
   * End timing and log duration
   */
  timeEndLevel(e, t) {
  }
  /**
   * Log with timing information
   * Useful for performance debugging
   */
  time(e) {
    this.doTime(c.INFO, e);
  }
  /**
   * End timing and log duration
   */
  timeEnd(e) {
    this.doTimeEnd(c.INFO, e);
  }
  logDir(e, t, i, n) {
    this.doLog(e, "DIR %s", t), console.dir(i, n);
  }
  /**
   * Display an interactive list of object properties
   * Useful for exploring complex objects in development
   * @param obj - The object to inspect
   * @param options - Optional display options
   */
  dirLevel(e, t, i, n) {
  }
  /**
   * Display an interactive list of object properties
   * Useful for exploring complex objects in development
   * @param obj - The object to inspect
   * @param options - Optional display options
   */
  dir(e, t, i) {
    this.logDir(c.INFO, e, t, i);
  }
  /**
   * Clear the console
   */
  clear() {
    console.clear();
  }
}
const M = (h) => new G(h), b = M("tile/fetcher/CanvasPool");
class B {
  constructor() {
    this.available = [], this.idleSize = 5, this.idleTimeout = 3e4, this.idleTimer = null, this.totalCreated = 0, this.totalAcquired = 0, this.totalReleased = 0;
  }
  /**
   * Acquire a canvas from the pool (creates new if none available)
   */
  acquire() {
    this.totalAcquired++;
    let e = this.available.pop();
    return e ? b.debug(
      "Canvas acquired from pool (pool size: %d → %d, total acquired: %d)",
      this.available.length + 1,
      this.available.length,
      this.totalAcquired
    ) : (e = document.createElement("canvas"), this.totalCreated++, b.debug(
      "Canvas created - new canvas (total created: %d, pool size: %d)",
      this.totalCreated,
      this.available.length
    )), this._resetIdleTimer(), e;
  }
  /**
   * Return a canvas to the pool for reuse
   */
  release(e) {
    e ? (this.totalReleased++, this.available.push(e), b.debug(
      "Canvas released to pool (pool size: %d → %d, total released: %d)",
      this.available.length - 1,
      this.available.length,
      this.totalReleased
    ), this._resetIdleTimer()) : b.warn("Canvas release attempted with null/undefined canvas");
  }
  /**
   * Reset the idle timer for automatic cleanup
   */
  _resetIdleTimer() {
    this.idleTimer ? (clearTimeout(this.idleTimer), b.debug("Idle timer reset - previous timer cleared")) : b.debug("Idle timer started - %d ms until auto-trim", this.idleTimeout), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
  }
  /**
   * Trim excess canvases to prevent memory buildup
   */
  _trim() {
    const e = this.available.length;
    let t = 0;
    if (e > this.idleSize) {
      for (b.debug(
        "Auto-trim triggered - pool size %d exceeds idle limit %d",
        e,
        this.idleSize
      ); this.available.length > this.idleSize; )
        this.available.pop(), t++;
      b.info(
        "Canvas pool trimmed - removed %d canvases (pool size: %d → %d)",
        t,
        e,
        this.available.length
      );
    } else
      b.debug(
        "Auto-trim skipped - pool size %d within idle limit %d",
        e,
        this.idleSize
      );
    this.idleTimer = null;
  }
}
const C = M("tile/fetcher/TileFetcher");
class q {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(e, t = 5e3) {
    this.tileUrlTemplate = e, this.timeout = t, this.canvasPool = new B();
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  async loadTile(e) {
    const t = `${e.z}/${e.x}/${e.y}`, i = this.getTileUrl(e);
    return await this.fetchTile(i, t);
  }
  // ========================================================================
  // PRIVATE
  // ========================================================================
  getTileUrl(e) {
    return this.tileUrlTemplate.replace("{z}", e.z.toString()).replace("{x}", e.x.toString()).replace("{y}", e.y.toString());
  }
  /**
   * Fetch a tile image and return both ImageData and ImageBitmap for memory management
   * @param url - The URL of the tile to fetch
   * @param tileKey - The tile identifier for logging
   * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
   */
  async fetchTile(e, t) {
    const i = `fetch-${t}`;
    C.timeLevel(c.DEBUG, i);
    try {
      const n = await this.fetchWithTimeout(e);
      if (C.timeEndLevel(c.DEBUG, i), !n.ok)
        throw new Error(`HTTP ${n.status}: ${n.statusText}`);
      const s = await n.blob();
      return await this.blobToImageDataAndBitmap(s, t);
    } catch (n) {
      throw C.timeEndLevel(c.DEBUG, i), n instanceof Error ? new Error(`Failed to fetch tile from ${e}: ${n.message}`) : new Error(`Failed to fetch tile from ${e}: Unknown error`);
    }
  }
  // ========================================================================
  // PRIVATE - HTTP OPERATIONS
  // ========================================================================
  /**
   * Fetch with timeout support using AbortController
   */
  async fetchWithTimeout(e) {
    const t = new AbortController(), i = setTimeout(() => t.abort(), this.timeout);
    try {
      return await fetch(e, {
        signal: t.signal
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
  async blobToImageDataAndBitmap(e, t) {
    const i = this.canvasPool.acquire(), n = `bitmap-${t}`;
    C.timeLevel(c.DEBUG, n);
    try {
      const s = i.getContext("2d", { willReadFrequently: !0 });
      if (!s)
        throw new Error("Failed to get 2D canvas context");
      const a = await createImageBitmap(e);
      i.width = a.width, i.height = a.height, s.drawImage(a, 0, 0);
      const o = s.getImageData(0, 0, a.width, a.height);
      return C.timeEndLevel(c.DEBUG, n), { data: o, bitmap: a };
    } catch (s) {
      throw C.timeEndLevel(c.DEBUG, n), new Error(
        `Failed to process image: ${s instanceof Error ? s.message : "Unknown error"}`
      );
    } finally {
      this.canvasPool.release(i);
    }
  }
}
const f = M("tile/cache/ReentrantLock");
class _ {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(e) {
    this.locks = /* @__PURE__ */ new Map(), this.loadingCount = 0, this.waitQueue = [], this.maxConcurrent = e;
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
  async acquire(e, t) {
    if (f.debug(
      "%s: Lock acquire requested (active: %d/%d, queued: %d)",
      e,
      this.loadingCount,
      this.maxConcurrent,
      this.waitQueue.length
    ), this.locks.has(e))
      return f.debug(
        "%s: Lock deduplication - already loading, returning existing promise",
        e
      ), this.locks.get(e);
    if (await this.acquireLoadingSlot(e), this.locks.has(e))
      return f.debug(
        "%s: Lock race condition - already loading after slot acquired, releasing slot",
        e
      ), this.releaseLoadingSlot(e), this.locks.get(e);
    f.debug("%s: Lock creating new promise", e);
    const i = (async () => {
      try {
        f.debug("%s: Promise executing function", e);
        const n = await t();
        return f.debug("%s: Promise resolved successfully", e), n;
      } catch (n) {
        throw f.error("%s: Promise rejected - %o", e, n), n;
      } finally {
        f.debug("%s: Promise cleanup - removing lock and releasing slot", e), this.locks.delete(e), this.releaseLoadingSlot(e);
      }
    })();
    return this.locks.set(e, i), f.debug("%s: Lock registered promise (total locks: %d)", e, this.locks.size), i;
  }
  // ========================================================================
  // PRIVATE - SEMAPHORE OPERATIONS
  // ========================================================================
  /**
   * Acquire a loading slot (semaphore acquire)
   */
  async acquireLoadingSlot(e) {
    if (this.loadingCount < this.maxConcurrent) {
      this.loadingCount++, f.debug(
        "%s: Semaphore acquired slot immediately (%d/%d active, %d queued)",
        e,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
      return;
    }
    return f.debug(
      "%s: Semaphore waiting for slot (%d/%d active, %d queued)",
      e,
      this.loadingCount,
      this.maxConcurrent,
      this.waitQueue.length
    ), f.timeLevel(c.DEBUG, e), new Promise((t) => {
      this.waitQueue.push(() => {
        f.timeEndLevel(c.DEBUG, e), this.loadingCount++, f.debug(
          "%s: Semaphore acquired slot after waiting (%d/%d active, %d queued)",
          e,
          this.loadingCount,
          this.maxConcurrent,
          this.waitQueue.length
        ), t();
      });
    });
  }
  /**
   * Release a loading slot (semaphore release)
   */
  releaseLoadingSlot(e) {
    if (this.waitQueue.length > 0) {
      f.debug(
        "%s: Semaphore: releasing slot to waiting request (%d/%d active, %d queued)",
        e,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
      const t = this.waitQueue.shift();
      t && t();
    } else
      this.loadingCount--, f.debug(
        "%s: Semaphore: released slot (%d/%d active, %d queued)",
        e,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
  }
}
const w = M("tile/cache/Cache");
class Q {
  // ========================================================================
  // CONSTRUCTOR & VALIDATION
  // ========================================================================
  constructor(e, t, i, n) {
    if (this.head = null, this.tail = null, e <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = e, this.keyMapper = t, this.valueBuilder = i, this.cleanupFn = n, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new _(e);
  }
  // ========================================================================
  // PUBLIC API - CACHE OPERATIONS
  // ========================================================================
  /**
   * Get item from cache or build if not present
   * @param k - Key to retrieve
   * @returns Promise resolving to cached or newly built value
   */
  async get(e) {
    const t = this.keyMapper(e), i = this.cache.get(t);
    return i ? (this.moveToFront(t), i) : (w.debug("%s miss", t), this.lock.acquire(t, async () => {
      const n = this.cache.get(t);
      if (n)
        return w.debug("%s Missed at first but now OK", t), this.moveToFront(t), n;
      w.info("%s loading", t), w.timeLevel(c.INFO, t);
      const s = await this.valueBuilder(e);
      return w.info("%s loaded", t), w.timeEndLevel(c.INFO, t), this.set(t, s), s;
    }));
  }
  /**
   * Clear all cached items
   */
  clear() {
    if (w.debug("clear"), this.cleanupFn)
      for (const e of this.cache.values())
        this.cleanupFn(e);
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
  has(e) {
    const t = this.keyMapper(e);
    return this.cache.has(t);
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
  getLRUKeys(e = 10) {
    const t = [];
    let i = this.tail;
    for (; i && t.length < e; )
      t.push(i), i = this.lruOrder.get(i)?.prev || null;
    return t;
  }
  // ========================================================================
  // PRIVATE - CACHE STORAGE OPERATIONS
  // ========================================================================
  /**
   * Store item in cache with automatic eviction
   */
  set(e, t) {
    this.cache.size >= this.maxSize && this.evictLeastRecentlyUsed(), this.cache.set(e, t), this.addToFront(e);
  }
  /**
   * Remove item from cache with cleanup
   */
  delete(e) {
    if (w.debug("%s delete", e), !this.cache.has(e))
      return !1;
    const t = this.cache.get(e);
    return this.cache.delete(e), this.removeFromLRU(e), t && this.cleanupFn && this.cleanupFn(t), !0;
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
    const e = this.tail;
    this.delete(e);
  }
  // ========================================================================
  // PRIVATE - LRU LINKED LIST OPERATIONS
  // ========================================================================
  /**
   * Add a key to the front of the LRU list (most recently used)
   */
  addToFront(e) {
    const t = { prev: null, next: this.head };
    if (this.lruOrder.set(e, t), this.head) {
      const i = this.lruOrder.get(this.head);
      i.prev = e;
    } else
      this.tail = e;
    this.head = e;
  }
  /**
   * Move an existing key to the front of the LRU list
   */
  moveToFront(e) {
    this.head !== e && (this.removeFromLRU(e), this.addToFront(e));
  }
  /**
   * Remove a key from the LRU doubly-linked list
   */
  removeFromLRU(e) {
    const t = this.lruOrder.get(e);
    if (t) {
      if (t.prev) {
        const i = this.lruOrder.get(t.prev);
        i.next = t.next;
      } else
        this.head = t.next;
      if (t.next) {
        const i = this.lruOrder.get(t.next);
        i.prev = t.prev;
      } else
        this.tail = t.prev;
      this.lruOrder.delete(e);
    }
  }
}
class W {
  constructor(e, t, i) {
    this.tileFetcher = new q(e, t);
    const n = (s) => {
      s.bitmap.close();
    };
    this.cache = new Q(
      i,
      (s) => `${s.z}/${s.x}/${s.y}`,
      (s) => this.tileFetcher.loadTile(s),
      n
    );
  }
  async getTile(e) {
    return await this.cache.get(e);
  }
  clearCache() {
    this.cache.clear();
  }
}
class j {
  // ========================================================================
  // PUBLIC API - ELEVATION DECODING
  // ========================================================================
  /**
   * Decode elevation from RGB values using Terrarium encoding
   * Formula: elevation = (red * 256 + green + blue / 256) - 32768
   * @param rgb - RGB color values from terrain tile pixel
   * @returns Elevation in meters, rounded to 2 decimal places
   */
  static decodeElevation(e) {
    const t = e.red * 256 + e.green + e.blue / 256 - 32768;
    return Math.round(t * 100) / 100;
  }
  /**
   * Get elevation from ImageData at specific pixel position (convenience method)
   * @param imageData - Image data from terrain tile
   * @param position - Pixel coordinates within the tile
   * @returns Elevation in meters at the specified position
   */
  static getElevationFromImageData(e, t) {
    const i = this.getRGBFromImageData(e, t);
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
  static getRGBFromImageData(e, t) {
    if (t.x < 0 || t.x >= e.width)
      throw new Error(
        `Invalid x position: ${t.x}. Must be between 0 and ${e.width - 1}`
      );
    if (t.y < 0 || t.y >= e.height)
      throw new Error(
        `Invalid y position: ${t.y}. Must be between 0 and ${e.height - 1}`
      );
    const i = (t.y * e.width + t.x) * 4;
    return {
      red: e.data[i],
      green: e.data[i + 1],
      blue: e.data[i + 2]
      // Alpha channel (index + 3) is ignored for Terrarium encoding
    };
  }
}
const p = 256;
function H(h) {
  return h * Math.PI / 180;
}
function V(h) {
  return h >= -85.0511 && h <= 85.0511;
}
function k(h) {
  return h >= -180 && h <= 180;
}
function Y(h) {
  return Number.isInteger(h) && h >= 0 && h <= 15;
}
function L(h) {
  let { x: e, y: t } = h;
  const i = h.tile;
  let n = i.x, s = i.y;
  const a = i.z;
  e < 0 && (e += p, n -= 1), e >= p && (e -= p, n += 1), t < 0 && (t += p, s -= 1), t >= p && (t -= p, s += 1);
  const o = Math.pow(2, a) - 1;
  return n = Math.max(0, Math.min(o, n)), s = Math.max(0, Math.min(o, s)), { tile: { z: a, x: n, y: s }, x: e, y: t };
}
function $(h, e) {
  if (!V(h.latitude))
    throw new Error(
      `Invalid latitude: ${h.latitude}. Must be between -85.0511 and 85.0511`
    );
  if (!k(h.longitude))
    throw new Error(`Invalid longitude: ${h.longitude}. Must be between -180 and 180`);
  if (!Y(e))
    throw new Error(`Invalid zoom level: ${e}. Must be between 0 and 15`);
  const t = H(h.latitude), i = Math.pow(2, e), n = (h.longitude + 180) / 360 * i, s = (1 - Math.log(Math.tan(t) + 1 / Math.cos(t)) / Math.PI) / 2 * i;
  let a = Math.floor(n), o = Math.floor(s);
  const l = i - 1;
  a = Math.max(0, Math.min(l, a)), o = Math.max(0, Math.min(l, o));
  const u = Math.floor((n - a) * p), g = Math.floor((s - o) * p);
  return {
    tile: {
      z: e,
      x: a,
      y: o
    },
    x: Math.max(0, Math.min(p - 1, u)),
    y: Math.max(0, Math.min(p - 1, g))
  };
}
class K {
  constructor(e) {
    this.tileManager = e;
  }
  // ========================================================================
  // PUBLIC API - ELEVATION CALCULATIONS
  // ========================================================================
  async getElevation(e, t, i = !0) {
    try {
      if (i)
        return await this.getInterpolatedElevationInternal(e, t);
      {
        const n = $(e, t);
        return await this.getElevationFromPixel(n);
      }
    } catch (n) {
      throw n instanceof Error ? new Error(`Failed to get elevation: ${n.message}`) : new Error("Failed to get elevation: Unknown error");
    }
  }
  // ========================================================================
  // PRIVATE - HELPER METHODS
  // ========================================================================
  async getInterpolatedElevationInternal(e, t) {
    const i = $(e, t), n = {
      tile: i.tile,
      x: i.x,
      y: i.y
    }, s = Math.floor(n.x), a = Math.floor(n.y), o = s + 1, l = a + 1, u = n.x - s, g = n.y - a, d = await this.getElevationFromPixel(
      L({ tile: n.tile, x: s, y: a })
    ), m = await this.getElevationFromPixel(
      L({ tile: n.tile, x: o, y: a })
    ), v = await this.getElevationFromPixel(
      L({ tile: n.tile, x: s, y: l })
    ), E = await this.getElevationFromPixel(
      L({ tile: n.tile, x: o, y: l })
    ), S = d * (1 - u) + m * u, I = v * (1 - u) + E * u;
    return S * (1 - g) + I * g;
  }
  /**
   * Get elevation for a specific pixel (internal helper)
   */
  async getElevationFromPixel(e) {
    const t = await this.tileManager.getTile(e.tile);
    return j.getElevationFromImageData(t.data, e);
  }
}
class x {
  constructor(e, t, i) {
    this.x = e, this.y = t, this.z = i;
  }
  /**
   * Calculate Euclidean distance between two vectors
   */
  distanceTo(e) {
    const t = this.x - e.x, i = this.y - e.y, n = this.z - e.z;
    return Math.hypot(t, i, n);
  }
  /**
   * Subtract two vectors
   */
  subtract(e) {
    return new x(this.x - e.x, this.y - e.y, this.z - e.z);
  }
  /**
   * Add two vectors
   */
  add(e) {
    return new x(this.x + e.x, this.y + e.y, this.z + e.z);
  }
  /**
   * Multiply vector by scalar
   */
  multiply(e) {
    return new x(this.x * e, this.y * e, this.z * e);
  }
  /**
   * Calculate dot product with another vector
   */
  dot(e) {
    return this.x * e.x + this.y * e.y + this.z * e.z;
  }
  /**
   * Calculate cross product with another vector
   */
  cross(e) {
    return new x(
      this.y * e.z - this.z * e.y,
      this.z * e.x - this.x * e.z,
      this.x * e.y - this.y * e.x
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
    const e = this.magnitude();
    return e === 0 ? new x(0, 0, 0) : this.multiply(1 / e);
  }
  /**
   * Calculate perpendicular distance from this point to a line segment defined by two points
   * Uses the formula: ||(p-a) × (p-b)|| / ||b-a||
   * where p is this point, a and b are the line segment endpoints
   */
  distanceToSegment(e, t) {
    const i = t.subtract(e), n = i.magnitude();
    if (n === 0)
      return this.distanceTo(e);
    const a = this.subtract(e).dot(i) / (n * n), o = Math.max(0, Math.min(1, a)), l = e.add(i.multiply(o));
    return this.distanceTo(l);
  }
}
const D = {
  /** Semi-major axis in meters (WGS84 ellipsoid) */
  SEMI_MAJOR_AXIS: 6378137,
  /** Mean radius in meters (used for distance calculations) */
  MEAN_RADIUS: 6371e3,
  /** First eccentricity squared (WGS84 ellipsoid) */
  FIRST_ECCENTRICITY_SQUARED: 0.00669437999014
}, R = {
  /** Degrees to radians conversion factor */
  DEG_TO_RAD: Math.PI / 180
}, P = {
  /** Minimum points needed for smoothing operations */
  MIN_SMOOTHING_POINTS: 3,
  /** Minimum segment distance in meters for path processing */
  MIN_SEGMENT_DISTANCE: 1
};
class N {
  /**
   * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
   * @param coordinates - Geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns ECEF coordinates as Vector3D
   */
  static toEcef(e, t = 3) {
    const i = e.latitude * Math.PI / 180, n = e.longitude * Math.PI / 180, s = t * e.elevation, a = Math.sin(i), o = D.SEMI_MAJOR_AXIS / Math.sqrt(1 - D.FIRST_ECCENTRICITY_SQUARED * a * a), l = Math.cos(i), u = Math.cos(n), g = Math.sin(n), d = (o + s) * l * u, m = (o + s) * l * g, v = (o * (1 - D.FIRST_ECCENTRICITY_SQUARED) + s) * a;
    return new x(d, m, v);
  }
  /**
   * Convert multiple coordinates to ECEF vectors
   * @param coordinates - Array of geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns Array of ECEF coordinates as Vector3D
   */
  static convertBatch(e, t = 3) {
    return e.map((i) => this.toEcef(i, t));
  }
}
const F = M("utils/DouglasPeucker");
class X {
  /**
   * Simplify a path using the Douglas-Peucker algorithm in 3D space
   * @param points - Array of coordinates with elevation
   * @param tolerance - Maximum allowed distance from simplified line in meters
   * @param zExaggeration - Elevation exaggeration factor for ECEF conversion (default: 3)
   * @returns Simplified array of coordinates
   */
  static simplify(e, t, i = 3) {
    if (F.info("simplify %s", e.length), e.length <= 2)
      return F.warn("too small"), [...e];
    F.timeLevel(c.INFO, "simplify");
    const n = e.length - 1, s = [];
    s.push(e[0]);
    const a = this.simplifyRecursive(
      e,
      0,
      n,
      t,
      i
    );
    return s.push(...a), s.push(e[n]), F.timeEndLevel(c.INFO, "simplify"), F.debug("simplified -> %s", s.length), s;
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
  static simplifyRecursive(e, t, i, n, s) {
    let a = 0, o = -1;
    const l = [], u = N.toEcef(e[t], s), g = N.toEcef(e[i], s);
    for (let d = t + 1; d < i; d++) {
      const v = N.toEcef(e[d], s).distanceToSegment(u, g);
      v > a && (a = v, o = d);
    }
    if (a > n && o !== -1) {
      if (o - t > 1) {
        const d = this.simplifyRecursive(
          e,
          t,
          o,
          n,
          s
        );
        l.push(...d);
      }
      if (l.push(e[o]), i - o > 1) {
        const d = this.simplifyRecursive(
          e,
          o,
          i,
          n,
          s
        );
        l.push(...d);
      }
    }
    return l;
  }
}
class T {
  /**
   * Calculate great circle distance between two geographic coordinates using Haversine formula
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in meters
   */
  static haversine(e, t) {
    const i = e.latitude * R.DEG_TO_RAD, n = t.latitude * R.DEG_TO_RAD, s = (t.latitude - e.latitude) * R.DEG_TO_RAD, a = (t.longitude - e.longitude) * R.DEG_TO_RAD, o = Math.sin(s / 2) * Math.sin(s / 2) + Math.cos(i) * Math.cos(n) * Math.sin(a / 2) * Math.sin(a / 2), l = 2 * Math.atan2(Math.sqrt(o), Math.sqrt(1 - o));
    return D.MEAN_RADIUS * l;
  }
  /**
   * Calculate Euclidean distance between two 3D points
   * @param point1 - First 3D point
   * @param point2 - Second 3D point
   * @returns Distance in meters
   */
  static euclidean3D(e, t) {
    const i = e.x - t.x, n = e.y - t.y, s = e.z - t.z;
    return Math.sqrt(i * i + n * n + s * s);
  }
  /**
   * Calculate perpendicular distance from a point to a line segment in 3D space
   * @param point - Point to measure from
   * @param segmentStart - Start point of line segment
   * @param segmentEnd - End point of line segment
   * @returns Perpendicular distance in meters
   */
  static pointToSegment3D(e, t, i) {
    const n = i.subtract(t), s = e.subtract(t), a = n.dot(n);
    if (a === 0)
      return T.euclidean3D(e, t);
    const o = Math.max(0, Math.min(1, s.dot(n) / a)), l = t.add(n.multiply(o));
    return T.euclidean3D(e, l);
  }
  /**
   * Calculate cumulative distances along a path of coordinates
   * @param points - Array of coordinates
   * @returns Array of cumulative distances in meters
   */
  static cumulativeDistances(e) {
    const t = [0];
    for (let i = 1; i < e.length; i++) {
      const n = T.haversine(e[i - 1], e[i]);
      t.push(t[i - 1] + n);
    }
    return t;
  }
  /**
   * Calculate total distance along a path of coordinates
   * @param points - Array of coordinates
   * @returns Total distance in meters
   */
  static totalPathDistance(e) {
    if (e.length < 2)
      return 0;
    let t = 0;
    for (let i = 1; i < e.length; i++)
      t += T.haversine(e[i - 1], e[i]);
    return t;
  }
}
const z = M("utils/ElevationSmoother");
class J {
  /**
   * Apply distance-based smoothing to elevation data
   * @param points - Array of coordinates with elevation
   * @param windowSize - Smoothing window in meters (default: 50)
   * @returns Smoothed elevation data
   */
  static smooth(e, t = 50) {
    if (z.debug("smooth %s", e.length), e.length < P.MIN_SMOOTHING_POINTS)
      return z.debug("too small"), e;
    if (t <= 0)
      throw new Error(`Invalid window size: ${t}. Must be positive`);
    z.timeLevel(c.INFO, "smooth");
    const i = T.cumulativeDistances(e), n = [];
    for (let s = 0; s < e.length; s++) {
      const a = this.computeSmoothedValue(s, e, i, t);
      n.push({
        ...e[s],
        elevation: a
      });
    }
    return z.timeEndLevel(c.INFO, "smooth"), n;
  }
  /**
   * Compute smoothed elevation value for a single point
   * @param index - Index of point to smooth
   * @param points - All points
   * @param distances - Cumulative distances
   * @param windowSize - Smoothing window in meters
   * @returns Smoothed elevation value
   */
  static computeSmoothedValue(e, t, i, n) {
    const s = i[e];
    let a = e;
    for (; a > 0 && s - i[a - 1] <= n; )
      a--;
    let o = e;
    for (; o < t.length - 1 && i[o + 1] - s <= n; )
      o++;
    let l = 0, u = 0;
    for (let g = a; g <= o; g++) {
      const m = 1 - Math.abs(i[g] - s) / n;
      l += m, u += t[g].elevation * m;
    }
    return l > 0 ? u / l : t[e].elevation;
  }
}
const r = M("calculator/BatchCalculator");
class Z {
  constructor(e) {
    this.elevationCalculator = e;
  }
  /**
   * Get elevations for multiple coordinates from an iterable
   * @param coordinates - Iterable of coordinates (array, generator, etc.)
   * @param zoomLevel - Tile zoom level (0-15)
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevationsFrom(e, t, i = !0) {
    const s = [];
    let a = [], o = 0, l = 0;
    r.info(
      "Batch processing started - zoom: %d, interpolation: %s, batchSize: %d",
      t,
      i,
      100
    );
    const u = "batch-elevations";
    r.timeLevel(c.INFO, u);
    for (const g of e) {
      const d = this.elevationCalculator.getElevation(
        g,
        t,
        i
      );
      if (a.push(d), a.length >= 100) {
        l++, r.debug("Processing batch %d (%d coordinates)", l, a.length);
        const m = `batch-${l}`;
        r.timeLevel(c.DEBUG, m);
        const v = await Promise.all(a);
        s.push(...v), o += a.length, r.timeEndLevel(c.DEBUG, m), r.debug(
          "Batch %d completed - processed: %d, total: %d",
          l,
          a.length,
          o
        ), a = [];
      }
    }
    if (a.length > 0) {
      l++, r.debug("Processing final batch %d (%d coordinates)", l, a.length);
      const g = `batch-${l}`;
      r.timeLevel(c.DEBUG, g);
      const d = await Promise.all(a);
      s.push(...d), o += a.length, r.timeEndLevel(c.DEBUG, g), r.debug(
        "Final batch %d completed - processed: %d, total: %d",
        l,
        a.length,
        o
      );
    }
    return r.timeEndLevel(c.INFO, u), r.info(
      "Batch processing completed - total coordinates: %d, batches: %d",
      o,
      l
    ), s;
  }
  /**
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param zoomLevel - Tile zoom level (0-15)
   * @param step - Distance between elevation points in meters
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   * @param smoothingOptions - Optional distance-based smoothing options
   * @param filterOptions - Optional filtering options using Douglas-Peucker algorithm
   */
  async getElevationsAlong(e, t, i, n = !0, s, a) {
    const o = "path-elevations";
    if (r.timeLevel(c.INFO, o), r.info(
      "Path processing started - waypoints: %d, step: %dm, zoom: %d, interpolation: %s",
      e.length,
      i,
      t,
      n
    ), e.length < 2)
      throw r.error("Path validation failed - insufficient waypoints: %d", e.length), new Error("Path must contain at least 2 coordinates");
    if (i <= 1)
      throw r.error("Path validation failed - step too small: %dm", i), new Error(`Step is too small: ${i} meters`);
    r.debug("Generating coordinates along path");
    const l = "coordinate-generation";
    r.timeLevel(c.DEBUG, l);
    const u = Array.from(this.generateCoordinatesAlong(e, i));
    r.timeEndLevel(c.DEBUG, l), r.debug("Generated %d coordinates along path", u.length), r.debug("Fetching elevations for generated coordinates");
    const g = await this.getElevationsFrom(u, t, n);
    let d = u.map((m, v) => ({
      ...m,
      elevation: g[v]
    }));
    if (r.debug(
      "Combined coordinates with elevations - points: %d",
      d.length
    ), s?.enabled === !0 && d.length >= 3) {
      const m = s.windowSize ?? 50, v = d.length;
      r.debug("Applying elevation smoothing - windowSize: %dm", m);
      const E = "smoothing";
      r.timeLevel(c.DEBUG, E), d = J.smooth(
        d,
        m
      ), r.timeEndLevel(c.DEBUG, E), r.debug(
        "Smoothing completed - points: %d → %d",
        v,
        d.length
      );
    } else s?.enabled === !0 && r.debug(
      "Smoothing skipped - insufficient points: %d (minimum: 3)",
      d.length
    );
    if (a?.enabled === !0 && d.length > 2) {
      const m = a?.tolerance ?? 10, v = a?.zExaggeration ?? 3, E = d.length;
      r.debug(
        "Applying Douglas-Peucker filtering - tolerance: %d, zExaggeration: %d",
        m,
        v
      );
      const S = "filtering";
      r.timeLevel(c.DEBUG, S);
      const I = X.simplify(
        d,
        m,
        v
      );
      return r.timeEndLevel(c.DEBUG, S), r.debug(
        "Filtering completed - points: %d → %d (%.1f%% reduction)",
        E,
        I.length,
        (E - I.length) / E * 100
      ), r.timeEndLevel(c.INFO, o), r.info(
        "Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s",
        e.length,
        I.length,
        s?.enabled,
        a?.enabled
      ), I;
    } else a?.enabled === !0 && r.debug(
      "Filtering skipped - insufficient points: %d (minimum: 3)",
      d.length
    );
    return r.timeEndLevel(c.INFO, o), r.info(
      "Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s",
      e.length,
      d.length,
      s?.enabled,
      a?.enabled
    ), d;
  }
  /**
   * Generate coordinates along a path with multiple waypoints
   * @param path - Array of coordinates defining the path
   * @param step - Distance between points in meters
   */
  *generateCoordinatesAlong(e, t) {
    if (e.length < 2) {
      r.debug("Path generation skipped - insufficient waypoints: %d", e.length);
      return;
    }
    r.debug("Generating coordinates - waypoints: %d, step: %dm", e.length, t), yield e[0];
    let i = 1, n = 0;
    for (let s = 0; s < e.length - 1; s++) {
      const a = T.haversine(e[s], e[s + 1]);
      if (a < P.MIN_SEGMENT_DISTANCE) {
        n++, r.debug(
          "Segment %d skipped - distance too short: %.2fm (minimum: %.2fm)",
          s + 1,
          a,
          P.MIN_SEGMENT_DISTANCE
        );
        continue;
      }
      r.debug("Processing segment %d - distance: %.2fm", s + 1, a);
      let o = !0, l = 0;
      for (const u of this.generateCoordinatesBetween(e[s], e[s + 1], t)) {
        if (o) {
          o = !1;
          continue;
        }
        yield u, i++, l++;
      }
      r.debug("Segment %d completed - generated: %d points", s + 1, l);
    }
    n > 0 ? r.debug(
      "Path generation completed - generated: %d points, skipped segments: %d",
      i,
      n
    ) : r.debug("Path generation completed - generated: %d points", i);
  }
  /**
   * Generate coordinates between two points at regular intervals
   * @param coordinate1 - Start coordinate
   * @param coordinate2 - End coordinate
   * @param step - Distance between points in meters
   */
  *generateCoordinatesBetween(e, t, i) {
    const n = T.haversine(e, t);
    if (yield e, n <= i) {
      yield t;
      return;
    }
    const s = Math.floor(n / i), a = t.latitude - e.latitude, o = t.longitude - e.longitude;
    for (let l = 1; l <= s; l++) {
      const u = l * i / n;
      yield {
        latitude: e.latitude + a * u,
        longitude: e.longitude + o * u
      };
    }
    yield t;
  }
}
const ee = M("ElevationProvider");
class te {
  // ============================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ============================================================================
  constructor(e = {}) {
    this.config = {
      zoomLevel: e.zoomLevel ?? 12,
      cacheSize: e.cacheSize ?? 100,
      tileUrlTemplate: e.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: e.timeout ?? 5e3
    }, ee.dir("Config :", this.config), this.validateConfig(), this.tileManager = new W(
      this.config.tileUrlTemplate,
      this.config.timeout,
      this.config.cacheSize
    ), this.calculator = new K(this.tileManager), this.batchCalculator = new Z(this.calculator);
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
  async getElevation(e, t, i) {
    const n = i?.interpolation ?? !0, s = { latitude: e, longitude: t };
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
  async getElevationsFrom(e, t) {
    const i = t?.interpolation ?? !0;
    return this.batchCalculator.getElevationsFrom(
      e,
      this.config.zoomLevel,
      i
    );
  }
  /**
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param options - Optional parameters
   */
  async getElevationsAlong(e, t) {
    const i = t?.step ?? 10, n = t?.interpolation ?? !0, s = t?.smoothingOptions, a = t?.filterOptions;
    return this.batchCalculator.getElevationsAlong(
      e,
      this.config.zoomLevel,
      i,
      n,
      s,
      a
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
    const { zoomLevel: e, cacheSize: t, timeout: i } = this.config;
    if (!Number.isInteger(e) || e < 0 || e > 15)
      throw new Error(
        `Invalid zoom level: ${e}. Must be an integer between 0 and 15`
      );
    if (!Number.isInteger(t) || t <= 0)
      throw new Error(`Invalid cache size: ${t}. Must be a positive integer`);
    if (!Number.isInteger(i) || i <= 0)
      throw new Error(`Invalid timeout: ${i}. Must be a positive integer`);
  }
}
export {
  te as ElevationProvider,
  te as default
};
//# sourceMappingURL=index.esm.js.map
