export type AsyncConsumer<T> = (item: T) => Promise<void>;
export declare class Flux {
    private static wrap;
    private static getFirst;
    static forEach<T>(from: Iterable<T>, fn: AsyncConsumer<T>, maxParallel?: number): Promise<void>;
}
//# sourceMappingURL=Reactive.d.ts.map