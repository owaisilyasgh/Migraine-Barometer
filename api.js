const API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
// --- CONFIGURATION ---
// Default location (Toronto, CA). User could potentially change this in a future version.
const LATITUDE = 43.7001;
const LONGITUDE = -79.4163;
const TIMEZONE = 'America/New_York';
const PAST_DAYS = 3; // Get more past data for learning module
const FORECAST_DAYS = 5;
// --- END CONFIGURATION ---

const API_DATA_KEY = 'api_pressure_data';
const LAST_FETCH_KEY = 'api_last_fetch_timestamp';
const FETCH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function getPressureData() {
    const now = Date.now();
    const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0');
    const cachedData = localStorage.getItem(API_DATA_KEY);

    if (cachedData && (now - lastFetch < FETCH_INTERVAL_MS)) {
        console.log('Using cached API data.');
        return { data: JSON.parse(cachedData), source: 'cache', lastUpdated: new Date(lastFetch) };
    }

    console.log('Fetching new API data.');
    // Construct the URL. Ensure parameters are URL encoded.
    const params = new URLSearchParams({
        latitude: LATITUDE.toString(),
        longitude: LONGITUDE.toString(),
        hourly: 'surface_pressure',
        models: 'gem_seamless', // As per user's example URL for consistency
        timezone: TIMEZONE,
        past_days: PAST_DAYS.toString(),
        forecast_days: FORECAST_DAYS.toString()
    });
    const apiUrl = `${API_BASE_URL}?${params.toString()}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (!data.hourly || !data.hourly.time || !data.hourly.surface_pressure) {
            throw new Error('API response missing expected hourly data.');
        }
        
        // Add elevation to the data for display
        data.elevation = data.elevation || 'N/A'; // GEM model doesn't always return elevation explicitly with surface_pressure
                                                // For display, might need a different API or fixed value if crucial.
                                                // For now, let's use the coordinates.

        localStorage.setItem(API_DATA_KEY, JSON.stringify(data));
        const currentFetchTime = Date.now();
        localStorage.setItem(LAST_FETCH_KEY, currentFetchTime.toString());
        return { data, source: 'network', lastUpdated: new Date(currentFetchTime) };
    } catch (error) {
        console.error('Error fetching pressure data:', error);
        if (cachedData) {
            console.warn('Falling back to stale cached API data due to fetch error.');
            return { data: JSON.parse(cachedData), source: 'stale-cache', error: error.message, lastUpdated: new Date(lastFetch) };
        }
        return { data: null, source: 'error', error: error.message, lastUpdated: new Date(lastFetch) };
    }
}

function getApiLocationInfo() {
    return {
        latitude: LATITUDE,
        longitude: LONGITUDE,
        timezone: TIMEZONE
    };
}
