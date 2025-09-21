const x = class x {
};
x.ERROR = 0, x.WARN = 1, x.INFO = 2, x.DEBUG = 3, x.TRACE = 4;
let d = x;
const q = {
  warn: d.WARN
}, A = {
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
class B {
  constructor(e) {
    this.namespace = e, this.level = q.warn;
  }
  shouldLog(e) {
    return e <= this.level;
  }
  doLog(e, t, ...i) {
    const n = `[${this.namespace}:${A[e]}]`;
    typeof t == "string" ? $[e](`${n} ${t}`, ...i) : $[e](n, t, ...i);
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
    this.log(d.WARN, e, ...t);
  }
  /**
   * Log errors
   * Supports printf-style formatting: logger.error('Failed to load %s: %o', file, error)
   */
  error(e, ...t) {
    this.log(d.ERROR, e, ...t);
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
    this.doTime(d.INFO, e);
  }
  /**
   * End timing and log duration
   */
  timeEnd(e) {
    this.doTimeEnd(d.INFO, e);
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
    this.logDir(d.INFO, e, t, i);
  }
  /**
   * Clear the console
   */
  clear() {
    console.clear();
  }
}
const y = (l) => new B(l), m = y("tile/cache/ReentrantLock");
class Q {
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
    if (m.debug(
      "%s: Lock acquire requested (active: %d/%d, queued: %d)",
      e,
      this.loadingCount,
      this.maxConcurrent,
      this.waitQueue.length
    ), this.locks.has(e))
      return m.debug(
        "%s: Lock deduplication - already loading, returning existing promise",
        e
      ), this.locks.get(e);
    if (await this.acquireLoadingSlot(e), this.locks.has(e))
      return m.debug(
        "%s: Lock race condition - already loading after slot acquired, releasing slot",
        e
      ), this.releaseLoadingSlot(e), this.locks.get(e);
    m.debug("%s: Lock creating new promise", e);
    const i = (async () => {
      try {
        m.debug("%s: Promise executing function", e);
        const n = await t();
        return m.debug("%s: Promise resolved successfully", e), n;
      } catch (n) {
        throw m.error("%s: Promise rejected - %o", e, n), n;
      } finally {
        m.debug("%s: Promise cleanup - removing lock and releasing slot", e), this.locks.delete(e), this.releaseLoadingSlot(e);
      }
    })();
    return this.locks.set(e, i), m.debug("%s: Lock registered promise (total locks: %d)", e, this.locks.size), i;
  }
  // ========================================================================
  // PRIVATE - SEMAPHORE OPERATIONS
  // ========================================================================
  /**
   * Acquire a loading slot (semaphore acquire)
   */
  async acquireLoadingSlot(e) {
    if (this.loadingCount < this.maxConcurrent) {
      this.loadingCount++, m.debug(
        "%s: Semaphore acquired slot immediately (%d/%d active, %d queued)",
        e,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
      return;
    }
    return m.debug(
      "%s: Semaphore waiting for slot (%d/%d active, %d queued)",
      e,
      this.loadingCount,
      this.maxConcurrent,
      this.waitQueue.length
    ), m.timeLevel(d.DEBUG, e), new Promise((t) => {
      this.waitQueue.push(() => {
        m.timeEndLevel(d.DEBUG, e), this.loadingCount++, m.debug(
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
      m.debug(
        "%s: Semaphore: releasing slot to waiting request (%d/%d active, %d queued)",
        e,
        this.loadingCount,
        this.maxConcurrent,
        this.waitQueue.length
      );
      const t = this.waitQueue.shift();
      t && t();
    } else
      this.loadingCount--, m.debug(
        "%s: Semaphore: released slot (%d/%d active, %d queued)",
        e,
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
  constructor(e, t, i, n) {
    if (this.head = null, this.tail = null, e <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = e, this.keyMapper = t, this.valueBuilder = i, this.cleanupFn = n, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new Q(e);
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
    return i ? (this.moveToFront(t), i) : (E.debug("%s miss", t), this.lock.acquire(t, async () => {
      const n = this.cache.get(t);
      if (n)
        return E.debug("%s Missed at first but now OK", t), this.moveToFront(t), n;
      E.info("%s loading", t), E.timeLevel(d.INFO, t);
      const s = await this.valueBuilder(e);
      return E.info("%s loaded", t), E.timeEndLevel(d.INFO, t), this.set(t, s), s;
    }));
  }
  /**
   * Clear all cached items
   */
  clear() {
    if (E.debug("clear"), this.cleanupFn)
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
    if (E.debug("%s delete", e), !this.cache.has(e))
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
const C = y("tile/fetcher/TileLoader");
class k {
  constructor(e, t) {
    this.tileUrlTemplate = e, this.tileFetcher = t;
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  async loadTile(e) {
    const t = `${e.z}/${e.x}/${e.y}`, i = this.getTileUrl(e), n = `fetch-${t}`;
    C.timeLevel(d.DEBUG, n);
    try {
      const s = await this.tileFetcher.fetchTile(i);
      return C.timeEndLevel(d.DEBUG, n), s;
    } catch (s) {
      throw C.timeEndLevel(d.DEBUG, n), s instanceof Error ? new Error(`Failed to fetch tile from ${i}: ${s.message}`) : new Error(`Failed to fetch tile from ${i}: Unknown error`);
    }
  }
  // ========================================================================
  // PRIVATE
  // ========================================================================
  getTileUrl(e) {
    const i = `fetch-${`${e.z}/${e.x}/${e.y}`}`;
    return C.timeLevel(d.DEBUG, i), this.tileUrlTemplate.replace("{z}", e.z.toString()).replace("{x}", e.x.toString()).replace("{y}", e.y.toString());
  }
}
class K {
  constructor(e, t) {
    this.tileUrlTemplate = e, this.cacheSize = t;
  }
  async getTile(e) {
    return await (await this.checkCache()).get(e);
  }
  async checkCache() {
    if (this.cache)
      return this.cache;
    {
      let e;
      {
        const { BrowserTileFetcher: s } = await Promise.resolve().then(() => oe);
        e = new s();
      }
      const t = (s) => s.close(), i = new k(this.tileUrlTemplate, e), n = new j(
        this.cacheSize,
        (s) => `${s.z}/${s.x}/${s.y}`,
        (s) => i.loadTile(s),
        t
      );
      return this.cache = n, n;
    }
  }
}
const v = 256;
function H(l) {
  return l * Math.PI / 180;
}
function V(l) {
  return l >= -85.0511 && l <= 85.0511;
}
function W(l) {
  return l >= -180 && l <= 180;
}
function Y(l) {
  return Number.isInteger(l) && l >= 0 && l <= 15;
}
function S(l) {
  let { x: e, y: t } = l;
  const i = l.tile;
  let n = i.x, s = i.y;
  const a = i.z;
  e < 0 && (e += v, n -= 1), e >= v && (e -= v, n += 1), t < 0 && (t += v, s -= 1), t >= v && (t -= v, s += 1);
  const o = Math.pow(2, a) - 1;
  return n = Math.max(0, Math.min(o, n)), s = Math.max(0, Math.min(o, s)), { tile: { z: a, x: n, y: s }, x: e, y: t };
}
function U(l, e) {
  if (!V(l.latitude))
    throw new Error(
      `Invalid latitude: ${l.latitude}. Must be between -85.0511 and 85.0511`
    );
  if (!W(l.longitude))
    throw new Error(`Invalid longitude: ${l.longitude}. Must be between -180 and 180`);
  if (!Y(e))
    throw new Error(`Invalid zoom level: ${e}. Must be between 0 and 15`);
  const t = H(l.latitude), i = Math.pow(2, e), n = (l.longitude + 180) / 360 * i, s = (1 - Math.log(Math.tan(t) + 1 / Math.cos(t)) / Math.PI) / 2 * i;
  let a = Math.floor(n), o = Math.floor(s);
  const r = i - 1;
  return a = Math.max(0, Math.min(r, a)), o = Math.max(0, Math.min(r, o)), {
    x: a,
    y: o,
    xFloat: n,
    yFloat: s,
    z: e
  };
}
function X(l, e) {
  const t = U(l, e);
  return {
    x: t.x,
    y: t.y,
    z: t.z
  };
}
function O(l, e) {
  const t = U(l, e), i = Math.floor((t.xFloat - t.x) * v), n = Math.floor((t.yFloat - t.y) * v);
  return {
    tile: {
      z: e,
      x: t.x,
      y: t.y
    },
    x: Math.max(0, Math.min(v - 1, i)),
    y: Math.max(0, Math.min(v - 1, n))
  };
}
class J {
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
        const n = O(e, t);
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
    const i = O(e, t), n = {
      tile: i.tile,
      x: i.x,
      y: i.y
    }, s = Math.floor(n.x), a = Math.floor(n.y), o = s + 1, r = a + 1, c = n.x - s, g = n.y - a, u = await this.getElevationFromPixel(
      S({ tile: n.tile, x: s, y: a })
    ), f = await this.getElevationFromPixel(
      S({ tile: n.tile, x: o, y: a })
    ), w = await this.getElevationFromPixel(
      S({ tile: n.tile, x: s, y: r })
    ), M = await this.getElevationFromPixel(
      S({ tile: n.tile, x: o, y: r })
    ), G = u * (1 - c) + f * c, _ = w * (1 - c) + M * c;
    return G * (1 - g) + _ * g;
  }
  /**
   * Get elevation for a specific pixel (internal helper)
   */
  async getElevationFromPixel(e) {
    const i = (await this.tileManager.getTile(e.tile)).getRGBFromImageData(e);
    return this.decodeElevation(i);
  }
  /**
   * Decode elevation from RGB values using Terrarium encoding
   * Formula: elevation = (red * 256 + green + blue / 256) - 32768
   * @param rgb - RGB color values from terrain tile pixel
   * @returns Elevation in meters, rounded to 2 decimal places
   */
  decodeElevation(e) {
    const t = e.red * 256 + e.green + e.blue / 256 - 32768;
    return Math.round(t * 100) / 100;
  }
}
function F(l) {
  return { ...l, elevation: l.elevation ?? 0 };
}
class T {
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
    return new T(this.x - e.x, this.y - e.y, this.z - e.z);
  }
  /**
   * Add two vectors
   */
  add(e) {
    return new T(this.x + e.x, this.y + e.y, this.z + e.z);
  }
  /**
   * Multiply vector by scalar
   */
  multiply(e) {
    return new T(this.x * e, this.y * e, this.z * e);
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
    return new T(
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
    return e === 0 ? new T(0, 0, 0) : this.multiply(1 / e);
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
    const a = this.subtract(e).dot(i) / (n * n), o = Math.max(0, Math.min(1, a)), r = e.add(i.multiply(o));
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
}, N = {
  /** Minimum points needed for smoothing operations */
  MIN_SMOOTHING_POINTS: 3,
  /** Minimum segment distance in meters for path processing */
  MIN_SEGMENT_DISTANCE: 1
};
class D {
  /**
   * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
   * @param coordinates - Geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns ECEF coordinates as Vector3D
   */
  static toEcef(e, t = 3) {
    const i = e.latitude * Math.PI / 180, n = e.longitude * Math.PI / 180, s = t * (e.elevation || 0), a = Math.sin(i), o = z.SEMI_MAJOR_AXIS / Math.sqrt(1 - z.FIRST_ECCENTRICITY_SQUARED * a * a), r = Math.cos(i), c = Math.cos(n), g = Math.sin(n), u = (o + s) * r * c, f = (o + s) * r * g, w = (o * (1 - z.FIRST_ECCENTRICITY_SQUARED) + s) * a;
    return new T(u, f, w);
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
const I = y("utils/DouglasPeucker");
class Z {
  /**
   * Simplify a path using the Douglas-Peucker algorithm in 3D space
   * @param points - Array of coordinates with elevation
   * @param tolerance - Maximum allowed distance from simplified line in meters
   * @param zExaggeration - Elevation exaggeration factor for ECEF conversion (default: 3)
   * @returns Simplified array of coordinates
   */
  static simplify(e, t, i = 3) {
    if (I.info("simplify %s", e.length), e.length <= 2)
      return I.warn("too small"), [...e];
    I.timeLevel(d.INFO, "simplify");
    const n = e.length - 1, s = [];
    s.push(e[0]);
    const a = this.simplifyRecursive(
      e,
      0,
      n,
      t,
      i
    );
    return s.push(...a), s.push(e[n]), I.timeEndLevel(d.INFO, "simplify"), I.debug("simplified -> %s", s.length), s;
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
    const r = [], c = D.toEcef(e[t], s), g = D.toEcef(e[i], s);
    for (let u = t + 1; u < i; u++) {
      const w = D.toEcef(e[u], s).distanceToSegment(c, g);
      w > a && (a = w, o = u);
    }
    if (a > n && o !== -1) {
      if (o - t > 1) {
        const u = this.simplifyRecursive(
          e,
          t,
          o,
          n,
          s
        );
        r.push(...u);
      }
      if (r.push(e[o]), i - o > 1) {
        const u = this.simplifyRecursive(
          e,
          o,
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
  static haversine(e, t) {
    const i = e.latitude * L.DEG_TO_RAD, n = t.latitude * L.DEG_TO_RAD, s = (t.latitude - e.latitude) * L.DEG_TO_RAD, a = (t.longitude - e.longitude) * L.DEG_TO_RAD, o = Math.sin(s / 2) * Math.sin(s / 2) + Math.cos(i) * Math.cos(n) * Math.sin(a / 2) * Math.sin(a / 2), r = 2 * Math.atan2(Math.sqrt(o), Math.sqrt(1 - o));
    return z.MEAN_RADIUS * r;
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
      return b.euclidean3D(e, t);
    const o = Math.max(0, Math.min(1, s.dot(n) / a)), r = t.add(n.multiply(o));
    return b.euclidean3D(e, r);
  }
  /**
   * Calculate cumulative distances along a path of coordinates
   * @param points - Array of coordinates
   * @returns Array of cumulative distances in meters
   */
  static cumulativeDistances(e) {
    const t = [0];
    for (let i = 1; i < e.length; i++) {
      const n = b.haversine(e[i - 1], e[i]);
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
      t += b.haversine(e[i - 1], e[i]);
    return t;
  }
}
const R = y("utils/ElevationSmoother");
class ee {
  /**
   * Apply distance-based smoothing to elevation data
   * @param points - Array of coordinates with elevation
   * @param windowSize - Smoothing window in meters (default: 50)
   * @returns Smoothed elevation data
   */
  static smooth(e, t = 50) {
    if (R.debug("smooth %s", e.length), e.length < N.MIN_SMOOTHING_POINTS)
      return R.debug("too small"), e;
    if (t <= 0)
      throw new Error(`Invalid window size: ${t}. Must be positive`);
    R.timeLevel(d.INFO, "smooth");
    const i = b.cumulativeDistances(e), n = [];
    for (let s = 0; s < e.length; s++) {
      const a = this.computeSmoothedValue(s, e, i, t);
      n.push({
        ...e[s],
        elevation: a
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
  static computeSmoothedValue(e, t, i, n) {
    const s = i[e];
    let a = e;
    for (; a > 0 && s - i[a - 1] <= n; )
      a--;
    let o = e;
    for (; o < t.length - 1 && i[o + 1] - s <= n; )
      o++;
    let r = 0, c = 0;
    for (let g = a; g <= o; g++) {
      const f = 1 - Math.abs(i[g] - s) / n;
      r += f, c += t[g].elevation * f;
    }
    return r > 0 ? c / r : t[e].elevation;
  }
}
class P {
  constructor(e) {
    this.source = e;
  }
  static from(e) {
    async function* t() {
      for (const i of e)
        yield i;
    }
    return new P(t());
  }
  mapAsync(e, t = 1) {
    const i = this.source;
    async function* n() {
      const s = [];
      for await (const a of i) {
        const o = e(a);
        s.push(o), s.length >= t && (yield await s.shift());
      }
      for (; s.length > 0; )
        yield await s.shift();
    }
    return new P(n());
  }
  async countProcessed() {
    let e = 0;
    for await (const t of this.source)
      e++;
    return e;
  }
}
const h = y("calculator/BatchCalculator");
class te {
  constructor(e) {
    this.elevationCalculator = e;
  }
  async setElevations(e, t, i) {
    const n = {}, s = /* @__PURE__ */ new Map(), a = (r) => `${r.z}/${r.x}/${r.y}`;
    for (const r of e) {
      const c = X(r, t), g = a(c);
      let u = n[g];
      u || (u = [], n[g] = u, s.set(g, c)), u.push(r);
    }
    const o = Array.from(s.values());
    await P.from(o).mapAsync(async (r) => {
      const c = a(r), g = n[c];
      for (const u of g)
        u.elevation = await this.elevationCalculator.getElevation(
          u,
          t,
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
  async getElevationsAlong(e, t, i, n, s, a) {
    const o = "path-elevations";
    if (h.timeLevel(d.INFO, o), h.info(
      "Path processing started - waypoints: %d, step: %dm, zoom: %d, interpolation: %s",
      e.length,
      i,
      t,
      n
    ), e.length < 2)
      throw h.error("Path validation failed - insufficient waypoints: %d", e.length), new Error("Path must contain at least 2 coordinates");
    if (i <= 1)
      throw h.error("Path validation failed - step too small: %dm", i), new Error(`Step is too small: ${i} meters`);
    h.debug("Generating coordinates along path");
    const r = "coordinate-generation";
    h.timeLevel(d.DEBUG, r);
    let c = Array.from(this.generateCoordinatesAlong(e, i));
    if (h.timeEndLevel(d.DEBUG, r), h.debug("Generated %d coordinates along path", c.length), h.debug("Fetching elevations for generated coordinates"), await this.setElevations(c, t, n), h.debug("Combined coordinates with elevations - points: %d", c.length), s?.enabled === !0 && c.length >= 3) {
      const g = s.windowSize ?? 50, u = c.length;
      h.debug("Applying elevation smoothing - windowSize: %dm", g);
      const f = "smoothing";
      h.timeLevel(d.DEBUG, f), c = ee.smooth(c, g), h.timeEndLevel(d.DEBUG, f), h.debug(
        "Smoothing completed - points: %d → %d",
        u,
        c.length
      );
    } else s?.enabled === !0 && h.debug(
      "Smoothing skipped - insufficient points: %d (minimum: 3)",
      c.length
    );
    if (a?.enabled === !0 && c.length > 2) {
      const g = a?.tolerance ?? 10, u = a?.zExaggeration ?? 3, f = c.length;
      h.debug(
        "Applying Douglas-Peucker filtering - tolerance: %d, zExaggeration: %d",
        g,
        u
      );
      const w = "filtering";
      h.timeLevel(d.DEBUG, w);
      const M = Z.simplify(c, g, u);
      return h.timeEndLevel(d.DEBUG, w), h.debug(
        "Filtering completed - points: %d → %d (%f % reduction)",
        f,
        M.length,
        ((f - M.length) / f * 100).toFixed(1)
      ), h.timeEndLevel(d.INFO, o), h.info(
        "Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s",
        e.length,
        M.length,
        s?.enabled,
        a?.enabled
      ), M;
    } else a?.enabled === !0 && h.debug(
      "Filtering skipped - insufficient points: %d (minimum: 3)",
      c.length
    );
    return h.timeEndLevel(d.INFO, o), h.info(
      "Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s",
      e.length,
      c.length,
      s?.enabled,
      a?.enabled
    ), c;
  }
  /**
   * Generate coordinates along a path with multiple waypoints
   * @param path - Array of coordinates defining the path
   * @param step - Distance between points in meters
   */
  *generateCoordinatesAlong(e, t) {
    if (e.length < 2) {
      h.debug("Path generation skipped - insufficient waypoints: %d", e.length);
      return;
    }
    h.debug("Generating coordinates - waypoints: %d, step: %dm", e.length, t), yield F(e[0]);
    let i = 1, n = 0;
    for (let s = 0; s < e.length - 1; s++) {
      const a = b.haversine(e[s], e[s + 1]);
      if (a < N.MIN_SEGMENT_DISTANCE) {
        n++, h.debug(
          "Segment %d skipped - distance too short: %.2fm (minimum: %.2fm)",
          s + 1,
          a,
          N.MIN_SEGMENT_DISTANCE
        );
        continue;
      }
      h.debug("Processing segment %d - distance: %.2fm", s + 1, a);
      let o = !0, r = 0;
      for (const c of this.generateCoordinatesBetween(e[s], e[s + 1], t)) {
        if (o) {
          o = !1;
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
  *generateCoordinatesBetween(e, t, i) {
    const n = b.haversine(e, t);
    if (yield F(e), n <= i) {
      yield F(t);
      return;
    }
    const s = Math.floor(n / i), a = t.latitude - e.latitude, o = t.longitude - e.longitude;
    for (let r = 1; r <= s; r++) {
      const c = r * i / n;
      yield {
        latitude: e.latitude + a * c,
        longitude: e.longitude + o * c,
        elevation: 0
      };
    }
    yield F(t);
  }
}
const ie = y("ElevationProvider");
class le {
  // ============================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ============================================================================
  constructor(e = {}) {
    this.config = {
      zoomLevel: e.zoomLevel ?? 12,
      cacheSize: e.cacheSize ?? 100,
      tileUrlTemplate: e.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
    }, ie.dir("Config :", this.config), this.validateConfig(), this.tileManager = new K(this.config.tileUrlTemplate, this.config.cacheSize), this.calculator = new J(this.tileManager), this.batchCalculator = new te(this.calculator);
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
  async setElevations(e, t) {
    const i = t?.interpolation ?? !0;
    await this.batchCalculator.setElevations(e, this.config.zoomLevel, i);
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
  // PRIVATE - VALIDATION
  // ============================================================================
  validateConfig() {
    const { zoomLevel: e, cacheSize: t } = this.config;
    if (!Number.isInteger(e) || e < 0 || e > 15)
      throw new Error(
        `Invalid zoom level: ${e}. Must be an integer between 0 and 15`
      );
    if (!Number.isInteger(t) || t <= 0)
      throw new Error(`Invalid cache size: ${t}. Must be a positive integer`);
  }
}
const p = y("tile/fetcher/CanvasPool");
class ne {
  constructor(e) {
    this.available = [], this.idleSize = 5, this.idleTimeout = 3e4, this.idleTimer = null, this.totalCreated = 0, this.totalAcquired = 0, this.totalReleased = 0, this.builder = e;
  }
  /**
   * Acquire a canvas from the pool (creates new if none available)
   */
  acquire() {
    this.totalAcquired++;
    let e = this.available.pop();
    return e ? p.debug(
      "Canvas acquired from pool (pool size: %d → %d, total acquired: %d)",
      this.available.length + 1,
      this.available.length,
      this.totalAcquired
    ) : (e = this.builder(), this.totalCreated++, p.debug(
      "Canvas created - new canvas (total created: %d, pool size: %d)",
      this.totalCreated,
      this.available.length
    )), this._resetIdleTimer(), e;
  }
  /**
   * Return a canvas to the pool for reuse
   */
  release(e) {
    e ? (this.totalReleased++, this.available.push(e), p.debug(
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
    const e = this.available.length;
    let t = 0;
    if (e > this.idleSize) {
      for (p.debug(
        "Auto-trim triggered - pool size %d exceeds idle limit %d",
        e,
        this.idleSize
      ); this.available.length > this.idleSize; )
        this.available.pop(), t++;
      p.info(
        "Canvas pool trimmed - removed %d canvases (pool size: %d → %d)",
        t,
        e,
        this.available.length
      );
    } else
      p.debug(
        "Auto-trim skipped - pool size %d within idle limit %d",
        e,
        this.idleSize
      );
    this.idleTimer = null;
  }
}
class se {
  constructor(e, t) {
    this.data = e, this.bitmap = t;
  }
  close() {
    this.bitmap.close();
  }
  /**
   * Extract RGB values from ImageData at specific pixel position
   * @param imageData - Image data from terrain tile
   * @param position - Pixel coordinates within the tile
   * @returns RGB color values for elevation decoding
   */
  getRGBFromImageData(e) {
    const t = this.data;
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
class ae {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor() {
    this.canvasPool = new ne(() => document.createElement("canvas"));
  }
  /**
   * Fetch a tile image and return both ImageData and ImageBitmap for memory management
   * @param url - The URL of the tile to fetch
   * @param tileKey - The tile identifier for logging
   * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
   */
  async fetchTile(e) {
    const t = await fetch(e);
    if (!t.ok)
      throw new Error(`HTTP ${t.status}: ${t.statusText}`);
    const i = await t.blob(), n = await createImageBitmap(i), s = this.canvasPool.acquire();
    try {
      s.width = n.width, s.height = n.height;
      const a = s.getContext("2d", { willReadFrequently: !0 });
      if (!a)
        throw new Error("Failed to get 2D canvas context");
      a.drawImage(n, 0, 0);
      const o = a.getImageData(0, 0, n.width, n.height);
      return new se(o, n);
    } finally {
      this.canvasPool.release(s);
    }
  }
}
const oe = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BrowserTileFetcher: ae
}, Symbol.toStringTag, { value: "Module" }));
export {
  le as ElevationProvider,
  le as default
};
//# sourceMappingURL=index.esm.js.map
