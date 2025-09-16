/* eslint-env browser */
/* global L, Chart, alert */

// Initialize the map
const map = L.map('map').setView([47.2, -1.5], 12); // France (Nantes area)

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
}).addTo(map);

// Initialize elevation provider
const elevationProvider = new window.Elevation.ElevationProvider();

// Elements
const elevationDisplay = document.getElementById('elevation-display');
const coordinatesDisplay = document.getElementById('coordinates');
const chartContainer = document.getElementById('chart-container');
const elevationStats = document.getElementById('elevation-stats');
const modeInfo = document.getElementById('mode-info');

// Buttons
const pointModeBtn = document.getElementById('point-mode');
const pathModeBtn = document.getElementById('path-mode');
const clearPathBtn = document.getElementById('clear-path');

// Smoothing controls
const enableSmoothingCheckbox = document.getElementById('enable-smoothing');
const smoothingWindowSlider = document.getElementById('smoothing-window-slider');
const smoothingWindowInput = document.getElementById('smoothing-window-input');
const smoothingStats = document.getElementById('smoothing-stats');

// Filter controls
const enableFilteringCheckbox = document.getElementById('enable-filtering');
const toleranceSlider = document.getElementById('tolerance-slider');
const toleranceInput = document.getElementById('tolerance-input');
const zExaggerationSlider = document.getElementById('z-exaggeration-slider');
const zExaggerationInput = document.getElementById('z-exaggeration-input');
const smartToleranceBtn = document.getElementById('smart-tolerance');
const applyProcessingBtn = document.getElementById('apply-processing');
const filterStats = document.getElementById('filter-stats');

// State
let currentMode = 'point'; // 'point' or 'path'
let currentMarker = null;
let pathPoints = [];
let pathPolyline = null;
let pathMarkers = [];
let elevationChart = null;
let originalElevationProfile = null;

// Utility functions
function formatElevation(elevation) {
    if (elevation === null || elevation === undefined) {
        return 'No data available';
    }
    return `${Math.round(elevation)} m`;
}

function formatCoordinates(lat, lng) {
    return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
}

function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
}

// Filter control functions
function syncSliderAndInput(slider, input) {
    slider.value = input.value;
}

function syncInputAndSlider(input, slider) {
    input.value = slider.value;
}

function updateProcessingStats(original, smoothed, filtered) {
    if (smoothed && enableSmoothingCheckbox.checked) {
        // Calculate variance to show smoothing effect
        const originalVariance = calculateVariance(original.map(p => p.elevation));
        const smoothedVariance = calculateVariance(smoothed.map(p => p.elevation));
        const varianceReduction = (
            ((originalVariance - smoothedVariance) / originalVariance) *
            100
        ).toFixed(1);

        smoothingStats.innerHTML = `
            <strong>Smoothing Results:</strong>
            Variance reduced by ${varianceReduction}% (${originalVariance.toFixed(1)} → ${smoothedVariance.toFixed(1)})
        `;
        smoothingStats.style.display = 'block';
    } else {
        smoothingStats.style.display = 'none';
    }

    if (filtered && enableFilteringCheckbox.checked) {
        const sourceData = smoothed || original;
        const reduction = (
            ((sourceData.length - filtered.length) / sourceData.length) *
            100
        ).toFixed(1);
        filterStats.innerHTML = `
            <strong>Filtering Results:</strong>
            ${sourceData.length} → ${filtered.length} points (${reduction}% reduction)
        `;
        filterStats.style.display = 'block';
    } else {
        filterStats.style.display = 'none';
    }
}

function calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function getSmoothingOptions() {
    return {
        enabled: enableSmoothingCheckbox.checked,
        windowSize: parseFloat(smoothingWindowInput.value),
    };
}

function getFilterOptions() {
    return {
        enabled: enableFilteringCheckbox.checked,
        tolerance: parseFloat(toleranceInput.value),
        zExaggeration: parseFloat(zExaggerationInput.value),
    };
}

async function applySmartTolerance() {
    if (!originalElevationProfile || originalElevationProfile.length < 3) {
        alert('Please create a path with 2+ points first');
        return;
    }

    try {
        const estimatedTolerance =
            window.Elevation.DouglasPeucker.estimateTolerance(originalElevationProfile);
        toleranceSlider.value = estimatedTolerance;
        toleranceInput.value = estimatedTolerance;

        // Auto-apply processing if enabled
        if (enableFilteringCheckbox.checked || enableSmoothingCheckbox.checked) {
            await applyProcessing();
        }
    } catch (error) {
        console.error('Error estimating tolerance:', error);
        alert('Error estimating tolerance: ' + error.message);
    }
}

async function applyProcessing() {
    if (!originalElevationProfile || originalElevationProfile.length < 3) {
        return;
    }

    try {
        const smoothingOptions = getSmoothingOptions();
        const filterOptions = getFilterOptions();
        let processedData = originalElevationProfile;
        let smoothedData = null;

        // Apply both smoothing and filtering in one call if enabled
        if (smoothingOptions.enabled || filterOptions.enabled) {
            processedData = await elevationProvider.getElevationsAlong(pathPoints, {
                step: 25,
                interpolation: true,
                smoothingOptions: smoothingOptions.enabled ? smoothingOptions : undefined,
                filterOptions: filterOptions.enabled ? filterOptions : undefined,
            });

            // For stats display, we need to show the intermediate smoothed data
            if (smoothingOptions.enabled) {
                smoothedData = await elevationProvider.getElevationsAlong(pathPoints, {
                    step: 25,
                    interpolation: true,
                    smoothingOptions,
                });
            }
        }

        createElevationChart(processedData);
        updateProcessingStats(
            originalElevationProfile,
            smoothedData,
            filterOptions.enabled ? processedData : null
        );
    } catch (error) {
        console.error('Error applying processing:', error);
        elevationDisplay.textContent = `Processing error: ${error.message}`;
        elevationDisplay.className = 'elevation-display error';
    }
}

// Mode switching
function setMode(mode) {
    currentMode = mode;

    if (mode === 'point') {
        pointModeBtn.className = 'primary';
        pathModeBtn.className = 'secondary';
        modeInfo.textContent = 'Point Mode: Click anywhere to get elevation at that location';
        clearPath();
    } else {
        pointModeBtn.className = 'secondary';
        pathModeBtn.className = 'primary';
        modeInfo.textContent =
            'Path Mode: Click to add points to path, chart will show when you have 2+ points';
    }
}

// Clear path
function clearPath() {
    pathPoints = [];
    originalElevationProfile = null;

    // Remove polyline
    if (pathPolyline) {
        map.removeLayer(pathPolyline);
        pathPolyline = null;
    }

    // Remove markers
    pathMarkers.forEach(marker => map.removeLayer(marker));
    pathMarkers = [];

    // Hide chart
    chartContainer.classList.remove('visible');

    // Hide processing stats
    filterStats.style.display = 'none';
    smoothingStats.style.display = 'none';

    // Update button states
    clearPathBtn.disabled = true;
    applyProcessingBtn.disabled = true;
    smartToleranceBtn.disabled = true;

    // Clear display
    if (currentMode === 'path') {
        elevationDisplay.textContent = 'Click on the map to start creating a path';
        coordinatesDisplay.textContent = 'Path coordinates will appear here';
    }
}

// Calculate elevation profile statistics
function calculateStats(elevationProfile) {
    const elevations = elevationProfile.map(p => p.elevation);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const totalDistance = elevationProfile.reduce((total, point, index) => {
        if (index === 0) {
            return 0;
        }
        const prev = elevationProfile[index - 1];
        const dlat = point.latitude - prev.latitude;
        const dlng = point.longitude - prev.longitude;
        const distance = Math.sqrt(dlat * dlat + dlng * dlng) * 111000; // Rough conversion
        return total + distance;
    }, 0);

    // Calculate total ascent/descent
    let totalAscent = 0;
    let totalDescent = 0;
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) {
            totalAscent += diff;
        } else {
            totalDescent += Math.abs(diff);
        }
    }

    return {
        minElevation,
        maxElevation,
        elevationGain: maxElevation - minElevation,
        totalDistance,
        totalAscent,
        totalDescent,
        pointCount: elevations.length,
    };
}

// Create elevation chart
function createElevationChart(elevationProfile) {
    const ctx = document.getElementById('elevation-chart').getContext('2d');

    // Destroy existing chart
    if (elevationChart) {
        elevationChart.destroy();
    }

    // Calculate distances for x-axis
    let cumulativeDistance = 0;
    const chartData = elevationProfile.map((point, index) => {
        if (index > 0) {
            const prev = elevationProfile[index - 1];
            const dlat = point.latitude - prev.latitude;
            const dlng = point.longitude - prev.longitude;
            const distance = Math.sqrt(dlat * dlat + dlng * dlng) * 111000; // Rough conversion
            cumulativeDistance += distance;
        }
        return {
            x: cumulativeDistance,
            y: point.elevation,
        };
    });

    elevationChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Elevation (m)',
                    data: chartData,
                    borderColor: '#2c5aa0',
                    backgroundColor: 'rgba(44, 90, 160, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Distance (m)',
                    },
                    ticks: {
                        callback: function (value) {
                            return formatDistance(value);
                        },
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Elevation (m)',
                    },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Elevation: ${Math.round(context.parsed.y)}m at ${formatDistance(context.parsed.x)}`;
                        },
                    },
                },
            },
        },
    });

    // Calculate and display stats
    const stats = calculateStats(elevationProfile);
    elevationStats.innerHTML = `
        <div class="stat">
            <div class="stat-value">${formatDistance(stats.totalDistance)}</div>
            <div class="stat-label">Total Distance</div>
        </div>
        <div class="stat">
            <div class="stat-value">${stats.pointCount}</div>
            <div class="stat-label">Data Points</div>
        </div>
        <div class="stat">
            <div class="stat-value">${formatElevation(stats.minElevation)}</div>
            <div class="stat-label">Min Elevation</div>
        </div>
        <div class="stat">
            <div class="stat-value">${formatElevation(stats.maxElevation)}</div>
            <div class="stat-label">Max Elevation</div>
        </div>
        <div class="stat">
            <div class="stat-value">${formatElevation(stats.totalAscent)}</div>
            <div class="stat-label">Total Ascent</div>
        </div>
        <div class="stat">
            <div class="stat-value">${formatElevation(stats.totalDescent)}</div>
            <div class="stat-label">Total Descent</div>
        </div>
    `;

    chartContainer.classList.add('visible');
}

// Handle point mode click
async function handlePointClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Remove previous marker
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    // Add new marker
    currentMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup('Getting elevation...', { autoClose: false })
        .openPopup();

    // Update display
    coordinatesDisplay.textContent = formatCoordinates(lat, lng);
    elevationDisplay.textContent = 'Loading elevation data...';
    elevationDisplay.className = 'elevation-display loading';

    try {
        const elevation = await elevationProvider.getElevation(lat, lng);
        elevationDisplay.textContent = `Elevation: ${formatElevation(elevation)}`;
        elevationDisplay.className = 'elevation-display success';
        currentMarker.setPopupContent(`
            <strong>Elevation: ${formatElevation(elevation)}</strong><br>
            ${formatCoordinates(lat, lng)}
        `);
    } catch (error) {
        console.error('Error getting elevation:', error);
        elevationDisplay.textContent = `Error: ${error.message}`;
        elevationDisplay.className = 'elevation-display error';
        currentMarker.setPopupContent(`
            <strong>Error getting elevation</strong><br>
            ${formatCoordinates(lat, lng)}
        `);
    }
}

// Handle path mode click
async function handlePathClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Add point to path
    pathPoints.push({ latitude: lat, longitude: lng });

    // Add marker
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Point ${pathPoints.length}: Getting elevation...`, { autoClose: false });
    pathMarkers.push(marker);

    // Update polyline
    if (pathPolyline) {
        map.removeLayer(pathPolyline);
    }
    pathPolyline = L.polyline(
        pathPoints.map(p => [p.latitude, p.longitude]),
        {
            color: '#2c5aa0',
            weight: 3,
        }
    ).addTo(map);

    // Enable clear button
    clearPathBtn.disabled = false;

    // Update display
    coordinatesDisplay.textContent = `Path with ${pathPoints.length} points`;
    elevationDisplay.textContent = 'Calculating elevation profile...';
    elevationDisplay.className = 'elevation-display loading';

    try {
        // Get elevation for this point
        const elevation = await elevationProvider.getElevation(lat, lng);
        marker.setPopupContent(`
            <strong>Point ${pathPoints.length}</strong><br>
            Elevation: ${formatElevation(elevation)}<br>
            ${formatCoordinates(lat, lng)}
        `);

        // If we have 2+ points, generate elevation profile
        if (pathPoints.length >= 2) {
            const elevationProfile = await elevationProvider.getElevationsAlong(pathPoints, {
                step: 25,
                interpolation: true,
            });

            // Store original profile for filtering
            originalElevationProfile = elevationProfile;

            // Enable processing controls
            applyProcessingBtn.disabled = false;
            smartToleranceBtn.disabled = false;

            elevationDisplay.textContent = `Elevation profile: ${elevationProfile.length} points`;
            elevationDisplay.className = 'elevation-display success';

            // Create chart (will be processed if smoothing/filtering is enabled)
            await applyProcessing();
        } else {
            elevationDisplay.textContent = `Point ${pathPoints.length} added - add more points to see elevation profile`;
            elevationDisplay.className = 'elevation-display success';
        }
    } catch (error) {
        console.error('Error getting elevation:', error);
        elevationDisplay.textContent = `Error: ${error.message}`;
        elevationDisplay.className = 'elevation-display error';
        marker.setPopupContent(`
            <strong>Point ${pathPoints.length} - Error</strong><br>
            ${formatCoordinates(lat, lng)}
        `);
    }
}

// Event listeners
pointModeBtn.addEventListener('click', () => setMode('point'));
pathModeBtn.addEventListener('click', () => setMode('path'));
clearPathBtn.addEventListener('click', clearPath);

// Processing control event listeners
enableSmoothingCheckbox.addEventListener('change', applyProcessing);
enableFilteringCheckbox.addEventListener('change', applyProcessing);

// Smoothing control event listeners
smoothingWindowSlider.addEventListener('input', () => {
    syncInputAndSlider(smoothingWindowInput, smoothingWindowSlider);
    if (enableSmoothingCheckbox.checked) {
        applyProcessing();
    }
});
smoothingWindowInput.addEventListener('input', () => {
    syncSliderAndInput(smoothingWindowSlider, smoothingWindowInput);
    if (enableSmoothingCheckbox.checked) {
        applyProcessing();
    }
});

// Filtering control event listeners
toleranceSlider.addEventListener('input', () => {
    syncInputAndSlider(toleranceInput, toleranceSlider);
    if (enableFilteringCheckbox.checked) {
        applyProcessing();
    }
});
toleranceInput.addEventListener('input', () => {
    syncSliderAndInput(toleranceSlider, toleranceInput);
    if (enableFilteringCheckbox.checked) {
        applyProcessing();
    }
});

zExaggerationSlider.addEventListener('input', () => {
    syncInputAndSlider(zExaggerationInput, zExaggerationSlider);
    if (enableFilteringCheckbox.checked) {
        applyProcessing();
    }
});
zExaggerationInput.addEventListener('input', () => {
    syncSliderAndInput(zExaggerationSlider, zExaggerationInput);
    if (enableFilteringCheckbox.checked) {
        applyProcessing();
    }
});

smartToleranceBtn.addEventListener('click', applySmartTolerance);
applyProcessingBtn.addEventListener('click', applyProcessing);

// Map click handler
map.on('click', function (e) {
    if (currentMode === 'point') {
        handlePointClick(e);
    } else {
        handlePathClick(e);
    }
});

// Initialize
setMode('point');
console.log('Elevation Library Demo loaded');
console.log('ElevationProvider available:', typeof elevationProvider);
console.log('Available methods:', {
    getElevationsAlong: typeof elevationProvider.getElevationsAlong,
});
