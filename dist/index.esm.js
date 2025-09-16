const g = class g {
  static toPixel(t, e) {
    if (!this.isValidLatitude(t.latitude))
      throw new Error(
        `Invalid latitude: ${t.latitude}. Must be between -85.0511 and 85.0511`
      );
    if (!this.isValidLongitude(t.longitude))
      throw new Error(`Invalid longitude: ${t.longitude}. Must be between -180 and 180`);
    if (!this.isValidZoomLevel(e))
      throw new Error(`Invalid zoom level: ${e}. Must be between 0 and 15`);
    const i = this.degToRad(t.latitude), a = Math.pow(2, e), r = (t.longitude + 180) / 360 * a, n = (1 - Math.log(Math.tan(i) + 1 / Math.cos(i)) / Math.PI) / 2 * a;
    let l = Math.floor(r), o = Math.floor(n);
    const c = a - 1;
    l = Math.max(0, Math.min(c, l)), o = Math.max(0, Math.min(c, o));
    const d = Math.floor((r - l) * this.TILE_SIZE), m = Math.floor((n - o) * this.TILE_SIZE);
    return {
      tile: {
        z: e,
        x: l,
        y: o
      },
      x: Math.max(0, Math.min(this.TILE_SIZE - 1, d)),
      y: Math.max(0, Math.min(this.TILE_SIZE - 1, m))
    };
  }
  static degToRad(t) {
    return t * Math.PI / 180;
  }
  static isValidLatitude(t) {
    return t >= -85.0511 && t <= 85.0511;
  }
  static isValidLongitude(t) {
    return t >= -180 && t <= 180;
  }
  static isValidZoomLevel(t) {
    return Number.isInteger(t) && t >= 0 && t <= 15;
  }
};
g.TILE_SIZE = 256;
let u = g;
const w = {
  available: [],
  idleSize: 5,
  idleTimeout: 3e4,
  // 30 seconds
  idleTimer: null,
  acquire() {
    let s = this.available.pop();
    return s || (s = document.createElement("canvas")), this._resetIdleTimer(), s;
  },
  release(s) {
    s && (this.available.push(s), this._resetIdleTimer());
  },
  _resetIdleTimer() {
    this.idleTimer && clearTimeout(this.idleTimer), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
  },
  _trim() {
    for (; this.available.length > this.idleSize; )
      this.available.pop();
  }
};
class p {
  constructor(t = 5e3) {
    this.timeout = t;
  }
  /**
   * Fetch a tile image and return both ImageData and ImageBitmap for memory management
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
  /**
   * Fetch with timeout support
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
  /**
   * Convert blob to ImageData and ImageBitmap using createImageBitmap
   * This approach avoids memory leaks from Image objects and blob URLs
   */
  async blobToImageDataAndBitmap(t) {
    let e = null, i = null;
    try {
      if (e = w.acquire(), i = e.getContext("2d", { willReadFrequently: !0 }), !i)
        throw new Error("Failed to get 2D canvas context");
      const a = await createImageBitmap(t);
      return e.width = a.width, e.height = a.height, i.drawImage(a, 0, 0), { data: i.getImageData(0, 0, a.width, a.height), bitmap: a };
    } catch (a) {
      throw new Error(
        `Failed to process image: ${a instanceof Error ? a.message : "Unknown error"}`
      );
    } finally {
      e && w.release(e);
    }
  }
}
class x {
  /**
   * Decode elevation from RGB values using Terrarium encoding
   * Formula: elevation = (red * 256 + green + blue / 256) - 32768
   */
  static decodeElevation(t) {
    const e = t.red * 256 + t.green + t.blue / 256 - 32768;
    return Math.round(e * 100) / 100;
  }
  /**
   * Extract RGB values from ImageData at specific pixel position
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
    };
  }
  /**
   * Get elevation from ImageData at specific pixel position
   */
  static getElevationFromImageData(t, e) {
    const i = this.getRGBFromImageData(t, e);
    return this.decodeElevation(i);
  }
}
class I {
  constructor() {
    this.locks = /* @__PURE__ */ new Map();
  }
  async acquire(t, e) {
    if (this.locks.has(t))
      return this.locks.get(t);
    const i = (async () => {
      try {
        return await e();
      } finally {
        this.locks.delete(t);
      }
    })();
    return this.locks.set(t, i), i;
  }
}
class T {
  constructor(t = 100, e, i, a) {
    if (this.head = null, this.tail = null, this.lock = new I(), t <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = t, this.keyMapper = e, this.valueBuilder = i, this.cleanupFn = a, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map();
  }
  /**
   * Get item from cache
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
   * Store item in cache
   */
  set(t, e) {
    this.cache.size >= this.maxSize && this.evictLeastRecentlyUsed(), this.cache.set(t, e), this.addToFront(t);
  }
  /**
   * Check if item exists in cache
   */
  has(t) {
    const e = this.keyMapper(t);
    return this.cache.has(e);
  }
  /**
   * Remove item from cache
   */
  delete(t) {
    if (!this.cache.has(t))
      return !1;
    const e = this.cache.get(t);
    return this.cache.delete(t), this.removeFromLRU(t), e && this.cleanupFn && this.cleanupFn(e), !0;
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
  /**
   * Get all cached keys
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }
  /**
   * Get the least recently used keys in order
   */
  getLRUKeys(t = 10) {
    const e = [];
    let i = this.tail;
    for (; i && e.length < t; )
      e.push(i), i = this.lruOrder.get(i)?.prev || null;
    return e;
  }
  /**
   * Remove the least recently used item
   */
  evictLeastRecentlyUsed() {
    if (!this.tail)
      return;
    const t = this.tail;
    this.delete(t);
  }
  /**
   * Add a key to the front of the LRU list (most recently used)
   */
  addToFront(t) {
    const e = { prev: null, next: this.head };
    if (this.lruOrder.set(t, e), this.head) {
      const i = this.lruOrder.get(this.head);
      i && (i.prev = t);
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
   * Remove a key from the LRU list
   */
  removeFromLRU(t) {
    const e = this.lruOrder.get(t);
    if (e) {
      if (e.prev) {
        const i = this.lruOrder.get(e.prev);
        i && (i.next = e.next);
      } else
        this.head = e.next;
      if (e.next) {
        const i = this.lruOrder.get(e.next);
        i && (i.prev = e.prev);
      } else
        this.tail = e.prev;
      this.lruOrder.delete(t);
    }
  }
}
const h = class h {
  constructor(t = {}) {
    this.config = {
      zoomLevel: t.zoomLevel ?? 12,
      cacheSize: t.cacheSize ?? 100,
      tileUrlTemplate: t.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: t.timeout ?? 5e3
    }, this.validateConfig(), this.tileFetcher = new p(this.config.timeout);
    const e = (i) => {
      i.bitmap.close();
    };
    this.cache = new T(
      this.config.cacheSize,
      (i) => `${i.z}/${i.x}/${i.y}`,
      (i) => this.loadTile(i),
      e
    );
  }
  /**
   * Get tile URL from template
   */
  getTileUrl(t) {
    return this.config.tileUrlTemplate.replace("{z}", t.z.toString()).replace("{x}", t.x.toString()).replace("{y}", t.y.toString());
  }
  async loadTile(t) {
    const e = this.getTileUrl(t);
    return await this.tileFetcher.fetchTile(e);
  }
  /**
   * Get elevation at specific coordinates
   */
  async getElevation(t, e) {
    const i = { latitude: t, longitude: e }, a = u.toPixel(i, this.config.zoomLevel);
    return await this.getElevationPixel(a);
  }
  async getElevationPixel(t) {
    try {
      const i = (await this.cache.get(t.tile)).data;
      return x.getElevationFromImageData(i, t);
    } catch (e) {
      throw e instanceof Error ? new Error(`Failed to get elevation: ${e.message}`) : new Error("Failed to get elevation: Unknown error");
    }
  }
  async getInterpolatedElevation(t, e) {
    const i = { latitude: t, longitude: e }, a = u.toPixel(i, this.config.zoomLevel);
    return await this.getInterpolatedElevationPixel(a);
  }
  async getInterpolatedElevationPixel(t) {
    const e = Math.floor(t.x), i = Math.floor(t.y), a = e + 1, r = i + 1, n = t.x - e, l = t.y - i, o = await this.getElevationPixel(
      this.normalizePixel({ tile: t.tile, x: e, y: i })
    ), c = await this.getElevationPixel(
      this.normalizePixel({ tile: t.tile, x: a, y: i })
    ), d = await this.getElevationPixel(
      this.normalizePixel({ tile: t.tile, x: e, y: r })
    ), m = await this.getElevationPixel(
      this.normalizePixel({ tile: t.tile, x: a, y: r })
    ), f = o * (1 - n) + c * n, E = d * (1 - n) + m * n;
    return f * (1 - l) + E * l;
  }
  normalizePixel(t) {
    let { x: e, y: i } = t;
    const a = t.tile;
    let r = a.x, n = a.y;
    const l = a.z;
    e < 0 && (e += h.TILE_SIZE, r -= 1), e >= h.TILE_SIZE && (e -= h.TILE_SIZE, r += 1), i < 0 && (i += h.TILE_SIZE, n -= 1), i >= h.TILE_SIZE && (i -= h.TILE_SIZE, n += 1);
    const o = Math.pow(2, l) - 1;
    return r = Math.max(0, Math.min(o, r)), n = Math.max(0, Math.min(o, n)), { tile: { z: l, x: r, y: n }, x: e, y: i };
  }
  /**
   * Batch get elevations for multiple coordinates
   */
  async getInterpolatedElevations(t) {
    const e = t.map(
      (i) => this.getInterpolatedElevation(i.latitude, i.longitude)
    );
    return Promise.all(e);
  }
  /**
   * Batch get elevations for multiple coordinates
   */
  async getElevations(t) {
    const e = t.map(
      (i) => this.getElevation(i.latitude, i.longitude)
    );
    return Promise.all(e);
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Clear tile cache
   */
  clearCache() {
    this.cache.clear();
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
};
h.TILE_SIZE = 256;
let v = h;
export {
  v as ElevationProvider
};
//# sourceMappingURL=index.esm.js.map
