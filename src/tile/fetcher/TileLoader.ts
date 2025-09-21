import { TileCoordinates } from '../../types';
import { Tile } from '..';
import { TileFetcher } from './TileFetcher';
import { createLogger, Logger, LogLevel } from '../../utils';

const logger: Logger = createLogger('tile/fetcher/TileLoader');

export class TileLoader {
    constructor(
        private tileUrlTemplate: string,
        private tileFetcher: TileFetcher
    ) {}

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public async loadTile(tileCoords: TileCoordinates): Promise<Tile> {
        const tileKey = `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`;
        const tileUrl = this.getTileUrl(tileCoords);

        const fetchTimer = `fetch-${tileKey}`;
        logger.timeLevel(LogLevel.DEBUG, fetchTimer);
        try {
            const tile = await this.tileFetcher.fetchTile(tileUrl);
            logger.timeEndLevel(LogLevel.DEBUG, fetchTimer);
            return tile;
        } catch (error) {
            logger.timeEndLevel(LogLevel.DEBUG, fetchTimer);
            if (error instanceof Error) {
                throw new Error(`Failed to fetch tile from ${tileUrl}: ${error.message}`);
            }
            throw new Error(`Failed to fetch tile from ${tileUrl}: Unknown error`);
        }
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private getTileUrl(tileCoords: TileCoordinates): string {
        const tileKey = `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`;
        const fetchTimer = `fetch-${tileKey}`;
        logger.timeLevel(LogLevel.DEBUG, fetchTimer);
        return this.tileUrlTemplate
            .replace('{z}', tileCoords.z.toString())
            .replace('{x}', tileCoords.x.toString())
            .replace('{y}', tileCoords.y.toString());
    }
}
