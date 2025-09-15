const u = class u {
  /**
   * Convert WGS84 coordinates to Web Mercator tile coordinates
   */
  static toTileCoordinates(t, e) {
    if (!this.isValidLatitude(t.latitude))
      throw new Error(
        `Invalid latitude: ${t.latitude}. Must be between -85.0511 and 85.0511`
      );
    if (!this.isValidLongitude(t.longitude))
      throw new Error(`Invalid longitude: ${t.longitude}. Must be between -180 and 180`);
    if (!this.isValidZoomLevel(e))
      throw new Error(`Invalid zoom level: ${e}. Must be between 0 and 15`);
    const i = this.degToRad(t.latitude), r = Math.pow(2, e), a = Math.floor((t.longitude + 180) / 360 * r), n = Math.floor((1 - Math.log(Math.tan(i) + 1 / Math.cos(i)) / Math.PI) / 2 * r);
    return { x: a, y: n, z: e };
  }
  /**
   * Get pixel position within a tile (0-255 range)
   */
  static getTilePixelPosition(t, e) {
    const i = this.degToRad(t.latitude), r = Math.pow(2, e.z), a = (t.longitude + 180) / 360 * r, n = (1 - Math.log(Math.tan(i) + 1 / Math.cos(i)) / Math.PI) / 2 * r, o = Math.floor((a - e.x) * this.TILE_SIZE), l = Math.floor((n - e.y) * this.TILE_SIZE);
    return {
      x: Math.max(0, Math.min(this.TILE_SIZE - 1, o)),
      y: Math.max(0, Math.min(this.TILE_SIZE - 1, l))
    };
  }
  /**
   * Convert tile coordinates back to WGS84 coordinates (for tile center)
   */
  static fromTileCoordinates(t) {
    const e = Math.pow(2, t.z), i = t.x / e * 360 - 180, r = Math.atan(Math.sinh(Math.PI * (1 - 2 * t.y / e)));
    return {
      latitude: this.radToDeg(r),
      longitude: i
    };
  }
  /**
   * Generate tile key for caching
   */
  static getTileKey(t) {
    return `${t.z}/${t.x}/${t.y}`;
  }
  /**
   * Get tile URL from template
   */
  static getTileUrl(t, e = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png") {
    return e.replace("{z}", t.z.toString()).replace("{x}", t.x.toString()).replace("{y}", t.y.toString());
  }
  static degToRad(t) {
    return t * Math.PI / 180;
  }
  static radToDeg(t) {
    return t * 180 / Math.PI;
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
u.TILE_SIZE = 256;
let s = u;
class M {
  constructor(t = 5e3) {
    this.timeout = t;
  }
  /**
   * Fetch a tile image and return ImageData
   */
  async fetchTile(t) {
    try {
      const e = await this.fetchWithTimeout(t);
      if (!e.ok)
        throw new Error(`HTTP ${e.status}: ${e.statusText}`);
      const i = await e.blob();
      return await this.blobToImageData(i);
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
        signal: e.signal,
        headers: {
          Accept: "image/png,image/jpeg,image/*",
          "Cache-Control": "max-age=86400"
          // 24 hours
        }
      });
    } finally {
      clearTimeout(i);
    }
  }
  /**
   * Convert blob to ImageData using Canvas API
   */
  async blobToImageData(t) {
    return new Promise((e, i) => {
      const r = new Image();
      r.onload = () => {
        try {
          const a = document.createElement("canvas"), n = a.getContext("2d");
          if (!n) {
            i(new Error("Failed to get 2D canvas context"));
            return;
          }
          a.width = r.width, a.height = r.height, n.drawImage(r, 0, 0);
          const o = n.getImageData(0, 0, r.width, r.height);
          e(o);
        } catch (a) {
          i(
            new Error(
              `Failed to process image: ${a instanceof Error ? a.message : "Unknown error"}`
            )
          );
        }
      }, r.onerror = () => {
        i(new Error("Failed to load image"));
      }, r.src = URL.createObjectURL(t);
    });
  }
}
class m {
  /**
   * Decode elevation from RGB values using Terrarium encoding
   * Formula: elevation = (red * 256 + green + blue / 256) - 32768
   */
  static decodeElevation(t) {
    const e = t.red * 256 + t.green + t.blue / 256 - 32768;
    return Math.round(e * 10) / 10;
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
  /**
   * Get interpolated elevation using bilinear interpolation
   * This provides smoother elevation values between pixels
   */
  static getInterpolatedElevation(t, e, i) {
    const r = Math.max(0, Math.min(t.width - 1, e)), a = Math.max(0, Math.min(t.height - 1, i)), n = Math.floor(r), o = Math.floor(a), l = Math.min(n + 1, t.width - 1), h = Math.min(o + 1, t.height - 1), c = r - n, g = a - o, w = this.getElevationFromImageData(t, { x: n, y: o }), f = this.getElevationFromImageData(t, { x: l, y: o }), v = this.getElevationFromImageData(t, { x: n, y: h }), E = this.getElevationFromImageData(t, { x: l, y: h }), T = w * (1 - c) + f * c, x = v * (1 - c) + E * c, p = T * (1 - g) + x * g;
    return Math.round(p * 10) / 10;
  }
  /**
   * Validate that RGB values represent valid terrain data
   */
  static isValidTerrainData(t) {
    return !(t.red === 0 && t.green === 0 && t.blue === 0 || t.red === 255 && t.green === 255 && t.blue === 255);
  }
}
class I {
  constructor(t = 100) {
    if (this.head = null, this.tail = null, t <= 0)
      throw new Error("Cache size must be greater than 0");
    this.maxSize = t, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map();
  }
  /**
   * Get tile from cache
   */
  get(t) {
    const e = this.cache.get(t);
    return e ? (this.moveToFront(t), e.data) : null;
  }
  /**
   * Store tile in cache
   */
  set(t, e) {
    if (this.cache.has(t)) {
      this.cache.set(t, {
        key: t,
        data: e
      }), this.moveToFront(t);
      return;
    }
    this.cache.size >= this.maxSize && this.evictLeastRecentlyUsed(), this.cache.set(t, {
      key: t,
      data: e
    }), this.addToFront(t);
  }
  /**
   * Check if tile exists in cache
   */
  has(t) {
    return this.cache.has(t);
  }
  /**
   * Remove tile from cache
   */
  delete(t) {
    return this.cache.has(t) ? (this.cache.delete(t), this.removeFromLRU(t), !0) : !1;
  }
  /**
   * Clear all cached tiles
   */
  clear() {
    this.cache.clear(), this.lruOrder.clear(), this.head = null, this.tail = null;
  }
  /**
   * Get all cached tile keys
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
class y {
  constructor(t = {}) {
    this.config = {
      zoomLevel: t.zoomLevel ?? 12,
      cacheSize: t.cacheSize ?? 100,
      tileUrlTemplate: t.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      timeout: t.timeout ?? 5e3
    }, this.validateConfig(), this.tileFetcher = new M(this.config.timeout), this.tileCache = new I(this.config.cacheSize);
  }
  /**
   * Get elevation at specific coordinates
   */
  async getElevation(t, e) {
    const i = { latitude: t, longitude: e };
    try {
      const r = s.toTileCoordinates(i, this.config.zoomLevel), a = s.getTileKey(r);
      let n = this.tileCache.get(a);
      if (!n) {
        const h = s.getTileUrl(
          r,
          this.config.tileUrlTemplate
        );
        n = await this.tileFetcher.fetchTile(h), this.tileCache.set(a, n);
      }
      const o = s.getTilePixelPosition(i, r);
      return m.getElevationFromImageData(n, o);
    } catch (r) {
      throw r instanceof Error ? new Error(`Failed to get elevation: ${r.message}`) : new Error("Failed to get elevation: Unknown error");
    }
  }
  /**
   * Get interpolated elevation for smoother results
   */
  async getInterpolatedElevation(t, e) {
    const i = { latitude: t, longitude: e };
    try {
      const r = s.toTileCoordinates(i, this.config.zoomLevel), a = s.getTileKey(r);
      let n = this.tileCache.get(a);
      if (!n) {
        const h = s.getTileUrl(
          r,
          this.config.tileUrlTemplate
        );
        n = await this.tileFetcher.fetchTile(h), this.tileCache.set(a, n);
      }
      const o = s.getTilePixelPosition(i, r);
      return m.getInterpolatedElevation(
        n,
        o.x,
        o.y
      );
    } catch (r) {
      throw r instanceof Error ? new Error(`Failed to get interpolated elevation: ${r.message}`) : new Error("Failed to get interpolated elevation: Unknown error");
    }
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
    this.tileCache.clear();
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
}
export {
  y as ElevationProvider
};
//# sourceMappingURL=index.mjs.map
