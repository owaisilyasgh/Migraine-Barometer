// js/dataService.js
import * as Config from './config.js';
import * as db from './db.js';

/**
 * Fetches pressure data from the live API.
 * @param {number} latitude
 * @param {number} longitude
 * @param {Function} showNotificationCallback - Callback to display notifications.
 * @returns {Promise<Object|null>} The API response JSON or null on error.
 */
async function fetchPressureDataFromAPI(latitude, longitude, showNotificationCallback) {
    const apiUrl = Config.API_URL_TEMPLATE.replace('{LAT}', latitude).replace('{LON}', longitude);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API error! status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (showNotificationCallback) showNotificationCallback("Live pressure data fetched!", "success", 1500);
        return data;
    } catch (error) {
        console.error('Error fetching live data:', error);
        if (showNotificationCallback) showNotificationCallback(`Error fetching live data: ${error.message}.`, "error");
        return null;
    }
}

/**
 * Fetches pressure data from the mock JSON file.
 * @param {Function} showNotificationCallback - Callback to display notifications.
 * @returns {Promise<Object|null>} The mock data JSON or null on error.
 */
async function fetchPressureDataFromMock(showNotificationCallback) {
    try {
        const response = await fetch(Config.MOCK_DATA_PATH);
        if (!response.ok) {
            throw new Error(`Mock data HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (showNotificationCallback) showNotificationCallback("Mock data loaded.", "success", 1000);
        return data;
    } catch (error) {
        console.error('Error fetching mock data:', error);
        if (showNotificationCallback) showNotificationCallback(`Error loading mock data: ${error.message}.`, "error");
        return null;
    }
}

/**
 * Loads pressure data, trying cache, then geolocation/API, then mock as fallback.
 * @param {Function} showNotificationCallback - Callback for displaying UI notifications.
 * @param {boolean} enableGeolocation - Flag to enable/disable geolocation.
 * @returns {Promise<{times: Array<number>, values: Array<number>, sourceInfo: Object}|null>}
 *          Processed data or null if all attempts fail.
 */
export async function loadPressureData(showNotificationCallback, enableGeolocation) {
    let pressureDataJson = null;
    let sourceInfo = { type: 'unknown', fetchTimestamp: Date.now() };

    // 1. Try to load from cache first
    const cachedData = db.loadData(Config.CACHED_PRESSURE_DATA_KEY);
    if (cachedData && cachedData.payload && cachedData.payload.hourly) {
        // Check if cache is stale (e.g., older than 1 hour)
        const cacheAgeMinutes = (Date.now() - (cachedData.sourceInfo?.fetchTimestamp || 0)) / (1000 * 60);
        if (cacheAgeMinutes < Config.CACHE_EXPIRY_MINUTES) {
            pressureDataJson = cachedData.payload;
            sourceInfo = { ...cachedData.sourceInfo, type: `cache (${cachedData.sourceInfo.type})` };
            if (showNotificationCallback) showNotificationCallback("Displaying recently cached pressure data.", "info", 2000);
        } else {
            if (showNotificationCallback) showNotificationCallback("Cached data is old. Fetching fresh data.", "info", 2000);
        }
    }

    // 2. If no fresh cache, attempt to fetch new data
    if (!pressureDataJson) {
        if (Config.USE_MOCK_DATA) {
            if (showNotificationCallback) showNotificationCallback("Using mock data as per configuration.", "info", 2000);
            pressureDataJson = await fetchPressureDataFromMock(showNotificationCallback);
            sourceInfo.type = 'mock-dev-config';
        } else if (enableGeolocation && navigator.geolocation) {
            try {
                if (showNotificationCallback) showNotificationCallback("Attempting geolocation for live data...", "info", 2500);
                const position = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
                );
                sourceInfo.lat = position.coords.latitude;
                sourceInfo.lon = position.coords.longitude;
                sourceInfo.type = 'api-geolocation';
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon, showNotificationCallback);
            } catch (geoError) {
                console.warn('Geolocation failed or denied:', geoError);
                if (showNotificationCallback) showNotificationCallback(`Geolocation failed: ${geoError.message}. Using default coords.`, "warning", 4000);
                sourceInfo.lat = Config.DEFAULT_LATITUDE;
                sourceInfo.lon = Config.DEFAULT_LONGITUDE;
                sourceInfo.type = 'api-default-coords-fallback';
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon, showNotificationCallback);
            }
        } else {
            if (showNotificationCallback) showNotificationCallback("Geolocation N/A or disabled. Using default coords for live data.", "warning", 4000);
            sourceInfo.lat = Config.DEFAULT_LATITUDE;
            sourceInfo.lon = Config.DEFAULT_LONGITUDE;
            sourceInfo.type = 'api-default-coords';
            pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon, showNotificationCallback);
        }

        // Fallback to mock data if API fails
        if (!pressureDataJson) {
            if (showNotificationCallback) showNotificationCallback("Live data failed. Using mock as fallback.", "warning", 3000);
            pressureDataJson = await fetchPressureDataFromMock(showNotificationCallback);
            sourceInfo.type = 'mock-fallback';
        }

        // Cache the newly fetched data (if successful)
        if (pressureDataJson) {
            sourceInfo.fetchTimestamp = Date.now(); // Update timestamp for fresh data
            db.saveData(Config.CACHED_PRESSURE_DATA_KEY, {
                payload: pressureDataJson,
                sourceInfo: sourceInfo
            });
        }
    }


    // 3. Process and return data if available
    if (pressureDataJson && pressureDataJson.hourly && pressureDataJson.hourly.time && pressureDataJson.hourly.surface_pressure) {
        return {
            times: pressureDataJson.hourly.time,
            values: pressureDataJson.hourly.surface_pressure,
            sourceInfo: sourceInfo
        };
    } else if (pressureDataJson) { // Handle case where cached data might be in old raw format without sourceInfo wrapper
        if (showNotificationCallback) showNotificationCallback("Data format issue or incomplete data. Please try clearing cache or refreshing.", "warning");
         console.warn("Loaded pressure data is not in the expected {hourly: {time, surface_pressure}} structure:", pressureDataJson);
        return null;
    }

    if (showNotificationCallback) showNotificationCallback("Failed to load any pressure data. Check console.", "error");
    return null;
}
// filename: js/dataService.js