import { Distance } from '../../src/utils/Distance';
import { Vector3D } from '../../src/utils/Vector3D';

describe('Distance', () => {
    describe('haversine', () => {
        it('should calculate distance between two close points', () => {
            const coord1 = { latitude: 48.8566, longitude: 2.3522 }; // Paris
            const coord2 = { latitude: 48.8606, longitude: 2.3376 }; // Near Paris

            const distance = Distance.haversine(coord1, coord2);

            // Distance should be approximately 1.2km
            expect(distance).toBeGreaterThan(1000);
            expect(distance).toBeLessThan(1500);
        });

        it('should calculate distance between distant points', () => {
            const coord1 = { latitude: 48.8566, longitude: 2.3522 }; // Paris
            const coord2 = { latitude: 51.5074, longitude: -0.1278 }; // London

            const distance = Distance.haversine(coord1, coord2);

            // Distance should be approximately 344km
            expect(distance).toBeGreaterThan(340000);
            expect(distance).toBeLessThan(350000);
        });

        it('should return 0 for same coordinates', () => {
            const coord = { latitude: 48.8566, longitude: 2.3522 };

            const distance = Distance.haversine(coord, coord);

            expect(distance).toBe(0);
        });

        it('should handle coordinates at equator', () => {
            const coord1 = { latitude: 0, longitude: 0 };
            const coord2 = { latitude: 0, longitude: 1 };

            const distance = Distance.haversine(coord1, coord2);

            // 1 degree at equator is approximately 111km
            expect(distance).toBeGreaterThan(110000);
            expect(distance).toBeLessThan(112000);
        });

        it('should handle antipodal points', () => {
            const coord1 = { latitude: 0, longitude: 0 };
            const coord2 = { latitude: 0, longitude: 180 };

            const distance = Distance.haversine(coord1, coord2);

            // Half of Earth's circumference at equator
            expect(distance).toBeGreaterThan(19900000); // ~20,000km
            expect(distance).toBeLessThan(20100000);
        });
    });

    describe('euclidean3D', () => {
        it('should calculate distance between 3D points', () => {
            const point1 = new Vector3D(0, 0, 0);
            const point2 = new Vector3D(3, 4, 0);

            const distance = Distance.euclidean3D(point1, point2);

            expect(distance).toBe(5); // 3-4-5 triangle
        });

        it('should return 0 for same point', () => {
            const point = new Vector3D(1, 2, 3);

            const distance = Distance.euclidean3D(point, point);

            expect(distance).toBe(0);
        });

        it('should handle 3D distances', () => {
            const point1 = new Vector3D(1, 1, 1);
            const point2 = new Vector3D(4, 5, 1);

            const distance = Distance.euclidean3D(point1, point2);

            expect(distance).toBe(5); // sqrt((4-1)² + (5-1)² + (1-1)²) = sqrt(9+16+0) = 5
        });
    });

    describe('pointToSegment3D', () => {
        it('should calculate perpendicular distance to line segment', () => {
            const point = new Vector3D(0, 1, 0);
            const segmentStart = new Vector3D(-1, 0, 0);
            const segmentEnd = new Vector3D(1, 0, 0);

            const distance = Distance.pointToSegment3D(point, segmentStart, segmentEnd);

            expect(distance).toBe(1); // Point is 1 unit above the line
        });

        it('should handle point at segment endpoint', () => {
            const point = new Vector3D(1, 0, 0);
            const segmentStart = new Vector3D(-1, 0, 0);
            const segmentEnd = new Vector3D(1, 0, 0);

            const distance = Distance.pointToSegment3D(point, segmentStart, segmentEnd);

            expect(distance).toBe(0); // Point is on the segment endpoint
        });

        it('should handle zero-length segment', () => {
            const point = new Vector3D(1, 1, 0);
            const segmentStart = new Vector3D(0, 0, 0);
            const segmentEnd = new Vector3D(0, 0, 0);

            const distance = Distance.pointToSegment3D(point, segmentStart, segmentEnd);

            expect(distance).toBeCloseTo(Math.sqrt(2)); // Distance to point (0,0,0)
        });
    });

    describe('cumulativeDistances', () => {
        it('should calculate cumulative distances along path', () => {
            const points = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0001, longitude: 0.0 }, // ~11m
                { latitude: 45.0002, longitude: 0.0 }, // ~11m
                { latitude: 45.0003, longitude: 0.0 }, // ~11m
            ];

            const distances = Distance.cumulativeDistances(points);

            expect(distances).toHaveLength(4);
            expect(distances[0]).toBe(0);
            expect(distances[1]).toBeGreaterThan(10);
            expect(distances[1]).toBeLessThan(12);
            expect(distances[2]).toBeGreaterThan(20);
            expect(distances[2]).toBeLessThan(24);
            expect(distances[3]).toBeGreaterThan(30);
            expect(distances[3]).toBeLessThan(36);
        });

        it('should handle single point', () => {
            const points = [{ latitude: 45.0, longitude: 0.0 }];

            const distances = Distance.cumulativeDistances(points);

            expect(distances).toEqual([0]);
        });

        it('should handle empty array', () => {
            const points: { latitude: number; longitude: number }[] = [];

            const distances = Distance.cumulativeDistances(points);

            expect(distances).toEqual([0]);
        });
    });

    describe('totalPathDistance', () => {
        it('should calculate total distance along path', () => {
            const points = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0001, longitude: 0.0 }, // ~11m
                { latitude: 45.0002, longitude: 0.0 }, // ~11m
            ];

            const totalDistance = Distance.totalPathDistance(points);

            expect(totalDistance).toBeGreaterThan(20);
            expect(totalDistance).toBeLessThan(24);
        });

        it('should return 0 for single point', () => {
            const points = [{ latitude: 45.0, longitude: 0.0 }];

            const totalDistance = Distance.totalPathDistance(points);

            expect(totalDistance).toBe(0);
        });

        it('should return 0 for empty array', () => {
            const points: { latitude: number; longitude: number }[] = [];

            const totalDistance = Distance.totalPathDistance(points);

            expect(totalDistance).toBe(0);
        });
    });
});
