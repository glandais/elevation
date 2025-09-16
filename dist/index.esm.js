class I {
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
class b {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(t, e = 5e3) {
    this.tileUrlTemplate = t, this.timeout = e, this.canvasPool = new I();
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
class F {
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
  /**
   * Get current number of active operations
   * @returns Number of operations currently being loaded
   */
  getLoadingCount() {
    return this.locks.size;
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
class S {
  // ========================================================================
  // CONSTRUCTOR & VALIDATION
  // ========================================================================
  constructor(t, e, i, n) {
    if (this.head = null, this.tail = null, t <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = t, this.keyMapper = e, this.valueBuilder = i, this.cleanupFn = n, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new F(t);
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
   * Check if item exists in cache
   * @param k - Key to check
   * @returns True if key exists in cache
   */
  has(t) {
    const e = this.keyMapper(t);
    return this.cache.has(e);
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
  // PUBLIC API - INSPECTION METHODS
  // ========================================================================
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
class z {
  constructor(t, e, i) {
    this.tileFetcher = new b(t, e);
    const n = (s) => {
      s.bitmap.close();
    };
    this.cache = new S(
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
class L {
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
const u = class u {
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
        const n = this.toPixel(t, e);
        return await this.getElevationFromPixel(n);
      }
    } catch (n) {
      throw n instanceof Error ? new Error(`Failed to get elevation: ${n.message}`) : new Error("Failed to get elevation: Unknown error");
    }
  }
  async getInterpolatedElevationInternal(t, e) {
    const i = this.toPixel(t, e), n = {
      tile: i.tile,
      x: i.x,
      y: i.y
    }, s = Math.floor(n.x), a = Math.floor(n.y), r = s + 1, o = a + 1, l = n.x - s, c = n.y - a, h = await this.getElevationFromPixel(
      this.normalizePixel({ tile: n.tile, x: s, y: a })
    ), f = await this.getElevationFromPixel(
      this.normalizePixel({ tile: n.tile, x: r, y: a })
    ), g = await this.getElevationFromPixel(
      this.normalizePixel({ tile: n.tile, x: s, y: o })
    ), M = await this.getElevationFromPixel(
      this.normalizePixel({ tile: n.tile, x: r, y: o })
    ), T = h * (1 - l) + f * l, p = g * (1 - l) + M * l;
    return T * (1 - c) + p * c;
  }
  // ========================================================================
  // PRIVATE - HELPER METHODS
  // ========================================================================
  /**
   * Convert WGS84 coordinates to Web Mercator tile pixel coordinates
   * @param coords - WGS84 latitude/longitude coordinates
   * @param z - Zoom level (0-15)
   * @returns Pixel coordinates within the appropriate tile
   */
  toPixel(t, e) {
    if (!this.isValidLatitude(t.latitude))
      throw new Error(
        `Invalid latitude: ${t.latitude}. Must be between -85.0511 and 85.0511`
      );
    if (!this.isValidLongitude(t.longitude))
      throw new Error(`Invalid longitude: ${t.longitude}. Must be between -180 and 180`);
    if (!this.isValidZoomLevel(e))
      throw new Error(`Invalid zoom level: ${e}. Must be between 0 and 15`);
    const i = this.degToRad(t.latitude), n = Math.pow(2, e), s = (t.longitude + 180) / 360 * n, a = (1 - Math.log(Math.tan(i) + 1 / Math.cos(i)) / Math.PI) / 2 * n;
    let r = Math.floor(s), o = Math.floor(a);
    const l = n - 1;
    r = Math.max(0, Math.min(l, r)), o = Math.max(0, Math.min(l, o));
    const c = Math.floor((s - r) * u.TILE_SIZE), h = Math.floor((a - o) * u.TILE_SIZE);
    return {
      tile: {
        z: e,
        x: r,
        y: o
      },
      x: Math.max(0, Math.min(u.TILE_SIZE - 1, c)),
      y: Math.max(0, Math.min(u.TILE_SIZE - 1, h))
    };
  }
  /**
   * Get elevation for a specific pixel (internal helper)
   */
  async getElevationFromPixel(t) {
    const e = await this.tileManager.getTile(t.tile);
    return L.getElevationFromImageData(e.data, t);
  }
  normalizePixel(t) {
    let { x: e, y: i } = t;
    const n = t.tile;
    let s = n.x, a = n.y;
    const r = n.z;
    e < 0 && (e += u.TILE_SIZE, s -= 1), e >= u.TILE_SIZE && (e -= u.TILE_SIZE, s += 1), i < 0 && (i += u.TILE_SIZE, a -= 1), i >= u.TILE_SIZE && (i -= u.TILE_SIZE, a += 1);
    const o = Math.pow(2, r) - 1;
    return s = Math.max(0, Math.min(o, s)), a = Math.max(0, Math.min(o, a)), { tile: { z: r, x: s, y: a }, x: e, y: i };
  }
  // ========================================================================
  // PRIVATE - UTILITY FUNCTIONS
  // ========================================================================
  /**
   * Convert degrees to radians
   */
  degToRad(t) {
    return t * Math.PI / 180;
  }
  // ========================================================================
  // PRIVATE - VALIDATION FUNCTIONS
  // ========================================================================
  /**
   * Validate latitude is within Web Mercator bounds
   */
  isValidLatitude(t) {
    return t >= -85.0511 && t <= 85.0511;
  }
  /**
   * Validate longitude is within valid range
   */
  isValidLongitude(t) {
    return t >= -180 && t <= 180;
  }
  /**
   * Validate zoom level is within supported range
   */
  isValidZoomLevel(t) {
    return Number.isInteger(t) && t >= 0 && t <= 15;
  }
};
u.TILE_SIZE = 256;
let x = u;
class m {
  constructor(t, e, i) {
    this.x = t, this.y = e, this.z = i;
  }
  /**
   * Calculate Euclidean distance between two vectors
   */
  distanceTo(t) {
    const e = this.x - t.x, i = this.y - t.y, n = this.z - t.z;
    return Math.sqrt(e * e + i * i + n * n);
  }
  /**
   * Subtract two vectors
   */
  subtract(t) {
    return new m(this.x - t.x, this.y - t.y, this.z - t.z);
  }
  /**
   * Add two vectors
   */
  add(t) {
    return new m(this.x + t.x, this.y + t.y, this.z + t.z);
  }
  /**
   * Multiply vector by scalar
   */
  multiply(t) {
    return new m(this.x * t, this.y * t, this.z * t);
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
    return new m(
      this.y * t.z - this.z * t.y,
      this.z * t.x - this.x * t.z,
      this.x * t.y - this.y * t.x
    );
  }
  /**
   * Calculate the magnitude (length) of the vector
   */
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  /**
   * Normalize the vector to unit length
   */
  normalize() {
    const t = this.magnitude();
    return t === 0 ? new m(0, 0, 0) : this.multiply(1 / t);
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
    const a = this.subtract(t).dot(i) / (n * n), r = Math.max(0, Math.min(1, a)), o = t.add(i.multiply(r));
    return this.distanceTo(o);
  }
}
const v = {
  /** Semi-major axis in meters */
  SEMI_MAJOR_AXIS: 6378137,
  /** First eccentricity squared */
  FIRST_ECCENTRICITY_SQUARED: 0.00669437999014
};
class E {
  /**
   * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
   * @param coordinates - Geographic coordinates with elevation
   * @param zExaggeration - Elevation exaggeration factor (default: 3)
   * @returns ECEF coordinates as Vector3D
   */
  static toEcef(t, e = 3) {
    const i = t.latitude * Math.PI / 180, n = t.longitude * Math.PI / 180, s = e * t.elevation, a = Math.sin(i), r = v.SEMI_MAJOR_AXIS / Math.sqrt(1 - v.FIRST_ECCENTRICITY_SQUARED * a * a), o = Math.cos(i), l = Math.cos(n), c = Math.sin(n), h = (r + s) * o * l, f = (r + s) * o * c, g = (r * (1 - v.FIRST_ECCENTRICITY_SQUARED) + s) * a;
    return new m(h, f, g);
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
class R {
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
    const o = [], l = E.toEcef(t[e], s), c = E.toEcef(t[i], s);
    for (let h = e + 1; h < i; h++) {
      const g = E.toEcef(t[h], s).distanceToSegment(l, c);
      g > a && (a = g, r = h);
    }
    if (a > n && r !== -1) {
      if (r - e > 1) {
        const h = this.simplifyRecursive(
          t,
          e,
          r,
          n,
          s
        );
        o.push(...h);
      }
      if (o.push(t[r]), i - r > 1) {
        const h = this.simplifyRecursive(
          t,
          r,
          i,
          n,
          s
        );
        o.push(...h);
      }
    }
    return o;
  }
  /**
   * Calculate reduction percentage after simplification
   * @param originalCount - Original number of points
   * @param simplifiedCount - Number of points after simplification
   * @returns Reduction percentage (0-100)
   */
  static calculateReduction(t, e) {
    return t === 0 ? 0 : Math.round((t - e) / t * 100);
  }
  /**
   * Estimate appropriate tolerance based on path characteristics
   * @param points - Array of coordinates with elevation
   * @param targetReduction - Desired reduction percentage (0-100, default: 50)
   * @returns Suggested tolerance in meters
   */
  static estimateTolerance(t, e = 50) {
    if (t.length <= 2)
      return 10;
    const i = t.map((l) => l.elevation), n = Math.min(...i), a = Math.max(...i) - n, r = e / 100, o = Math.max(
      5,
      // Minimum 5 meters
      Math.min(
        100,
        // Maximum 100 meters
        a * r * 0.1
      )
    );
    return Math.round(o);
  }
}
const w = class w {
  // meters
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
      const o = this.elevationCalculator.getElevation(
        r,
        e,
        i
      );
      if (a.push(o), a.length >= 100) {
        const l = await Promise.all(a);
        s.push(...l), a = [];
      }
    }
    if (a.length > 0) {
      const r = await Promise.all(a);
      s.push(...r);
    }
    return s;
  }
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in meters
   */
  distance(t, e) {
    const n = t.latitude * Math.PI / 180, s = e.latitude * Math.PI / 180, a = (e.latitude - t.latitude) * Math.PI / 180, r = (e.longitude - t.longitude) * Math.PI / 180, o = Math.sin(a / 2) * Math.sin(a / 2) + Math.cos(n) * Math.cos(s) * Math.sin(r / 2) * Math.sin(r / 2);
    return 6371e3 * (2 * Math.atan2(Math.sqrt(o), Math.sqrt(1 - o)));
  }
  /**
   * Generate coordinates between two points at regular intervals
   * @param coordinate1 - Start coordinate
   * @param coordinate2 - End coordinate
   * @param step - Distance between points in meters
   */
  *generateCoordinatesBetween(t, e, i) {
    const n = this.distance(t, e);
    if (yield t, n <= i) {
      yield e;
      return;
    }
    const s = Math.floor(n / i), a = e.latitude - t.latitude, r = e.longitude - t.longitude;
    for (let o = 1; o <= s; o++) {
      const l = o * i / n;
      yield {
        latitude: t.latitude + a * l,
        longitude: t.longitude + r * l
      };
    }
    yield e;
  }
  /**
   * Get elevations between two coordinates at regular intervals
   * @param coordinate1 - Start coordinate
   * @param coordinate2 - End coordinate
   * @param zoomLevel - Tile zoom level (0-15)
   * @param step - Distance between elevation points in meters
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevationsBetween(t, e, i, n, s = !0) {
    const a = this.distance(t, e);
    if (a >= 1e4)
      throw new Error(`Points are too far from each other: ${a.toFixed(0)} meters`);
    if (n <= 1)
      throw new Error(`Step is too small: ${n} meters`);
    const r = Array.from(
      this.generateCoordinatesBetween(t, e, n)
    ), o = await this.getElevationsFrom(r, i, s);
    return r.map((l, c) => ({
      ...l,
      elevation: o[c]
    }));
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
        if (this.distance(t[i], t[i + 1]) < w.MIN_SEGMENT_DISTANCE)
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
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param zoomLevel - Tile zoom level (0-15)
   * @param step - Distance between elevation points in meters
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   * @param filterOptions - Optional filtering options using Douglas-Peucker algorithm
   */
  async getElevationsAlong(t, e, i, n = !0, s) {
    if (t.length < 2)
      throw new Error("Path must contain at least 2 coordinates");
    if (i <= 1)
      throw new Error(`Step is too small: ${i} meters`);
    const a = Array.from(this.generateCoordinatesAlong(t, i)), r = await this.getElevationsFrom(a, e, n), o = a.map((l, c) => ({
      ...l,
      elevation: r[c]
    }));
    if (s?.enabled === !0 && o.length > 2) {
      const l = s?.tolerance ?? 10, c = s?.zExaggeration ?? 3;
      return R.simplify(o, l, c);
    }
    return o;
  }
};
w.MIN_SEGMENT_DISTANCE = 1;
let y = w;
class P {
  // ============================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ============================================================================
  constructor(t = {}) {
    this.config = {
      zoomLevel: t.zoomLevel ?? 12,
      cacheSize: t.cacheSize ?? 100,
      tileUrlTemplate: t.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: t.timeout ?? 5e3
    }, this.validateConfig(), this.tileManager = new z(
      this.config.tileUrlTemplate,
      this.config.timeout,
      this.config.cacheSize
    ), this.calculator = new x(this.tileManager), this.batchCalculator = new y(this.calculator);
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
   * Get elevations between two coordinates at regular intervals
   * @param coordinate1 - Start coordinate
   * @param coordinate2 - End coordinate
   * @param options - Optional parameters
   */
  async getElevationsBetween(t, e, i) {
    const n = i?.step ?? 10, s = i?.interpolation ?? !0;
    return this.batchCalculator.getElevationsBetween(
      t,
      e,
      this.config.zoomLevel,
      n,
      s
    );
  }
  /**
   * Get elevations along a path defined by multiple coordinates
   * @param path - Array of coordinates defining the path
   * @param options - Optional parameters
   */
  async getElevationsAlong(t, e) {
    const i = e?.step ?? 10, n = e?.interpolation ?? !0, s = e?.filterOptions;
    return this.batchCalculator.getElevationsAlong(
      t,
      this.config.zoomLevel,
      i,
      n,
      s
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
  R as DouglasPeucker,
  E as EcefConverter,
  P as ElevationProvider,
  m as Vector3D
};
//# sourceMappingURL=index.esm.js.map
