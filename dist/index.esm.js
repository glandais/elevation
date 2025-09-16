class p {
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
class E {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor(t, e = 5e3) {
    this.tileUrlTemplate = t, this.timeout = e, this.canvasPool = new p();
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
      const a = await createImageBitmap(t);
      return e.width = a.width, e.height = a.height, i.drawImage(a, 0, 0), { data: i.getImageData(0, 0, a.width, a.height), bitmap: a };
    } catch (i) {
      throw new Error(
        `Failed to process image: ${i instanceof Error ? i.message : "Unknown error"}`
      );
    } finally {
      this.canvasPool.release(e);
    }
  }
}
class T {
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
class I {
  // ========================================================================
  // CONSTRUCTOR & VALIDATION
  // ========================================================================
  constructor(t, e, i, a) {
    if (this.head = null, this.tail = null, t <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = t, this.keyMapper = e, this.valueBuilder = i, this.cleanupFn = a, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new T(t);
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
      const a = this.cache.get(e);
      if (a)
        return this.moveToFront(e), a;
      const r = await this.valueBuilder(t);
      return this.set(e, r), r;
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
class y {
  constructor(t, e, i) {
    this.tileFetcher = new E(t, e);
    const a = (r) => {
      r.bitmap.close();
    };
    this.cache = new I(
      i,
      (r) => `${r.z}/${r.x}/${r.y}`,
      (r) => this.tileFetcher.loadTile(r),
      a
    );
  }
  async getTile(t) {
    return await this.cache.get(t);
  }
  clearCache() {
    this.cache.clear();
  }
}
class M {
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
const o = class o {
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
        const a = this.toPixel(t, e);
        return await this.getElevationFromPixel(a);
      }
    } catch (a) {
      throw a instanceof Error ? new Error(`Failed to get elevation: ${a.message}`) : new Error("Failed to get elevation: Unknown error");
    }
  }
  async getInterpolatedElevationInternal(t, e) {
    const i = this.toPixel(t, e), a = {
      tile: i.tile,
      x: i.x,
      y: i.y
    }, r = Math.floor(a.x), s = Math.floor(a.y), n = r + 1, l = s + 1, h = a.x - r, u = a.y - s, d = await this.getElevationFromPixel(
      this.normalizePixel({ tile: a.tile, x: r, y: s })
    ), m = await this.getElevationFromPixel(
      this.normalizePixel({ tile: a.tile, x: n, y: s })
    ), w = await this.getElevationFromPixel(
      this.normalizePixel({ tile: a.tile, x: r, y: l })
    ), v = await this.getElevationFromPixel(
      this.normalizePixel({ tile: a.tile, x: n, y: l })
    ), f = d * (1 - h) + m * h, x = w * (1 - h) + v * h;
    return f * (1 - u) + x * u;
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
    const i = this.degToRad(t.latitude), a = Math.pow(2, e), r = (t.longitude + 180) / 360 * a, s = (1 - Math.log(Math.tan(i) + 1 / Math.cos(i)) / Math.PI) / 2 * a;
    let n = Math.floor(r), l = Math.floor(s);
    const h = a - 1;
    n = Math.max(0, Math.min(h, n)), l = Math.max(0, Math.min(h, l));
    const u = Math.floor((r - n) * o.TILE_SIZE), d = Math.floor((s - l) * o.TILE_SIZE);
    return {
      tile: {
        z: e,
        x: n,
        y: l
      },
      x: Math.max(0, Math.min(o.TILE_SIZE - 1, u)),
      y: Math.max(0, Math.min(o.TILE_SIZE - 1, d))
    };
  }
  /**
   * Get elevation for a specific pixel (internal helper)
   */
  async getElevationFromPixel(t) {
    const e = await this.tileManager.getTile(t.tile);
    return M.getElevationFromImageData(e.data, t);
  }
  normalizePixel(t) {
    let { x: e, y: i } = t;
    const a = t.tile;
    let r = a.x, s = a.y;
    const n = a.z;
    e < 0 && (e += o.TILE_SIZE, r -= 1), e >= o.TILE_SIZE && (e -= o.TILE_SIZE, r += 1), i < 0 && (i += o.TILE_SIZE, s -= 1), i >= o.TILE_SIZE && (i -= o.TILE_SIZE, s += 1);
    const l = Math.pow(2, n) - 1;
    return r = Math.max(0, Math.min(l, r)), s = Math.max(0, Math.min(l, s)), { tile: { z: n, x: r, y: s }, x: e, y: i };
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
o.TILE_SIZE = 256;
let g = o;
class b {
  constructor(t) {
    this.elevationCalculator = t;
  }
  /**
   * Get elevations for multiple coordinates from an iterator
   * @param coordinates - Iterator of coordinates
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevationsFrom(t, e, i = !0) {
    const r = [];
    let s = [], n = t.next();
    for (; !n.done; ) {
      const l = this.elevationCalculator.getElevation(
        n.value,
        e,
        i
      );
      if (s.push(l), s.length >= 100) {
        const h = await Promise.all(s);
        r.push(...h), s = [];
      }
      n = t.next();
    }
    if (s.length > 0) {
      const l = await Promise.all(s);
      r.push(...l);
    }
    return r;
  }
}
class F {
  // ============================================================================
  // CONSTRUCTOR & CONFIGURATION
  // ============================================================================
  constructor(t = {}) {
    this.config = {
      zoomLevel: t.zoomLevel ?? 12,
      cacheSize: t.cacheSize ?? 100,
      tileUrlTemplate: t.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: t.timeout ?? 5e3
    }, this.validateConfig(), this.tileManager = new y(
      this.config.tileUrlTemplate,
      this.config.timeout,
      this.config.cacheSize
    ), this.calculator = new g(this.tileManager), this.batchCalculator = new b(this.calculator);
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
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevation(t, e, i = !0) {
    const a = { latitude: t, longitude: e };
    return await this.calculator.getElevation(a, this.config.zoomLevel, i);
  }
  // ============================================================================
  // PUBLIC API - BULK COORDINATE METHODS
  // ============================================================================
  /**
   * Get elevations for multiple coordinates from an array
   * @param coordinates - Array of coordinates
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevationsFromArray(t, e = !0) {
    return this.getElevationsFrom(t.values(), e);
  }
  /**
   * Get elevations for multiple coordinates from an iterator
   * @param coordinates - Iterator of coordinates
   * @param interpolation - Use bilinear interpolation for smoother results (default: true)
   */
  async getElevationsFrom(t, e = !0) {
    return this.batchCalculator.getElevationsFrom(
      t,
      this.config.zoomLevel,
      e
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
  F as ElevationProvider
};
//# sourceMappingURL=index.esm.js.map
