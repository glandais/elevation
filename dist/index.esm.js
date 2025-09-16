class F {
  constructor() {
    this.available = [], this.idleSize = 5, this.idleTimeout = 3e4, this.idleTimer = null;
  }
  /**
   * Acquire a canvas from the pool (creates new if none available)
   */
  acquire() {
    let t = this.available.pop();
    return t || (t = document.createElement("canvas")), this._resetIdleTimer(), t;
  }
  /**
   * Return a canvas to the pool for reuse
   */
  release(t) {
    t && (this.available.push(t), this._resetIdleTimer());
  }
  /**
   * Reset the idle timer for automatic cleanup
   */
  _resetIdleTimer() {
    this.idleTimer && clearTimeout(this.idleTimer), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
  }
  /**
   * Trim excess canvases to prevent memory buildup
   */
  _trim() {
    for (; this.available.length > this.idleSize; )
      this.available.pop();
  }
}
class S {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(t, e = 5e3) {
    this.tileUrlTemplate = t, this.timeout = e, this.canvasPool = new F();
  }
  // ========================================================================
  // PUBLIC API
  // ========================================================================
  async loadTile(t) {
    const e = this.getTileUrl(t);
    return await this.fetchTile(e);
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
   * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
   */
  async fetchTile(t) {
    try {
      const e = await this.fetchWithTimeout(t);
      if (!e.ok)
        throw new Error(`HTTP ${e.status}: ${e.statusText}`);
      const i = await e.blob();
      return await this.blobToImageDataAndBitmap(i);
    } catch (e) {
      throw e instanceof Error ? new Error(`Failed to fetch tile from ${t}: ${e.message}`) : new Error(`Failed to fetch tile from ${t}: Unknown error`);
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
  async blobToImageDataAndBitmap(t) {
    const e = this.canvasPool.acquire();
    try {
      const i = e.getContext("2d", { willReadFrequently: !0 });
      if (!i)
        throw new Error("Failed to get 2D canvas context");
      const n = await createImageBitmap(t);
      return e.width = n.width, e.height = n.height, i.drawImage(n, 0, 0), { data: i.getImageData(0, 0, n.width, n.height), bitmap: n };
    } catch (i) {
      throw new Error(
        `Failed to process image: ${i instanceof Error ? i.message : "Unknown error"}`
      );
    } finally {
      this.canvasPool.release(e);
    }
  }
}
class R {
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
    if (this.locks.has(t))
      return this.locks.get(t);
    if (await this.acquireLoadingSlot(), this.locks.has(t))
      return this.releaseLoadingSlot(), this.locks.get(t);
    const i = (async () => {
      try {
        return await e();
      } finally {
        this.locks.delete(t), this.releaseLoadingSlot();
      }
    })();
    return this.locks.set(t, i), i;
  }
  // ========================================================================
  // PRIVATE - SEMAPHORE OPERATIONS
  // ========================================================================
  /**
   * Acquire a loading slot (semaphore acquire)
   */
  async acquireLoadingSlot() {
    if (this.loadingCount < this.maxConcurrent) {
      this.loadingCount++;
      return;
    }
    return new Promise((t) => {
      this.waitQueue.push(t);
    });
  }
  /**
   * Release a loading slot (semaphore release)
   */
  releaseLoadingSlot() {
    if (this.waitQueue.length > 0) {
      const t = this.waitQueue.shift();
      t && t();
    } else
      this.loadingCount--;
  }
}
class z {
  // ========================================================================
  // CONSTRUCTOR & VALIDATION
  // ========================================================================
  constructor(t, e, i, n) {
    if (this.head = null, this.tail = null, t <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = t, this.keyMapper = e, this.valueBuilder = i, this.cleanupFn = n, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new R(t);
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
    return i ? (this.moveToFront(e), i) : this.lock.acquire(e, async () => {
      const n = this.cache.get(e);
      if (n)
        return this.moveToFront(e), n;
      const s = await this.valueBuilder(t);
      return this.set(e, s), s;
    });
  }
  /**
   * Clear all cached items
   */
  clear() {
    if (this.cleanupFn)
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
    if (!this.cache.has(t))
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
class C {
  constructor(t, e, i) {
    this.tileFetcher = new S(t, e);
    const n = (s) => {
      s.bitmap.close();
    };
    this.cache = new z(
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
class A {
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
const d = 256;
function P(o) {
  return o * Math.PI / 180;
}
function D(o) {
  return o >= -85.0511 && o <= 85.0511;
}
function N(o) {
  return o >= -180 && o <= 180;
}
function L(o) {
  return Number.isInteger(o) && o >= 0 && o <= 15;
}
function w(o) {
  let { x: t, y: e } = o;
  const i = o.tile;
  let n = i.x, s = i.y;
  const a = i.z;
  t < 0 && (t += d, n -= 1), t >= d && (t -= d, n += 1), e < 0 && (e += d, s -= 1), e >= d && (e -= d, s += 1);
  const r = Math.pow(2, a) - 1;
  return n = Math.max(0, Math.min(r, n)), s = Math.max(0, Math.min(r, s)), { tile: { z: a, x: n, y: s }, x: t, y: e };
}
function T(o, t) {
  if (!D(o.latitude))
    throw new Error(
      `Invalid latitude: ${o.latitude}. Must be between -85.0511 and 85.0511`
    );
  if (!N(o.longitude))
    throw new Error(`Invalid longitude: ${o.longitude}. Must be between -180 and 180`);
  if (!L(t))
    throw new Error(`Invalid zoom level: ${t}. Must be between 0 and 15`);
  const e = P(o.latitude), i = Math.pow(2, t), n = (o.longitude + 180) / 360 * i, s = (1 - Math.log(Math.tan(e) + 1 / Math.cos(e)) / Math.PI) / 2 * i;
  let a = Math.floor(n), r = Math.floor(s);
  const l = i - 1;
  a = Math.max(0, Math.min(l, a)), r = Math.max(0, Math.min(l, r));
  const c = Math.floor((n - a) * d), h = Math.floor((s - r) * d);
  return {
    tile: {
      z: t,
      x: a,
      y: r
    },
    x: Math.max(0, Math.min(d - 1, c)),
    y: Math.max(0, Math.min(d - 1, h))
  };
}
class _ {
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
        const n = T(t, e);
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
    const i = T(t, e), n = {
      tile: i.tile,
      x: i.x,
      y: i.y
    }, s = Math.floor(n.x), a = Math.floor(n.y), r = s + 1, l = a + 1, c = n.x - s, h = n.y - a, u = await this.getElevationFromPixel(
      w({ tile: n.tile, x: s, y: a })
    ), g = await this.getElevationFromPixel(
      w({ tile: n.tile, x: r, y: a })
    ), v = await this.getElevationFromPixel(
      w({ tile: n.tile, x: s, y: l })
    ), p = await this.getElevationFromPixel(
      w({ tile: n.tile, x: r, y: l })
    ), I = u * (1 - c) + g * c, b = v * (1 - c) + p * c;
    return I * (1 - h) + b * h;
  }
  /**
   * Get elevation for a specific pixel (internal helper)
   */
  async getElevationFromPixel(t) {
    const e = await this.tileManager.getTile(t.tile);
    return A.getElevationFromImageData(e.data, t);
  }
}
class f {
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
    return new f(this.x - t.x, this.y - t.y, this.z - t.z);
  }
  /**
   * Add two vectors
   */
  add(t) {
    return new f(this.x + t.x, this.y + t.y, this.z + t.z);
  }
  /**
   * Multiply vector by scalar
   */
  multiply(t) {
    return new f(this.x * t, this.y * t, this.z * t);
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
    return new f(
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
    return t === 0 ? new f(0, 0, 0) : this.multiply(1 / t);
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
    const a = this.subtract(t).dot(i) / (n * n), r = Math.max(0, Math.min(1, a)), l = t.add(i.multiply(r));
    return this.distanceTo(l);
  }
}
const M = {
  /** Semi-major axis in meters (WGS84 ellipsoid) */
  SEMI_MAJOR_AXIS: 6378137,
  /** Mean radius in meters (used for distance calculations) */
  MEAN_RADIUS: 6371e3,
  /** First eccentricity squared (WGS84 ellipsoid) */
  FIRST_ECCENTRICITY_SQUARED: 0.00669437999014
}, E = {
  /** Degrees to radians conversion factor */
  DEG_TO_RAD: Math.PI / 180
}, x = {
  /** Minimum points needed for smoothing operations */
  MIN_SMOOTHING_POINTS: 3,
  /** Minimum segment distance in meters for path processing */
  MIN_SEGMENT_DISTANCE: 1
};
class y {
  /**
   * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
   * @param coordinates - Geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns ECEF coordinates as Vector3D
   */
  static toEcef(t, e = 3) {
    const i = t.latitude * Math.PI / 180, n = t.longitude * Math.PI / 180, s = e * t.elevation, a = Math.sin(i), r = M.SEMI_MAJOR_AXIS / Math.sqrt(1 - M.FIRST_ECCENTRICITY_SQUARED * a * a), l = Math.cos(i), c = Math.cos(n), h = Math.sin(n), u = (r + s) * l * c, g = (r + s) * l * h, v = (r * (1 - M.FIRST_ECCENTRICITY_SQUARED) + s) * a;
    return new f(u, g, v);
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
class O {
  /**
   * Simplify a path using the Douglas-Peucker algorithm in 3D space
   * @param points - Array of coordinates with elevation
   * @param tolerance - Maximum allowed distance from simplified line in meters
   * @param zExaggeration - Elevation exaggeration factor for ECEF conversion (default: 3)
   * @returns Simplified array of coordinates
   */
  static simplify(t, e, i = 3) {
    if (t.length <= 2)
      return [...t];
    const n = t.length - 1, s = [];
    s.push(t[0]);
    const a = this.simplifyRecursive(
      t,
      0,
      n,
      e,
      i
    );
    return s.push(...a), s.push(t[n]), s;
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
    let a = 0, r = -1;
    const l = [], c = y.toEcef(t[e], s), h = y.toEcef(t[i], s);
    for (let u = e + 1; u < i; u++) {
      const v = y.toEcef(t[u], s).distanceToSegment(c, h);
      v > a && (a = v, r = u);
    }
    if (a > n && r !== -1) {
      if (r - e > 1) {
        const u = this.simplifyRecursive(
          t,
          e,
          r,
          n,
          s
        );
        l.push(...u);
      }
      if (l.push(t[r]), i - r > 1) {
        const u = this.simplifyRecursive(
          t,
          r,
          i,
          n,
          s
        );
        l.push(...u);
      }
    }
    return l;
  }
}
class m {
  /**
   * Calculate great circle distance between two geographic coordinates using Haversine formula
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in meters
   */
  static haversine(t, e) {
    const i = t.latitude * E.DEG_TO_RAD, n = e.latitude * E.DEG_TO_RAD, s = (e.latitude - t.latitude) * E.DEG_TO_RAD, a = (e.longitude - t.longitude) * E.DEG_TO_RAD, r = Math.sin(s / 2) * Math.sin(s / 2) + Math.cos(i) * Math.cos(n) * Math.sin(a / 2) * Math.sin(a / 2), l = 2 * Math.atan2(Math.sqrt(r), Math.sqrt(1 - r));
    return M.MEAN_RADIUS * l;
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
    const n = i.subtract(e), s = t.subtract(e), a = n.dot(n);
    if (a === 0)
      return m.euclidean3D(t, e);
    const r = Math.max(0, Math.min(1, s.dot(n) / a)), l = e.add(n.multiply(r));
    return m.euclidean3D(t, l);
  }
  /**
   * Calculate cumulative distances along a path of coordinates
   * @param points - Array of coordinates
   * @returns Array of cumulative distances in meters
   */
  static cumulativeDistances(t) {
    const e = [0];
    for (let i = 1; i < t.length; i++) {
      const n = m.haversine(t[i - 1], t[i]);
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
      e += m.haversine(t[i - 1], t[i]);
    return e;
  }
}
class U {
  /**
   * Apply distance-based smoothing to elevation data
   * @param points - Array of coordinates with elevation
   * @param windowSize - Smoothing window in meters (default: 50)
   * @returns Smoothed elevation data
   */
  static smooth(t, e = 50) {
    if (t.length < x.MIN_SMOOTHING_POINTS)
      return t;
    if (e <= 0)
      throw new Error(`Invalid window size: ${e}. Must be positive`);
    const i = m.cumulativeDistances(t), n = [];
    for (let s = 0; s < t.length; s++) {
      const a = this.computeSmoothedValue(s, t, i, e);
      n.push({
        ...t[s],
        elevation: a
      });
    }
    return n;
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
    let a = t;
    for (; a > 0 && s - i[a - 1] <= n; )
      a--;
    let r = t;
    for (; r < e.length - 1 && i[r + 1] - s <= n; )
      r++;
    let l = 0, c = 0;
    for (let h = a; h <= r; h++) {
      const g = 1 - Math.abs(i[h] - s) / n;
      l += g, c += e[h].elevation * g;
    }
    return l > 0 ? c / l : e[t].elevation;
  }
}
class $ {
  constructor(t) {
    this.elevationCalculator = t;
  }
  /**
   * Get elevations for multiple coordinates from an iterable
   * @param coordinates - Iterable of coordinates (array, generator, etc.)
   * @param zoomLevel - Tile zoom level (0-15)
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevationsFrom(t, e, i = !0) {
    const s = [];
    let a = [];
    for (const r of t) {
      const l = this.elevationCalculator.getElevation(
        r,
        e,
        i
      );
      if (a.push(l), a.length >= 100) {
        const c = await Promise.all(a);
        s.push(...c), a = [];
      }
    }
    if (a.length > 0) {
      const r = await Promise.all(a);
      s.push(...r);
    }
    return s;
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
  async getElevationsAlong(t, e, i, n = !0, s, a) {
    if (t.length < 2)
      throw new Error("Path must contain at least 2 coordinates");
    if (i <= 1)
      throw new Error(`Step is too small: ${i} meters`);
    const r = Array.from(this.generateCoordinatesAlong(t, i)), l = await this.getElevationsFrom(r, e, n);
    let c = r.map((h, u) => ({
      ...h,
      elevation: l[u]
    }));
    if (s?.enabled === !0 && c.length >= 3) {
      const h = s.windowSize ?? 50;
      c = U.smooth(
        c,
        h
      );
    }
    if (a?.enabled === !0 && c.length > 2) {
      const h = a?.tolerance ?? 10, u = a?.zExaggeration ?? 3;
      return O.simplify(c, h, u);
    }
    return c;
  }
  /**
   * Generate coordinates along a path with multiple waypoints
   * @param path - Array of coordinates defining the path
   * @param step - Distance between points in meters
   */
  *generateCoordinatesAlong(t, e) {
    if (!(t.length < 2)) {
      yield t[0];
      for (let i = 0; i < t.length - 1; i++) {
        if (m.haversine(t[i], t[i + 1]) < x.MIN_SEGMENT_DISTANCE)
          continue;
        let s = !0;
        for (const a of this.generateCoordinatesBetween(t[i], t[i + 1], e)) {
          if (s) {
            s = !1;
            continue;
          }
          yield a;
        }
      }
    }
  }
  /**
   * Generate coordinates between two points at regular intervals
   * @param coordinate1 - Start coordinate
   * @param coordinate2 - End coordinate
   * @param step - Distance between points in meters
   */
  *generateCoordinatesBetween(t, e, i) {
    const n = m.haversine(t, e);
    if (yield t, n <= i) {
      yield e;
      return;
    }
    const s = Math.floor(n / i), a = e.latitude - t.latitude, r = e.longitude - t.longitude;
    for (let l = 1; l <= s; l++) {
      const c = l * i / n;
      yield {
        latitude: t.latitude + a * c,
        longitude: t.longitude + r * c
      };
    }
    yield e;
  }
}
class G {
  // ============================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ============================================================================
  constructor(t = {}) {
    this.config = {
      zoomLevel: t.zoomLevel ?? 12,
      cacheSize: t.cacheSize ?? 100,
      tileUrlTemplate: t.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: t.timeout ?? 5e3
    }, this.validateConfig(), this.tileManager = new C(
      this.config.tileUrlTemplate,
      this.config.timeout,
      this.config.cacheSize
    ), this.calculator = new _(this.tileManager), this.batchCalculator = new $(this.calculator);
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
  async getElevationsFrom(t, e) {
    const i = e?.interpolation ?? !0;
    return this.batchCalculator.getElevationsFrom(
      t,
      this.config.zoomLevel,
      i
    );
  }
  /**
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param options - Optional parameters
   */
  async getElevationsAlong(t, e) {
    const i = e?.step ?? 10, n = e?.interpolation ?? !0, s = e?.smoothingOptions, a = e?.filterOptions;
    return this.batchCalculator.getElevationsAlong(
      t,
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
  G as ElevationProvider,
  G as default
};
//# sourceMappingURL=index.esm.js.map
