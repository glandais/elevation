import { createCanvas as e, loadImage as t } from "canvas";
//#region \0rolldown/runtime.js
var n = Object.defineProperty, r = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, i = (e, t) => {
	let r = {};
	for (var i in e) n(r, i, {
		get: e[i],
		enumerable: !0
	});
	return t || n(r, Symbol.toStringTag, { value: "Module" }), r;
};
//#endregion
//#region src/calculator/ElevationFunctions.ts
function a(e) {
	return e * Math.PI / 180;
}
function o(e) {
	return e >= -85.0511 && e <= 85.0511;
}
function s(e) {
	return e >= -180 && e <= 180;
}
function c(e) {
	return Number.isInteger(e) && e >= 0 && e <= 15;
}
function l(e, t) {
	let { x: n, y: r } = e, i = e.tile, a = i.x, o = i.y, s = i.z;
	n < 0 && (n += t, --a), n >= t && (n -= t, a += 1), r < 0 && (r += t, --o), r >= t && (r -= t, o += 1);
	let c = 2 ** s - 1;
	return a = Math.max(0, Math.min(c, a)), o = Math.max(0, Math.min(c, o)), {
		tile: {
			z: s,
			x: a,
			y: o
		},
		x: n,
		y: r
	};
}
function u(e, t) {
	if (!o(e.latitude)) throw Error(`Invalid latitude: ${e.latitude}. Must be between -85.0511 and 85.0511`);
	if (!s(e.longitude)) throw Error(`Invalid longitude: ${e.longitude}. Must be between -180 and 180`);
	if (!c(t)) throw Error(`Invalid zoom level: ${t}. Must be between 0 and 15`);
	let n = a(e.latitude), r = 2 ** t, i = (e.longitude + 180) / 360 * r, l = (1 - Math.log(Math.tan(n) + 1 / Math.cos(n)) / Math.PI) / 2 * r, u = Math.floor(i), d = Math.floor(l), f = r - 1;
	return u = Math.max(0, Math.min(f, u)), d = Math.max(0, Math.min(f, d)), {
		x: u,
		y: d,
		xFloat: i,
		yFloat: l,
		z: t
	};
}
function d(e, t) {
	let n = u(e, t);
	return {
		x: n.x,
		y: n.y,
		z: n.z
	};
}
function f(e, t, n) {
	let r = u(e, t), i = Math.floor((r.xFloat - r.x) * n), a = Math.floor((r.yFloat - r.y) * n);
	return {
		tile: {
			z: t,
			x: r.x,
			y: r.y
		},
		x: Math.max(0, Math.min(n - 1, i)),
		y: Math.max(0, Math.min(n - 1, a))
	};
}
//#endregion
//#region src/calculator/ElevationCalculator.ts
var p = class {
	constructor(e, t = 256) {
		this.tileManager = e, this.tileSize = t;
	}
	async getElevation(e, t, n = !0) {
		try {
			if (n) return await this.getInterpolatedElevationInternal(e, t);
			{
				let n = f(e, t, this.tileSize);
				return await this.getElevationFromPixel(n);
			}
		} catch (e) {
			throw e instanceof Error ? Error(`Failed to get elevation: ${e.message}`, { cause: e }) : Error("Failed to get elevation: Unknown error", { cause: e });
		}
	}
	async getInterpolatedElevationInternal(e, t) {
		let n = f(e, t, this.tileSize), r = {
			tile: n.tile,
			x: n.x,
			y: n.y
		}, i = Math.floor(r.x), a = Math.floor(r.y), o = i + 1, s = a + 1, c = r.x - i, u = r.y - a, d = await this.getElevationFromPixel(l({
			tile: r.tile,
			x: i,
			y: a
		}, this.tileSize)), p = await this.getElevationFromPixel(l({
			tile: r.tile,
			x: o,
			y: a
		}, this.tileSize)), m = await this.getElevationFromPixel(l({
			tile: r.tile,
			x: i,
			y: s
		}, this.tileSize)), h = await this.getElevationFromPixel(l({
			tile: r.tile,
			x: o,
			y: s
		}, this.tileSize)), g = d * (1 - c) + p * c, _ = m * (1 - c) + h * c;
		return g * (1 - u) + _ * u;
	}
	async getElevationFromPixel(e) {
		let t = this.tileManager.getTileDirect(e.tile);
		return t ||= await this.tileManager.getTile(e.tile), t.getElevation(e);
	}
};
//#endregion
//#region src/types.ts
function m(e) {
	return {
		...e,
		elevation: e.elevation ?? 0
	};
}
//#endregion
//#region src/utils/Logger.ts
var h, g, _, v, y, b, x = r((() => {
	h = class {
		static {
			this.ERROR = 0;
		}
		static {
			this.WARN = 1;
		}
		static {
			this.INFO = 2;
		}
		static {
			this.DEBUG = 3;
		}
		static {
			this.TRACE = 4;
		}
	}, g = {
		error: h.ERROR,
		warn: h.WARN,
		info: h.INFO,
		debug: h.DEBUG,
		trace: h.TRACE
	}, _ = {
		0: "ERROR",
		1: "WARN",
		2: "INFO",
		3: "DEBUG",
		4: "TRACE"
	}, v = {
		0: console.error,
		1: console.error,
		2: console.log,
		3: console.log,
		4: console.log
	}, y = class {
		constructor(e) {
			this.namespace = e, this.level = g.warn;
		}
		shouldLog(e) {
			return e <= this.level;
		}
		doLog(e, t, ...n) {
			let r = `[${this.namespace}:${_[e]}]`;
			typeof t == "string" ? v[e](`${r} ${t}`, ...n) : v[e](r, t, ...n);
		}
		log(e, t, ...n) {
			this.shouldLog(e) && this.doLog(e, t, ...n);
		}
		trace(e, ...t) {}
		debug(e, ...t) {}
		info(e, ...t) {}
		warn(e, ...t) {
			this.log(h.WARN, e, ...t);
		}
		error(e, ...t) {
			this.log(h.ERROR, e, ...t);
		}
		getTimeLabel(e, t) {
			return `[${this.namespace}:${_[e]}] ${t}`;
		}
		doTime(e, t) {
			console.time(this.getTimeLabel(e, t));
		}
		doTimeEnd(e, t) {
			console.timeEnd(this.getTimeLabel(e, t));
		}
		timeLevel(e, t) {}
		timeEndLevel(e, t) {}
		time(e) {
			this.doTime(h.INFO, e);
		}
		timeEnd(e) {
			this.doTimeEnd(h.INFO, e);
		}
		logDir(e, t, n, r) {
			this.doLog(e, "DIR %s", t), console.dir(n, r);
		}
		dirLevel(e, t, n, r) {}
		dir(e, t, n) {
			this.logDir(h.INFO, e, t, n);
		}
		clear() {
			console.clear();
		}
	}, b = (e) => new y(e);
})), S = r((() => {
	x();
}));
//#endregion
//#region src/utils/Constants.ts
S();
var C = {
	SEMI_MAJOR_AXIS: 6378137,
	MEAN_RADIUS: 6371e3,
	FIRST_ECCENTRICITY_SQUARED: .00669437999014
}, w = {
	DEG_TO_RAD: Math.PI / 180,
	RAD_TO_DEG: 180 / Math.PI
}, T = { MIN_SMOOTHING_POINTS: 3 }, E = class e {
	static haversine(e, t) {
		let n = e.latitude * w.DEG_TO_RAD, r = t.latitude * w.DEG_TO_RAD, i = (t.latitude - e.latitude) * w.DEG_TO_RAD, a = (t.longitude - e.longitude) * w.DEG_TO_RAD, o = Math.sin(i / 2) * Math.sin(i / 2) + Math.cos(n) * Math.cos(r) * Math.sin(a / 2) * Math.sin(a / 2), s = 2 * Math.atan2(Math.sqrt(o), Math.sqrt(1 - o));
		return C.MEAN_RADIUS * s;
	}
	static euclidean3D(e, t) {
		let n = e.x - t.x, r = e.y - t.y, i = e.z - t.z;
		return Math.sqrt(n * n + r * r + i * i);
	}
	static pointToSegment3D(t, n, r) {
		let i = r.subtract(n), a = t.subtract(n), o = i.dot(i);
		if (o === 0) return e.euclidean3D(t, n);
		let s = Math.max(0, Math.min(1, a.dot(i) / o)), c = n.add(i.multiply(s));
		return e.euclidean3D(t, c);
	}
	static cumulativeDistances(t) {
		let n = [0];
		for (let r = 1; r < t.length; r++) {
			let i = e.haversine(t[r - 1], t[r]);
			n.push(n[r - 1] + i);
		}
		return n;
	}
	static totalPathDistance(t) {
		if (t.length < 2) return 0;
		let n = 0;
		for (let r = 1; r < t.length; r++) n += e.haversine(t[r - 1], t[r]);
		return n;
	}
}, D = class e {
	constructor(e, t, n) {
		this.x = e, this.y = t, this.z = n;
	}
	distanceTo(e) {
		let t = this.x - e.x, n = this.y - e.y, r = this.z - e.z;
		return Math.hypot(t, n, r);
	}
	subtract(t) {
		return new e(this.x - t.x, this.y - t.y, this.z - t.z);
	}
	add(t) {
		return new e(this.x + t.x, this.y + t.y, this.z + t.z);
	}
	multiply(t) {
		return new e(this.x * t, this.y * t, this.z * t);
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z;
	}
	cross(t) {
		return new e(this.y * t.z - this.z * t.y, this.z * t.x - this.x * t.z, this.x * t.y - this.y * t.x);
	}
	magnitude() {
		return Math.hypot(this.x, this.y, this.z);
	}
	normalize() {
		let t = this.magnitude();
		return t === 0 ? new e(0, 0, 0) : this.multiply(1 / t);
	}
	distanceToSegment(e, t) {
		let n = t.subtract(e), r = n.magnitude();
		if (r === 0) return this.distanceTo(e);
		let i = this.subtract(e).dot(n) / (r * r), a = Math.max(0, Math.min(1, i)), o = e.add(n.multiply(a));
		return this.distanceTo(o);
	}
}, O = class {
	static toEcef(e, t = 3) {
		let n = e.latitude * Math.PI / 180, r = e.longitude * Math.PI / 180, i = t * (e.elevation || 0), a = Math.sin(n), o = C.SEMI_MAJOR_AXIS / Math.sqrt(1 - C.FIRST_ECCENTRICITY_SQUARED * a * a), s = Math.cos(n), c = Math.cos(r), l = Math.sin(r);
		return new D((o + i) * s * c, (o + i) * s * l, (o * (1 - C.FIRST_ECCENTRICITY_SQUARED) + i) * a);
	}
	static convertBatch(e, t = 3) {
		return e.map((e) => this.toEcef(e, t));
	}
};
//#endregion
//#region src/utils/DouglasPeucker.ts
x();
var k = b("utils/DouglasPeucker"), A = class {
	static simplify(e, t, n = 3) {
		if (k.info("simplify %s", e.length), e.length <= 2) return k.warn("too small"), [...e];
		k.timeLevel(h.INFO, "simplify");
		let r = e.length - 1, i = [];
		i.push(e[0]);
		let a = this.simplifyRecursive(e, 0, r, t, n);
		return i.push(...a), i.push(e[r]), k.timeEndLevel(h.INFO, "simplify"), k.debug("simplified -> %s", i.length), i;
	}
	static simplifyRecursive(e, t, n, r, i) {
		let a = 0, o = -1, s = [], c = O.toEcef(e[t], i), l = O.toEcef(e[n], i);
		for (let r = t + 1; r < n; r++) {
			let t = O.toEcef(e[r], i).distanceToSegment(c, l);
			t > a && (a = t, o = r);
		}
		if (a > r && o !== -1) {
			if (o - t > 1) {
				let n = this.simplifyRecursive(e, t, o, r, i);
				s.push(...n);
			}
			if (s.push(e[o]), n - o > 1) {
				let t = this.simplifyRecursive(e, o, n, r, i);
				s.push(...t);
			}
		}
		return s;
	}
};
//#endregion
//#region src/utils/ElevationSmoother.ts
x();
var j = b("utils/ElevationSmoother"), M = class {
	static smooth(e, t = 50) {
		if (j.debug("smooth %s", e.length), e.length < T.MIN_SMOOTHING_POINTS) return j.debug("too small"), e;
		if (t <= 0) throw Error(`Invalid window size: ${t}. Must be positive`);
		j.timeLevel(h.INFO, "smooth");
		let n = E.cumulativeDistances(e), r = [];
		for (let i = 0; i < e.length; i++) {
			let a = this.computeSmoothedValue(i, e, n, t);
			r.push({
				...e[i],
				elevation: a
			});
		}
		return j.timeEndLevel(h.INFO, "smooth"), r;
	}
	static computeSmoothedValue(e, t, n, r) {
		let i = n[e], a = e;
		for (; a > 0 && i - n[a - 1] <= r;) a--;
		let o = e;
		for (; o < t.length - 1 && n[o + 1] - i <= r;) o++;
		let s = 0, c = 0;
		for (let e = a; e <= o; e++) {
			let a = 1 - Math.abs(n[e] - i) / r;
			s += a, c += t[e].elevation * a;
		}
		return s > 0 ? c / s : t[e].elevation;
	}
}, N = class e {
	static async wrap(e) {
		try {
			return await e, { ok: !0 };
		} catch (e) {
			return {
				ok: !1,
				error: e
			};
		}
	}
	static async getFirst(e) {
		let { idx: t, res: n } = await Promise.race(e.map((e, t) => e.then((e) => ({
			idx: t,
			res: e
		}))));
		if (e.splice(t, 1), !n.ok) throw n.error;
	}
	static async forEach(t, n, r = 1) {
		let i = [];
		for (let a of t) i.push(e.wrap(n(a))), i.length >= r && await e.getFirst(i);
		for (; i.length > 0;) await e.getFirst(i);
	}
}, P = b("calculator/BatchCalculator"), F = class {
	constructor(e) {
		this.elevationCalculator = e;
	}
	async setElevations(e, t, n) {
		P.debug("setElevations");
		let r = {}, i = /* @__PURE__ */ new Map();
		P.timeLevel(h.DEBUG, "points-per-tile");
		let a = (e) => `${e.z}/${e.x}/${e.y}`;
		for (let n of e) {
			let e = d(n, t), o = a(e), s = r[o];
			s || (s = [], r[o] = s, i.set(o, e)), s.push(n);
		}
		let o = Array.from(i.values());
		P.timeEndLevel(h.DEBUG, "points-per-tile"), P.timeLevel(h.DEBUG, "get-elevations"), await N.forEach(o, async (e) => {
			let i = a(e);
			P.timeLevel(h.DEBUG, "get-elevations-" + i);
			let o = r[i];
			for (let e of o) e.elevation = await this.elevationCalculator.getElevation(e, t, n);
			P.timeEndLevel(h.DEBUG, "get-elevations-" + i);
		}, 10), P.timeEndLevel(h.DEBUG, "get-elevations");
	}
	async getElevationsAlong(e, t, n, r, i, a, o) {
		let s = "path-elevations";
		if (P.timeLevel(h.INFO, s), P.info("Path processing started - waypoints: %d, step: %dm, zoom: %d, interpolation: %s", e.length, n, t, i), e.length < 2) throw P.error("Path validation failed - insufficient waypoints: %d", e.length), Error("Path must contain at least 2 coordinates");
		if (n <= 1) throw P.error("Path validation failed - step too small: %dm", n), Error(`Step is too small: ${n} meters`);
		let c = Array.from(this.generateCoordinatesAlong(e, n, r));
		if (P.debug("Generated %d coordinates along path", c.length), P.debug("Fetching elevations for generated coordinates"), await this.setElevations(c, t, i), P.debug("Combined coordinates with elevations - points: %d", c.length), a?.enabled === !0 && c.length >= 3) {
			let e = a.windowSize ?? 50, t = c.length;
			P.debug("Applying elevation smoothing - windowSize: %dm", e);
			let n = "smoothing";
			P.timeLevel(h.DEBUG, n), c = M.smooth(c, e), P.timeEndLevel(h.DEBUG, n), P.debug("Smoothing completed - points: %d → %d", t, c.length);
		} else a?.enabled === !0 && P.debug("Smoothing skipped - insufficient points: %d (minimum: 3)", c.length);
		if (o?.enabled === !0 && c.length > 2) {
			let t = o?.tolerance ?? 10, n = o?.zExaggeration ?? 3, r = c.length;
			P.debug("Applying Douglas-Peucker filtering - tolerance: %d, zExaggeration: %d", t, n);
			let i = "filtering";
			P.timeLevel(h.DEBUG, i);
			let l = A.simplify(c, t, n);
			return P.timeEndLevel(h.DEBUG, i), P.debug("Filtering completed - points: %d → %d (%f % reduction)", r, l.length, ((r - l.length) / r * 100).toFixed(1)), P.timeEndLevel(h.INFO, s), P.info("Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s", e.length, l.length, a?.enabled, o?.enabled), l;
		} else o?.enabled === !0 && P.debug("Filtering skipped - insufficient points: %d (minimum: 3)", c.length);
		return P.timeEndLevel(h.INFO, s), P.info("Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s", e.length, c.length, a?.enabled, o?.enabled), c;
	}
	*generateCoordinatesAlong(e, t, n) {
		if (e.length === 0) {
			P.debug("Path generation skipped - insufficient waypoints: %d", e.length);
			return;
		}
		P.debug("Generating coordinates - waypoints: %d, step: %dm", e.length, t);
		let r = "coordinate-generation";
		P.timeLevel(h.DEBUG, r), yield m(e[0]);
		let i = 1, a = 0;
		for (let r = 0; r < e.length - 1; r++) {
			let o = E.haversine(e[r], e[r + 1]);
			if (o < n) {
				a++, P.debug("Segment %d skipped - distance too short: %.2fm (minimum: %.2fm)", r + 1, o, n);
				continue;
			}
			let s = !0;
			for (let n of this.generateCoordinatesBetween(e[r], e[r + 1], t)) {
				if (s) {
					s = !1;
					continue;
				}
				yield n, i++;
			}
		}
		P.timeEndLevel(h.DEBUG, r), a > 0 ? P.debug("Path generation completed - generated: %d points, skipped segments: %d", i, a) : P.debug("Path generation completed - generated: %d points", i);
	}
	*generateCoordinatesBetween(e, t, n) {
		let r = E.haversine(e, t);
		if (yield m(e), r <= n) {
			yield m(t);
			return;
		}
		let i = Math.floor(r / n), a = t.latitude - e.latitude, o = t.longitude - e.longitude;
		for (let t = 1; t <= i; t++) {
			let i = t * n / r;
			yield {
				latitude: e.latitude + a * i,
				longitude: e.longitude + o * i,
				elevation: 0
			};
		}
		yield m(t);
	}
}, I, L, R = r((() => {
	S(), I = b("tile/cache/ReentrantLock"), L = class {
		constructor(e) {
			this.locks = /* @__PURE__ */ new Map(), this.loadingCount = 0, this.waitQueue = [], this.maxConcurrent = e;
		}
		async acquire(e, t) {
			if (I.debug("%s: Lock acquire requested (active: %d/%d, queued: %d)", e, this.loadingCount, this.maxConcurrent, this.waitQueue.length), this.locks.has(e)) return I.debug("%s: Lock deduplication - already loading, returning existing promise", e), this.locks.get(e);
			if (await this.acquireLoadingSlot(e), this.locks.has(e)) return I.debug("%s: Lock race condition - already loading after slot acquired, releasing slot", e), this.releaseLoadingSlot(e), this.locks.get(e);
			I.debug("%s: Lock creating new promise", e);
			let n = (async () => {
				try {
					I.debug("%s: Promise executing function", e);
					let n = await t();
					return I.debug("%s: Promise resolved successfully", e), n;
				} catch (t) {
					throw I.error("%s: Promise rejected - %o", e, t), t;
				} finally {
					I.debug("%s: Promise cleanup - removing lock and releasing slot", e), this.locks.delete(e), this.releaseLoadingSlot(e);
				}
			})();
			return this.locks.set(e, n), I.debug("%s: Lock registered promise (total locks: %d)", e, this.locks.size), n;
		}
		async acquireLoadingSlot(e) {
			if (this.loadingCount < this.maxConcurrent) {
				this.loadingCount++, I.debug("%s: Semaphore acquired slot immediately (%d/%d active, %d queued)", e, this.loadingCount, this.maxConcurrent, this.waitQueue.length);
				return;
			}
			return I.debug("%s: Semaphore waiting for slot (%d/%d active, %d queued)", e, this.loadingCount, this.maxConcurrent, this.waitQueue.length), I.timeLevel(h.DEBUG, e), new Promise((t) => {
				this.waitQueue.push(() => {
					I.timeEndLevel(h.DEBUG, e), this.loadingCount++, I.debug("%s: Semaphore acquired slot after waiting (%d/%d active, %d queued)", e, this.loadingCount, this.maxConcurrent, this.waitQueue.length), t();
				});
			});
		}
		releaseLoadingSlot(e) {
			if (this.waitQueue.length > 0) {
				I.debug("%s: Semaphore: releasing slot to waiting request (%d/%d active, %d queued)", e, this.loadingCount, this.maxConcurrent, this.waitQueue.length);
				let t = this.waitQueue.shift();
				t && t();
			} else this.loadingCount--, I.debug("%s: Semaphore: released slot (%d/%d active, %d queued)", e, this.loadingCount, this.maxConcurrent, this.waitQueue.length);
		}
	};
})), z, B, V = r((() => {
	S(), R(), z = b("tile/cache/Cache"), B = class {
		constructor(e, t, n, r) {
			if (this.head = null, this.tail = null, e <= 0) throw Error("Cache size must be greater than 0");
			this.maxSize = e, this.keyMapper = t, this.valueBuilder = n, this.cleanupFn = r, this.cache = /* @__PURE__ */ new Map(), this.lruOrder = /* @__PURE__ */ new Map(), this.lock = new L(e);
		}
		getDirect(e) {
			let t = this.keyMapper(e), n = this.cache.get(t);
			if (n) return this.moveToFront(t), n;
		}
		async get(e) {
			let t = this.keyMapper(e), n = this.cache.get(t);
			return n ? (this.moveToFront(t), n) : (z.debug("%s miss", t), this.lock.acquire(t, async () => {
				let n = this.cache.get(t);
				if (n) return z.debug("%s Missed at first but now OK", t), this.moveToFront(t), n;
				z.info("%s loading", t), z.timeLevel(h.INFO, t);
				let r = await this.valueBuilder(e);
				return z.info("%s loaded", t), z.timeEndLevel(h.INFO, t), this.set(t, r), r;
			}));
		}
		clear() {
			if (z.debug("clear"), this.cleanupFn) for (let e of this.cache.values()) this.cleanupFn(e);
			this.cache.clear(), this.lruOrder.clear(), this.head = null, this.tail = null;
		}
		has(e) {
			let t = this.keyMapper(e);
			return this.cache.has(t);
		}
		getKeys() {
			return Array.from(this.cache.keys());
		}
		getLRUKeys(e = 10) {
			let t = [], n = this.tail;
			for (; n && t.length < e;) t.push(n), n = this.lruOrder.get(n)?.prev || null;
			return t;
		}
		set(e, t) {
			this.cache.size >= this.maxSize && this.evictLeastRecentlyUsed(), this.cache.set(e, t), this.addToFront(e);
		}
		delete(e) {
			if (z.debug("%s delete", e), !this.cache.has(e)) return !1;
			let t = this.cache.get(e);
			return this.cache.delete(e), this.removeFromLRU(e), t && this.cleanupFn && this.cleanupFn(t), !0;
		}
		evictLeastRecentlyUsed() {
			if (!this.tail) return;
			let e = this.tail;
			this.delete(e);
		}
		addToFront(e) {
			let t = {
				prev: null,
				next: this.head
			};
			if (this.lruOrder.set(e, t), this.head) {
				let t = this.lruOrder.get(this.head);
				t.prev = e;
			} else this.tail = e;
			this.head = e;
		}
		moveToFront(e) {
			this.head !== e && (this.removeFromLRU(e), this.addToFront(e));
		}
		removeFromLRU(e) {
			let t = this.lruOrder.get(e);
			if (t) {
				if (t.prev) {
					let e = this.lruOrder.get(t.prev);
					e.next = t.next;
				} else this.head = t.next;
				if (t.next) {
					let e = this.lruOrder.get(t.next);
					e.prev = t.prev;
				} else this.tail = t.prev;
				this.lruOrder.delete(e);
			}
		}
	};
})), H = r((() => {
	V();
})), U, W, G = r((() => {
	S(), U = b("tile/fetcher/TileLoader"), W = class {
		constructor(e, t) {
			this.tileUrlTemplate = e, this.tileFetcher = t;
		}
		async loadTile(e) {
			let t = `${e.z}/${e.x}/${e.y}`, n = this.getTileUrl(e), r = `fetch-${t}`;
			U.timeLevel(h.DEBUG, r);
			try {
				let e = await this.tileFetcher.fetchTile(n);
				return U.timeEndLevel(h.DEBUG, r), e;
			} catch (e) {
				throw U.timeEndLevel(h.DEBUG, r), e instanceof Error ? Error(`Failed to fetch tile from ${n}: ${e.message}`, { cause: e }) : Error(`Failed to fetch tile from ${n}: Unknown error`, { cause: e });
			}
		}
		getTileUrl(e) {
			let t = `fetch-${`${e.z}/${e.x}/${e.y}`}`;
			return U.timeLevel(h.DEBUG, t), this.tileUrlTemplate.replace("{z}", e.z.toString()).replace("{x}", e.x.toString()).replace("{y}", e.y.toString());
		}
	};
})), K, q, ee = r((() => {
	S(), K = b("tile/fetcher/CanvasPool"), q = class {
		constructor(e) {
			this.available = [], this.idleSize = 5, this.idleTimeout = 3e4, this.idleTimer = null, this.totalCreated = 0, this.totalAcquired = 0, this.totalReleased = 0, this.builder = e;
		}
		acquire() {
			this.totalAcquired++;
			let e = this.available.pop();
			return e ? K.debug("Canvas acquired from pool (pool size: %d → %d, total acquired: %d)", this.available.length + 1, this.available.length, this.totalAcquired) : (e = this.builder(), this.totalCreated++, K.debug("Canvas created - new canvas (total created: %d, pool size: %d)", this.totalCreated, this.available.length)), this._resetIdleTimer(), e;
		}
		release(e) {
			e ? (this.totalReleased++, this.available.push(e), K.debug("Canvas released to pool (pool size: %d → %d, total released: %d)", this.available.length - 1, this.available.length, this.totalReleased), this._resetIdleTimer()) : K.warn("Canvas release attempted with null/undefined canvas");
		}
		_resetIdleTimer() {
			this.idleTimer ? (clearTimeout(this.idleTimer), K.debug("Idle timer reset - previous timer cleared")) : K.debug("Idle timer started - %d ms until auto-trim", this.idleTimeout), this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
		}
		_trim() {
			let e = this.available.length, t = 0;
			if (e > this.idleSize) {
				for (K.debug("Auto-trim triggered - pool size %d exceeds idle limit %d", e, this.idleSize); this.available.length > this.idleSize;) this.available.pop(), t++;
				K.info("Canvas pool trimmed - removed %d canvases (pool size: %d → %d)", t, e, this.available.length);
			} else K.debug("Auto-trim skipped - pool size %d within idle limit %d", e, this.idleSize);
			this.idleTimer = null;
		}
	};
})), te = r((() => {
	ee();
})), J, ne = r((() => {
	Q(), J = class extends Z {
		constructor(e) {
			super(e.width, e.height), this.data = e;
		}
		close() {}
		getRGBFromImageData(e) {
			return {
				red: this.data.data[e],
				green: this.data.data[e + 1],
				blue: this.data.data[e + 2]
			};
		}
	};
})), re = /* @__PURE__ */ i({ NodeJsTileFetcher: () => Y }), Y, ie = r((() => {
	te(), ne(), Y = class {
		constructor() {
			this.canvasPool = new q(() => e(256, 256));
		}
		async fetchTile(e) {
			let n = await t(e), r = this.canvasPool.acquire();
			try {
				r.width !== n.width && (r.width = n.width), r.height !== n.height && (r.height = n.height);
				let e = r.getContext("2d");
				return e.drawImage(n, 0, 0), new J(e.getImageData(0, 0, n.width, n.height));
			} finally {
				this.canvasPool.release(r);
			}
		}
	};
})), X, ae = r((() => {
	H(), G(), X = class {
		constructor(e, t) {
			this.tileUrlTemplate = e, this.cacheSize = t;
		}
		getTileDirect(e) {
			if (this.cache) return this.cache.getDirect(e);
		}
		async getTile(e) {
			return this.cache ? await this.cache.get(e) : Promise.reject(/* @__PURE__ */ Error("Cache not initialized"));
		}
		async initCache() {
			if (this.cache) return this.cache;
			{
				let e;
				{
					let { NodeJsTileFetcher: t } = await Promise.resolve().then(() => (ie(), re));
					e = new t();
				}
				let t = (e) => e.close(), n = new W(this.tileUrlTemplate, e), r = new B(this.cacheSize, (e) => `${e.z}/${e.x}/${e.y}`, (e) => n.loadTile(e), t);
				return this.cache = r, r;
			}
		}
	};
})), Z, oe = r((() => {
	Z = class {
		constructor(e, t) {
			this.width = e, this.height = t, this.cache = new Float64Array(e * t), this.cache.fill(NaN);
		}
		getElevation(e) {
			if (e.x < 0 || e.x >= this.width) throw Error(`Invalid x position: ${e.x}. Must be between 0 and ${this.width - 1}`);
			if (e.y < 0 || e.y >= this.height) throw Error(`Invalid y position: ${e.y}. Must be between 0 and ${this.height - 1}`);
			let t = (e.y * this.width + e.x) * 4;
			if (isNaN(this.cache[t])) {
				let e = this.getRGBFromImageData(t), n = this.decodeElevation(e);
				return this.cache[t] = n, n;
			} else return this.cache[t];
		}
		decodeElevation(e) {
			let t = e.red * 256 + e.green + e.blue / 256 - 32768;
			return Math.round(t * 100) / 100;
		}
	};
})), Q = r((() => {
	ae(), oe();
}));
Q(), S();
var se = b("ElevationProvider"), $ = class {
	constructor(e = {}) {
		this.config = {
			zoomLevel: e.zoomLevel ?? 12,
			cacheSize: e.cacheSize ?? 100,
			tileUrlTemplate: e.tileUrlTemplate ?? "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp",
			tileSize: e.tileSize ?? 512,
			attribution: e.attribution ?? {
				text: "Mapterhorn elevation data. See mapterhorn.com/attribution/ for details.",
				url: "https://mapterhorn.com/attribution/"
			}
		}, se.dir("Config :", this.config), this.validateConfig(), this.tileManager = new X(this.config.tileUrlTemplate, this.config.cacheSize), this.calculator = new p(this.tileManager, this.config.tileSize), this.batchCalculator = new F(this.calculator);
	}
	getConfig() {
		return { ...this.config };
	}
	getAttribution() {
		return this.config.attribution;
	}
	async getElevation(e, t, n) {
		await this.tileManager.initCache();
		let r = n?.interpolation ?? !0, i = {
			latitude: e,
			longitude: t
		};
		return await this.calculator.getElevation(i, this.config.zoomLevel, r);
	}
	async setElevations(e, t) {
		await this.tileManager.initCache();
		let n = t?.interpolation ?? !0;
		await this.batchCalculator.setElevations(e, this.config.zoomLevel, n);
	}
	async getElevationsAlong(e, t) {
		await this.tileManager.initCache();
		let n = t?.step ?? 10, r = t?.minDistance ?? 1, i = t?.interpolation ?? !0, a = t?.smoothingOptions, o = t?.filterOptions;
		return this.batchCalculator.getElevationsAlong(e, this.config.zoomLevel, n, r, i, a, o);
	}
	validateConfig() {
		let { zoomLevel: e, cacheSize: t } = this.config;
		if (!Number.isInteger(e) || e < 0 || e > 15) throw Error(`Invalid zoom level: ${e}. Must be an integer between 0 and 15`);
		if (!Number.isInteger(t) || t <= 0) throw Error(`Invalid cache size: ${t}. Must be a positive integer`);
		let { tileSize: n } = this.config;
		if (!Number.isInteger(n) || n <= 0 || n & n - 1) throw Error(`Invalid tile size: ${n}. Must be a positive power of 2`);
	}
};
//#endregion
export { $ as ElevationProvider, $ as default, M as ElevationSmoother };

//# sourceMappingURL=index.node.mjs.map