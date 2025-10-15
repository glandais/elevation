import { EARTH_CONSTANTS, MATH_CONSTANTS, ALGORITHM_CONSTANTS } from '../../src/utils/Constants';

describe('Constants', () => {
    describe('EARTH_CONSTANTS', () => {
        it('should have correct WGS84 semi-major axis', () => {
            expect(EARTH_CONSTANTS.SEMI_MAJOR_AXIS).toBe(6378137.0);
        });

        it('should have reasonable mean radius for distance calculations', () => {
            expect(EARTH_CONSTANTS.MEAN_RADIUS).toBe(6371000);
        });

        it('should have correct WGS84 first eccentricity squared', () => {
            expect(EARTH_CONSTANTS.FIRST_ECCENTRICITY_SQUARED).toBeCloseTo(0.00669437999014);
        });

        it('mean radius should be less than semi-major axis', () => {
            expect(EARTH_CONSTANTS.MEAN_RADIUS).toBeLessThan(EARTH_CONSTANTS.SEMI_MAJOR_AXIS);
        });
    });

    describe('MATH_CONSTANTS', () => {
        it('should have correct degrees to radians conversion', () => {
            expect(MATH_CONSTANTS.DEG_TO_RAD).toBeCloseTo(Math.PI / 180);
        });

        it('should have correct radians to degrees conversion', () => {
            expect(MATH_CONSTANTS.RAD_TO_DEG).toBeCloseTo(180 / Math.PI);
        });

        it('should have reciprocal conversion factors', () => {
            expect(MATH_CONSTANTS.DEG_TO_RAD * MATH_CONSTANTS.RAD_TO_DEG).toBeCloseTo(1);
        });
    });

    describe('ALGORITHM_CONSTANTS', () => {
        it('should have correct minimum smoothing points', () => {
            expect(ALGORITHM_CONSTANTS.MIN_SMOOTHING_POINTS).toBe(3);
        });
    });
});
