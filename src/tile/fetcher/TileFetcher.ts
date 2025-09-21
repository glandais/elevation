import { Tile } from '..';

export interface TileFetcher {
    fetchTile(tileUrl: string): Promise<Tile>;
}
