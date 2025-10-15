export type AsyncFn<T, R> = (item: T) => Promise<R>;
export declare class Flux<T> {
    private source;
    private constructor();
    static from<T>(arr: Iterable<T>): Flux<T>;
    mapAsync<R>(fn: AsyncFn<T, R>, maxParallel?: number): Flux<R>;
    countProcessed(): Promise<number>;
}
//# sourceMappingURL=Reactive.d.ts.map