import { Coordinates } from 'src/types';
import { ElevationCalculator } from './ElevationCalculator';

export class BatchCalculator {
    private readonly elevationCalculator: ElevationCalculator;

    constructor(elevationCalculator: ElevationCalculator) {
        this.elevationCalculator = elevationCalculator;
    }

    /**
     * Get elevations for multiple coordinates from an iterator
     * @param coordinates - Iterator of coordinates
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    public async getElevationsFrom(
        coordinates: Iterator<Coordinates>,
        zoomLevel: number,
        interpolation: boolean = true
    ): Promise<number[]> {
        const batchSize = 100;
        const allResults: number[] = [];
        let batch: Promise<number>[] = [];

        let result = coordinates.next();
        while (!result.done) {
            const elevation = this.elevationCalculator.getElevation(
                result.value,
                zoomLevel,
                interpolation
            );
            batch.push(elevation);

            // Process batch when it reaches the batch size
            if (batch.length >= batchSize) {
                const batchResults = await Promise.all(batch);
                allResults.push(...batchResults);
                batch = [];
            }

            result = coordinates.next();
        }

        // Process any remaining items in the last batch
        if (batch.length > 0) {
            const batchResults = await Promise.all(batch);
            allResults.push(...batchResults);
        }

        return allResults;
    }
}
