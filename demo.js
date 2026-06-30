/* eslint-env browser */
/* global L, Chart, gpxParser, FileReader */

// Initialize the map
const map = L.map('map').setView([45.8, 8.6], 7);

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

// GPX Upload elements
const gpxFileInput = document.getElementById('gpx-file-input');
const gpxUploadBtn = document.getElementById('gpx-upload-btn');
const loadSampleBtn = document.getElementById('load-sample-btn');
const gpxStatus = document.getElementById('gpx-status');

// Relief controls
const reliefOffBtn = document.getElementById('relief-off');
const reliefHillshadeBtn = document.getElementById('relief-hillshade');
const reliefSlopeBtn = document.getElementById('relief-slope');

// Smoothing controls
const enableSmoothingCheckbox = document.getElementById('enable-smoothing');
const smoothingWindowSlider = document.getElementById('smoothing-window-slider');
const smoothingWindowInput = document.getElementById('smoothing-window-input');
// Filter controls
const enableFilteringCheckbox = document.getElementById('enable-filtering');
const toleranceSlider = document.getElementById('tolerance-slider');
const toleranceInput = document.getElementById('tolerance-input');
const zExaggerationSlider = document.getElementById('z-exaggeration-slider');
const zExaggerationInput = document.getElementById('z-exaggeration-input');

// State
let currentReliefLayer = null;
let currentMode = 'point'; // 'point' or 'path'
let currentMarker = null;
let pathPoints = [];
let pathPolyline = null;
let pathMarkers = [];
let elevationChart = null;

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

// GPX Upload Functions
function updateGPXStatus(message, type = '') {
    gpxStatus.textContent = message;
    gpxStatus.className = `gpx-status ${type}`;
}

function handleGPXUpload() {
    gpxFileInput.click();
}

// Shared GPX parsing function
function parseGPXContent(gpxContent) {
    const gpx = new gpxParser();
    gpx.parse(gpxContent);

    if (!gpx.tracks || gpx.tracks.length === 0) {
        throw new Error('No tracks found in GPX file');
    }

    // Extract track points from all tracks
    const trackPoints = [];
    gpx.tracks.forEach(track => {
        if (track.points && track.points.length > 0) {
            track.points.forEach(point => {
                trackPoints.push({
                    latitude: point.lat,
                    longitude: point.lon,
                });
            });
        }
    });

    if (trackPoints.length === 0) {
        throw new Error('No track points found in GPX file');
    }

    return trackPoints;
}

async function loadSampleGPX() {
    try {
        updateGPXStatus('Loading sample GPX...', 'loading');

        const response = await fetch('./sample.gpx');
        if (!response.ok) {
            throw new Error(`Failed to fetch sample GPX: ${response.status}`);
        }

        const gpxContent = await response.text();
        updateGPXStatus('Parsing sample GPX...', 'loading');

        const trackPoints = parseGPXContent(gpxContent);

        updateGPXStatus(`Loaded sample GPX with ${trackPoints.length} points`, 'success');
        loadGPXTrack(trackPoints);
    } catch (error) {
        console.error('Sample GPX load error:', error);
        updateGPXStatus(`Error loading sample: ${error.message}`, 'error');
    }
}

function parseGPXFile(file) {
    return new Promise((resolve, reject) => {
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            reject(new Error('Please select a valid GPX file'));
            return;
        }

        updateGPXStatus('Reading GPX file...', 'loading');

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                updateGPXStatus('Parsing GPX data...', 'loading');

                const trackPoints = parseGPXContent(e.target.result);

                updateGPXStatus(`Loaded ${trackPoints.length} points from GPX`, 'success');
                resolve(trackPoints);
            } catch (error) {
                reject(new Error(`Failed to parse GPX file: ${error.message}`));
            }
        };

        reader.onerror = function () {
            reject(new Error('Failed to read GPX file'));
        };

        reader.readAsText(file);
    });
}

function loadGPXTrack(trackPoints) {
    // Switch to path mode
    setMode('path');

    // Clear existing path
    clearPath();

    // Set the new path points
    pathPoints = trackPoints;

    // Create polyline for the track
    pathPolyline = L.polyline(
        pathPoints.map(p => [p.latitude, p.longitude]),
        {
            color: '#2c5aa0',
            weight: 3,
        }
    ).addTo(map);

    // Enable clear button
    clearPathBtn.disabled = false;

    // Fit map to track bounds
    map.fitBounds(pathPolyline.getBounds(), { padding: [20, 20] });

    // Update display
    coordinatesDisplay.textContent = `GPX track with ${pathPoints.length} points`;
    elevationDisplay.textContent = 'Calculating elevation profile...';
    elevationDisplay.className = 'elevation-display loading';

    // Generate elevation profile
    updateElevationProfile();
}

// Relief layer
function setReliefMode(mode) {
    if (currentReliefLayer) {
        map.removeLayer(currentReliefLayer);
        currentReliefLayer = null;
    }

    reliefOffBtn.className = mode === 'off' ? 'primary' : 'secondary';
    reliefHillshadeBtn.className = mode === 'hillshade' ? 'primary' : 'secondary';
    reliefSlopeBtn.className = mode === 'slope' ? 'primary' : 'secondary';

    if (mode === 'hillshade' || mode === 'slope') {
        currentReliefLayer = L.gridLayer
            .relief({
                mode,
                opacity: 0.6,
            })
            .addTo(map);
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

    // Update button states
    clearPathBtn.disabled = true;

    // Clear GPX status
    updateGPXStatus('');

    // Clear display
    if (currentMode === 'path') {
        elevationDisplay.textContent = 'Click on the map to start creating a path';
        coordinatesDisplay.textContent = 'Path coordinates will appear here';
    }
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function updateElevationProfile() {
    if (!pathPoints || pathPoints.length < 2) {
        return;
    }

    try {
        elevationDisplay.textContent = 'Updating elevation profile...';
        elevationDisplay.className = 'elevation-display loading';

        const smoothingOptions = getSmoothingOptions();
        const filterOptions = getFilterOptions();

        const elevationProfile = await elevationProvider.getElevationsAlong(pathPoints, {
            step: 25,
            interpolation: true,
            smoothingOptions: smoothingOptions.enabled ? smoothingOptions : undefined,
            filterOptions: filterOptions.enabled ? filterOptions : undefined,
        });

        elevationDisplay.textContent = `Elevation profile: ${elevationProfile.length} points`;
        elevationDisplay.className = 'elevation-display success';

        // Create chart with processed data
        createElevationChart(elevationProfile);
    } catch (error) {
        console.error('Error updating elevation profile:', error);
        elevationDisplay.textContent = `Error: ${error.message}`;
        elevationDisplay.className = 'elevation-display error';
    }
}

// Debounced version for slider interactions (300ms delay)
const debouncedUpdateElevationProfile = debounce(updateElevationProfile, 300);

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
            animation: false,
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
            await updateElevationProfile();
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
reliefOffBtn.addEventListener('click', () => setReliefMode('off'));
reliefHillshadeBtn.addEventListener('click', () => setReliefMode('hillshade'));
reliefSlopeBtn.addEventListener('click', () => setReliefMode('slope'));

pointModeBtn.addEventListener('click', () => setMode('point'));
pathModeBtn.addEventListener('click', () => setMode('path'));
clearPathBtn.addEventListener('click', clearPath);

// GPX Upload event listeners
gpxUploadBtn.addEventListener('click', handleGPXUpload);
loadSampleBtn.addEventListener('click', loadSampleGPX);
gpxFileInput.addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    try {
        const trackPoints = await parseGPXFile(file);
        loadGPXTrack(trackPoints);
    } catch (error) {
        console.error('GPX upload error:', error);
        updateGPXStatus(error.message, 'error');
    }

    // Reset file input
    gpxFileInput.value = '';
});

// Processing control event listeners (immediate updates for checkboxes)
enableSmoothingCheckbox.addEventListener('change', updateElevationProfile);
enableFilteringCheckbox.addEventListener('change', updateElevationProfile);

// Smoothing control event listeners (debounced for sliders/inputs)
smoothingWindowSlider.addEventListener('input', () => {
    syncInputAndSlider(smoothingWindowInput, smoothingWindowSlider);
    debouncedUpdateElevationProfile();
});
smoothingWindowInput.addEventListener('input', () => {
    syncSliderAndInput(smoothingWindowSlider, smoothingWindowInput);
    debouncedUpdateElevationProfile();
});

// Filtering control event listeners (debounced for sliders/inputs)
toleranceSlider.addEventListener('input', () => {
    syncInputAndSlider(toleranceInput, toleranceSlider);
    debouncedUpdateElevationProfile();
});
toleranceInput.addEventListener('input', () => {
    syncSliderAndInput(toleranceSlider, toleranceInput);
    debouncedUpdateElevationProfile();
});

zExaggerationSlider.addEventListener('input', () => {
    syncInputAndSlider(zExaggerationInput, zExaggerationSlider);
    debouncedUpdateElevationProfile();
});
zExaggerationInput.addEventListener('input', () => {
    syncSliderAndInput(zExaggerationSlider, zExaggerationInput);
    debouncedUpdateElevationProfile();
});

// Map click handler
map.on('click', function (e) {
    if (currentMode === 'point') {
        handlePointClick(e);
    } else {
        handlePathClick(e);
    }
});

// Initialize
setMode('path');
setReliefMode('hillshade');
