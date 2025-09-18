// reactive.ts
export type AsyncFn<T, R> = (item: T) => Promise<R>;

export class Flux<T> {
    private source: AsyncIterable<T>;

    private constructor(source: AsyncIterable<T>) {
        this.source = source;
    }

    static from<T>(arr: Iterable<T>): Flux<T> {
        async function* gen() {
            for (const item of arr) {
                yield item;
            }
        }
        return new Flux(gen());
    }

    mapAsync<R>(fn: AsyncFn<T, R>, maxParallel = 1): Flux<R> {
        const source = this.source;
        async function* gen() {
            const inflight: Promise<R>[] = [];
            for await (const item of source) {
                const p = fn(item);
                inflight.push(p);

                if (inflight.length >= maxParallel) {
                    yield await inflight.shift()!;
                }
            }
            while (inflight.length > 0) {
                yield await inflight.shift()!;
            }
        }
        return new Flux(gen());
    }

    async countProcessed(): Promise<number> {
        let count = 0;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of this.source) {
            count++;
        }
        return count;
    }
}
