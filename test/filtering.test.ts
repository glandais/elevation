import { Vector3D } from '../src/utils/Vector3D';
import { EcefConverter, EARTH_CONSTANTS } from '../src/utils/EcefConverter';
import { DouglasPeucker } from '../src/utils/DouglasPeucker';
import { CoordinatesElevation } from '../src/types';

describe('Vector3D', () => {
    test('should calculate distance between two vectors', () => {
        const v1 = new Vector3D(0, 0, 0);
        const v2 = new Vector3D(3, 4, 0);
        expect(v1.distanceTo(v2)).toBe(5);
    });

    test('should calculate dot product', () => {
        const v1 = new Vector3D(1, 2, 3);
        const v2 = new Vector3D(4, 5, 6);
        expect(v1.dot(v2)).toBe(32); // 1*4 + 2*5 + 3*6
    });

    test('should calculate cross product', () => {
        const v1 = new Vector3D(1, 0, 0);
        const v2 = new Vector3D(0, 1, 0);
        const cross = v1.cross(v2);
        expect(cross.x).toBe(0);
        expect(cross.y).toBe(0);
        expect(cross.z).toBe(1);
    });

    test('should calculate magnitude', () => {
        const v = new Vector3D(3, 4, 0);
        expect(v.magnitude()).toBe(5);
    });

    test('should normalize vector', () => {
        const v = new Vector3D(3, 4, 0);
        const normalized = v.normalize();
        expect(normalized.x).toBeCloseTo(0.6);
        expect(normalized.y).toBeCloseTo(0.8);
        expect(normalized.z).toBe(0);
        expect(normalized.magnitude()).toBeCloseTo(1);
    });

    test('should handle zero vector normalization', () => {
        const zeroVector = new Vector3D(0, 0, 0);
        const normalized = zeroVector.normalize();
        expect(normalized.x).toBe(0);
        expect(normalized.y).toBe(0);
        expect(normalized.z).toBe(0);
    });

    test('should calculate distance to line segment', () => {
        const point = new Vector3D(1, 1, 0);
        const segmentStart = new Vector3D(0, 0, 0);
        const segmentEnd = new Vector3D(2, 0, 0);

        const distance = point.distanceToSegment(segmentStart, segmentEnd);
        expect(distance).toBe(1); // Distance from (1,1,0) to line y=0
    });

    test('should handle degenerate segment (zero length)', () => {
        const point = new Vector3D(1, 1, 0);
        const segmentPoint = new Vector3D(0, 0, 0);

        const distance = point.distanceToSegment(segmentPoint, segmentPoint);
        expect(distance).toBeCloseTo(Math.sqrt(2)); // Distance to single point
    });
});

describe('EcefConverter', () => {
    test('should convert coordinates at equator', () => {
        const coord: CoordinatesElevation = {
            latitude: 0,
            longitude: 0,
            elevation: 0,
        };

        const ecef = EcefConverter.toEcef(coord, 1); // No exaggeration

        // At equator, longitude 0, elevation 0, should be on X-axis
        expect(ecef.x).toBeCloseTo(EARTH_CONSTANTS.SEMI_MAJOR_AXIS);
        expect(ecef.y).toBeCloseTo(0);
        expect(ecef.z).toBeCloseTo(0);
    });

    test('should apply elevation exaggeration', () => {
        const coord: CoordinatesElevation = {
            latitude: 0,
            longitude: 0,
            elevation: 100,
        };

        const ecef1 = EcefConverter.toEcef(coord, 1);
        const ecef3 = EcefConverter.toEcef(coord, 3);

        // With 3x exaggeration, should be further from Earth center
        expect(ecef3.x).toBeGreaterThan(ecef1.x);
        expect(ecef3.x).toBeCloseTo(EARTH_CONSTANTS.SEMI_MAJOR_AXIS + 300);
    });

    test('should handle north pole correctly', () => {
        const coord: CoordinatesElevation = {
            latitude: 90,
            longitude: 0,
            elevation: 0,
        };

        const ecef = EcefConverter.toEcef(coord, 1);

        // At north pole, should be on positive Z-axis
        expect(ecef.x).toBeCloseTo(0);
        expect(ecef.y).toBeCloseTo(0);
        expect(ecef.z).toBeGreaterThan(0);
    });

    test('should convert batch of coordinates', () => {
        const coords: CoordinatesElevation[] = [
            { latitude: 0, longitude: 0, elevation: 0 },
            { latitude: 45, longitude: 90, elevation: 100 },
        ];

        const ecefVectors = EcefConverter.convertBatch(coords, 2);

        expect(ecefVectors).toHaveLength(2);
        expect(ecefVectors[0]).toBeInstanceOf(Vector3D);
        expect(ecefVectors[1]).toBeInstanceOf(Vector3D);
    });

    test('should use default zExaggeration when not specified', () => {
        const coord: CoordinatesElevation = {
            latitude: 0,
            longitude: 0,
            elevation: 100,
        };

        const ecefWithDefault = EcefConverter.toEcef(coord);
        const ecefWithExplicit = EcefConverter.toEcef(coord, 3);

        expect(ecefWithDefault.x).toBeCloseTo(ecefWithExplicit.x);
        expect(ecefWithDefault.y).toBeCloseTo(ecefWithExplicit.y);
        expect(ecefWithDefault.z).toBeCloseTo(ecefWithExplicit.z);

        // Test convertBatch with default parameter
        const coords: CoordinatesElevation[] = [coord];
        const batchDefault = EcefConverter.convertBatch(coords);
        const batchExplicit = EcefConverter.convertBatch(coords, 3);

        expect(batchDefault[0].x).toBeCloseTo(batchExplicit[0].x);
        expect(batchDefault[0].y).toBeCloseTo(batchExplicit[0].y);
        expect(batchDefault[0].z).toBeCloseTo(batchExplicit[0].z);
    });
});

describe('DouglasPeucker', () => {
    const createTestPath = (): CoordinatesElevation[] => [
        { latitude: 0, longitude: 0, elevation: 0 },
        { latitude: 0.001, longitude: 0.001, elevation: 50 },
        { latitude: 0.002, longitude: 0.002, elevation: 25 }, // Should be removed with high tolerance
        { latitude: 0.003, longitude: 0.003, elevation: 100 },
    ];

    test('should preserve original path when tolerance is very low', () => {
        const path = createTestPath();
        const simplified = DouglasPeucker.simplify(path, 0.1);

        expect(simplified).toHaveLength(path.length);
        expect(simplified[0]).toEqual(path[0]);
        expect(simplified[simplified.length - 1]).toEqual(path[path.length - 1]);
    });

    test('should simplify path when tolerance is high', () => {
        const path = createTestPath();
        const simplified = DouglasPeucker.simplify(path, 1000); // Very high tolerance

        expect(simplified.length).toBeLessThan(path.length);
        expect(simplified[0]).toEqual(path[0]); // Always preserve first
        expect(simplified[simplified.length - 1]).toEqual(path[path.length - 1]); // Always preserve last
    });

    test('should handle path with less than 3 points', () => {
        const shortPath: CoordinatesElevation[] = [
            { latitude: 0, longitude: 0, elevation: 0 },
            { latitude: 0.001, longitude: 0.001, elevation: 100 },
        ];

        const simplified = DouglasPeucker.simplify(shortPath, 10);
        expect(simplified).toHaveLength(2);
        expect(simplified).toEqual(shortPath);
    });

    test('should calculate reduction percentage correctly', () => {
        const reduction = DouglasPeucker.calculateReduction(100, 25);
        expect(reduction).toBe(75);

        const noReduction = DouglasPeucker.calculateReduction(50, 50);
        expect(noReduction).toBe(0);

        const zeroOriginal = DouglasPeucker.calculateReduction(0, 0);
        expect(zeroOriginal).toBe(0);
    });

    test('should estimate appropriate tolerance', () => {
        const flatPath: CoordinatesElevation[] = [
            { latitude: 0, longitude: 0, elevation: 100 },
            { latitude: 0.001, longitude: 0.001, elevation: 105 },
            { latitude: 0.002, longitude: 0.002, elevation: 110 },
        ];

        const steepPath: CoordinatesElevation[] = [
            { latitude: 0, longitude: 0, elevation: 0 },
            { latitude: 0.001, longitude: 0.001, elevation: 500 },
            { latitude: 0.002, longitude: 0.002, elevation: 1000 },
        ];

        const flatTolerance = DouglasPeucker.estimateTolerance(flatPath);
        const steepTolerance = DouglasPeucker.estimateTolerance(steepPath);

        // Steep paths should get higher tolerance
        expect(steepTolerance).toBeGreaterThan(flatTolerance);

        // Should be within reasonable bounds
        expect(flatTolerance).toBeGreaterThanOrEqual(5);
        expect(steepTolerance).toBeLessThanOrEqual(100);
    });

    test('should handle edge case with identical elevations', () => {
        const flatPath: CoordinatesElevation[] = [
            { latitude: 0, longitude: 0, elevation: 100 },
            { latitude: 0.001, longitude: 0.001, elevation: 100 },
            { latitude: 0.002, longitude: 0.002, elevation: 100 },
        ];

        const tolerance = DouglasPeucker.estimateTolerance(flatPath);
        expect(tolerance).toBe(5); // Should return minimum tolerance

        const simplified = DouglasPeucker.simplify(flatPath, tolerance);
        expect(simplified.length).toBeGreaterThanOrEqual(2); // At least start and end
    });

    test('should work with real-world-like coordinates', () => {
        const mountainPath: CoordinatesElevation[] = [
            { latitude: 46.5197, longitude: 9.8544, elevation: 1650 }, // Zermatt area
            { latitude: 46.52, longitude: 9.8547, elevation: 1680 },
            { latitude: 46.5203, longitude: 9.855, elevation: 1720 },
            { latitude: 46.5206, longitude: 9.8553, elevation: 1750 },
            { latitude: 46.5209, longitude: 9.8556, elevation: 1780 },
        ];

        const simplified = DouglasPeucker.simplify(mountainPath, 20); // 20m tolerance

        expect(simplified.length).toBeGreaterThanOrEqual(2);
        expect(simplified[0]).toEqual(mountainPath[0]);
        expect(simplified[simplified.length - 1]).toEqual(mountainPath[mountainPath.length - 1]);
    });

    test('should handle edge case with 1 or 2 points in estimateTolerance', () => {
        const singlePoint: CoordinatesElevation[] = [
            { latitude: 46.5197, longitude: 9.8544, elevation: 1650 },
        ];

        const twoPoints: CoordinatesElevation[] = [
            { latitude: 46.5197, longitude: 9.8544, elevation: 1650 },
            { latitude: 46.52, longitude: 9.8547, elevation: 1680 },
        ];

        expect(DouglasPeucker.estimateTolerance(singlePoint)).toBe(10);
        expect(DouglasPeucker.estimateTolerance(twoPoints)).toBe(10);
        expect(DouglasPeucker.estimateTolerance([])).toBe(10);
    });
});

describe('Integration Tests', () => {
    test('should work together: ECEF conversion and Douglas-Peucker', () => {
        const testPath: CoordinatesElevation[] = [
            { latitude: 46.5197, longitude: 9.8544, elevation: 1000 },
            { latitude: 46.5198, longitude: 9.8545, elevation: 1001 }, // Very close, should be filtered
            { latitude: 46.5199, longitude: 9.8546, elevation: 1200 }, // Significant elevation change
            { latitude: 46.52, longitude: 9.8547, elevation: 1500 }, // Another significant change
        ];

        // Convert to ECEF
        const ecefVectors = EcefConverter.convertBatch(testPath, 3);
        expect(ecefVectors).toHaveLength(4);

        // Apply filtering
        const simplified = DouglasPeucker.simplify(testPath, 10, 3);

        // Should have removed some intermediate points
        expect(simplified.length).toBeLessThanOrEqual(testPath.length);
        expect(simplified[0]).toEqual(testPath[0]);
        expect(simplified[simplified.length - 1]).toEqual(testPath[testPath.length - 1]);
    });
});
