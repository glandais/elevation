// reactive.ts
export type AsyncConsumer<T> = (item: T) => Promise<void>;

type Inflight = Promise<{ ok: true } | { ok: false; error: unknown }>;

export class Flux {
    private static async wrap(p: Promise<void>): Inflight {
        try {
            await p;
            return { ok: true as const };
        } catch (e) {
            return { ok: false as const, error: e };
        }
    }

    private static async getFirst(inflight: Inflight[]): Promise<void> {
        const { idx, res } = await Promise.race(
            inflight.map((it, idx) => it.then(res => ({ idx, res })))
        );
        inflight.splice(idx, 1);
        if (res.ok) {
            return;
        } else {
            throw res.error;
        }
    }

    static async forEach<T>(
        from: Iterable<T>,
        fn: AsyncConsumer<T>,
        maxParallel = 1
    ): Promise<void> {
        const inflight: Inflight[] = [];

        for (const item of from) {
            inflight.push(Flux.wrap(fn(item)));

            if (inflight.length >= maxParallel) {
                await Flux.getFirst(inflight);
            }
        }

        while (inflight.length > 0) {
            await Flux.getFirst(inflight);
        }
        return;
    }
}
