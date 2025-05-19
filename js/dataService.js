// js/dataService.js
import * as G_CONFIG from './config.js';
import * as db from './db.js';
import { formatUnixTimestamp } from './utils.js'; // Assuming this is where it's defined

let UIRenderer; // To be set by app.js if direct use is needed, currently passing showNotificationCallback

/**
 * Fetches pressure data from the live API.
 * @param {number} latitude
 * @param {number} longitude
 * @param {Function} showNotificationCallback - Callback to display notifications.
 * @returns {Promise<Object|null>} The API response JSON or null on error.
 */
async function fetchPressureDataFromAPI(latitude, longitude, showNotificationCallback) {
    const apiUrl = G_CONFIG.API_URL_TEMPLATE.replace('{LAT}', latitude).replace('{LON}', longitude);
    if (G_CONFIG.DEBUG_MODE) console.log('DataService: Fetching live data from API:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API error! status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (showNotificationCallback) showNotificationCallback("Live pressure data fetched!", "success", 2000);
        db.saveData(G_CONFIG.LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY, Date.now());
        if (G_CONFIG.DEBUG_MODE) console.log('DataService: API fetch successful, updated LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY.');
        return data;
    } catch (error) {
        if (G_CONFIG.DEBUG_MODE) console.error('DataService: Error fetching live data:', error);
        if (showNotificationCallback) showNotificationCallback(`Error fetching live data: ${error.message}.`, "error");
        return null;
    }
}

/**
 * Processes raw API data into the structure expected by the app.
 * @param {Object} rawData - The raw JSON data from API.
 * @param {Object} sourceInfo - Existing sourceInfo object to augment.
 * @returns {{times: Array<number>, values: Array<number>, sourceInfo: Object}|null}
 */
function processRawData(rawData, sourceInfo) {
    if (!rawData || !rawData.hourly || !rawData.hourly.time || !rawData.hourly.surface_pressure) {
        if (G_CONFIG.DEBUG_MODE) console.warn("DataService: Raw data is not in the expected {hourly: {time, surface_pressure}} structure:", rawData);
        return null;
    }
    // Augment sourceInfo
    sourceInfo.fetchTimestamp = Date.now();
    sourceInfo.lastDataPointTimestamp = rawData.hourly.time[rawData.hourly.time.length - 1] * 1000; // ms

    if (G_CONFIG.DEBUG_MODE) console.log("DataService: Raw data processed. Last data point:", new Date(sourceInfo.lastDataPointTimestamp).toLocaleString());

    return {
        times: rawData.hourly.time, // Keep as seconds for compatibility
        values: rawData.hourly.surface_pressure,
        sourceInfo: sourceInfo
    };
}


/**
 * Loads pressure data with caching, API throttling, and stale checks.
 * @param {Function} showNotificationCallback - Callback for UI notifications.
 * @param {boolean} isManualRefresh - True if triggered by user action.
 * @returns {Promise<{times: Array<number>, values: Array<number>, sourceInfo: Object, status: string, message?: string }|null>}
 */
export async function loadPressureData(showNotificationCallback, isManualRefresh = false) {
    if (G_CONFIG.DEBUG_MODE) console.log(`DataService: loadPressureData. ManualRefresh: ${isManualRefresh}, GeolocationEnabled: ${G_CONFIG.ENABLE_GEOLOCATION}`);

    const cachedData = db.loadData(G_CONFIG.CACHED_PRESSURE_DATA_KEY);
    let sourceInfo = {}; // Will be populated based on cache, API, or defaults

    if (cachedData && cachedData.times && cachedData.values && cachedData.sourceInfo) {
        sourceInfo = { ...cachedData.sourceInfo }; // Load sourceInfo from cache
        if (G_CONFIG.DEBUG_MODE) console.log("DataService: Found cached data. Last data point in cache:", new Date(sourceInfo.lastDataPointTimestamp).toLocaleString());

        const dataPointAgeMs = Date.now() - sourceInfo.lastDataPointTimestamp;
        const dataPointAgeMinutes = dataPointAgeMs / (1000 * 60);

        // Cache is considered "fresh enough" for display if data points are not too old.
        // And if not a manual refresh, and cache entry itself (fetch time) is relatively recent.
        const cacheAgeMinutesForAutoRefresh = (Date.now() - (sourceInfo.fetchTimestamp || 0)) / (1000 * 60);

        if (!isManualRefresh &&
            dataPointAgeMinutes < G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY &&
            cacheAgeMinutesForAutoRefresh < G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_API_REFRESH_CHECK) {
            if (G_CONFIG.DEBUG_MODE) console.log(`DataService: Cached data is FRESH. Age: ${dataPointAgeMinutes.toFixed(0)} mins. Returning cached.`);
            if (showNotificationCallback && !isManualRefresh) showNotificationCallback("Displaying recently cached pressure data.", "info", 2000);
            return { ...cachedData, status: 'fresh', message: `Displaying cached data, updated ${formatUnixTimestamp(sourceInfo.lastDataPointTimestamp/1000).timeString}.` };
        }
        if (G_CONFIG.DEBUG_MODE && !isManualRefresh) console.log(`DataService: Cached data is STALE (dataPointAge: ${dataPointAgeMinutes.toFixed(0)}m, cacheAgeForRefresh: ${cacheAgeMinutesForAutoRefresh.toFixed(0)}m) or MANUAL REFRESH. Will attempt API fetch.`);
    } else {
        if (G_CONFIG.DEBUG_MODE) console.log("DataService: No valid cached data found or structure mismatch. Must fetch from API.");
    }

    // API Fetch Logic
    const lastApiFetchMs = db.loadData(G_CONFIG.LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY) || 0;
    const timeSinceLastApiFetchMs = Date.now() - lastApiFetchMs;

    if (!isManualRefresh && timeSinceLastApiFetchMs < G_CONFIG.API_CALL_INTERVAL_MS) {
        const remainingCooldownMinutes = Math.round((G_CONFIG.API_CALL_INTERVAL_MS - timeSinceLastApiFetchMs) / (1000 * 60));
        const message = `API call on cooldown. ${remainingCooldownMinutes} mins remaining.`;
        if (G_CONFIG.DEBUG_MODE) console.log(`DataService: API call SKIPPED. Cooldown. ${message}`);

        if (cachedData) { // Return stale cached data if API is on cooldown
            if (showNotificationCallback) showNotificationCallback(message + " Displaying cached data.", "info", 4000);
            const dataPointAgeMs = Date.now() - cachedData.sourceInfo.lastDataPointTimestamp;
            const status = (dataPointAgeMs / (1000 * 60)) > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY ? 'stale_api_cooldown' : 'fresh_api_cooldown'; // more specific status
            return { ...cachedData, status: status, message: `Data last updated ${formatUnixTimestamp(cachedData.sourceInfo.lastDataPointTimestamp/1000).timeString}. API on cooldown.` };
        } else {
            if (showNotificationCallback) showNotificationCallback("No cached data available and API is on cooldown. Try again later.", "warning", 5000);
            return { times: [], values: [], sourceInfo: { lat: G_CONFIG.DEFAULT_LATITUDE, lon: G_CONFIG.DEFAULT_LONGITUDE, source: 'error_cooldown_no_cache' }, status: 'error_api_cooldown_no_cache', message: 'API on cooldown, no cache. Try later.' };
        }
    }
    if (G_CONFIG.DEBUG_MODE) console.log("DataService: API call PERMITTED. Cooldown passed or manual refresh.");

    // --- Geolocation Handling with Cache ---
    let latitude = G_CONFIG.DEFAULT_LATITUDE;
    let longitude = G_CONFIG.DEFAULT_LONGITUDE;
    sourceInfo.lat = latitude;
    sourceInfo.lon = longitude;
    sourceInfo.source = 'default_coordinates_api'; // Base if nothing else overrides

    if (G_CONFIG.ENABLE_GEOLOCATION) {
        const cachedGeo = db.loadData(G_CONFIG.CACHED_GEOLOCATION_KEY);
        if (cachedGeo && (Date.now() - cachedGeo.timestamp < G_CONFIG.GEOLOCATION_CACHE_MAX_AGE_MS)) {
            latitude = cachedGeo.latitude;
            longitude = cachedGeo.longitude;
            sourceInfo.lat = latitude;
            sourceInfo.lon = longitude;
            sourceInfo.source = 'cached_location_api';
            if (G_CONFIG.DEBUG_MODE) console.log(`DataService: Using cached geolocation (Age: ${((Date.now() - cachedGeo.timestamp)/(1000*60)).toFixed(0)} min). Lat ${latitude}, Lon ${longitude}`);
            if (showNotificationCallback) showNotificationCallback("Using cached location for data.", "info", 2000);
        } else {
            if (G_CONFIG.DEBUG_MODE) console.log("DataService: No valid cached geolocation or cache stale. Attempting live geolocation...");
            if (showNotificationCallback && !isManualRefresh) showNotificationCallback("Attempting to get your current location...", "info", 2500);
            try {
                const position = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: G_CONFIG.GEOLOCATION_TIMEOUT_MS })
                );
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                sourceInfo.lat = latitude;
                sourceInfo.lon = longitude;
                sourceInfo.source = 'live_location_api';
                db.saveData(G_CONFIG.CACHED_GEOLOCATION_KEY, { latitude, longitude, timestamp: Date.now() });
                if (G_CONFIG.DEBUG_MODE) console.log(`DataService: Live geolocation successful: Lat ${latitude}, Lon ${longitude}. Cached.`);
                if (showNotificationCallback) showNotificationCallback("Current location obtained and cached.", "success", 2000);
            } catch (geoError) {
                if (G_CONFIG.DEBUG_MODE) console.warn('DataService: Geolocation failed or denied:', geoError);
                // Keep default coordinates, sourceInfo already set to default.
                sourceInfo.source = 'default_coordinates_geo_error_api';
                if (showNotificationCallback) showNotificationCallback(`Geolocation failed: ${geoError.message}. Using default coordinates.`, "warning", 4000);
            }
        }
    } else {
         // Geolocation explicitly disabled in config
        sourceInfo.source = 'default_coordinates_disabled_api';
        if (G_CONFIG.DEBUG_MODE) console.log("DataService: Geolocation disabled in config. Using default coordinates.");
        if (showNotificationCallback && !isManualRefresh) showNotificationCallback("Geolocation disabled. Using default coordinates for data.", "info", 3500);
    }

    // Fetch from API using determined coordinates
    let pressureDataJson = await fetchPressureDataFromAPI(latitude, longitude, showNotificationCallback);

    // Process and cache new data if fetched
    if (pressureDataJson) {
        const processed = processRawData(pressureDataJson, sourceInfo); // sourceInfo is passed and augmented
        if (processed) {
            db.saveData(G_CONFIG.CACHED_PRESSURE_DATA_KEY, processed);
            if (G_CONFIG.DEBUG_MODE) console.log("DataService: New data fetched from API, processed, and cached.", processed.sourceInfo);
            return { ...processed, status: 'fresh', message: `Live data fetched at ${new Date(processed.sourceInfo.fetchTimestamp).toLocaleTimeString()} for ${processed.sourceInfo.source.replace('_api','')}.` };
        } else { // Failed to process raw API data
            if (G_CONFIG.DEBUG_MODE) console.error("DataService: Failed to process fetched API data.");
            if (showNotificationCallback) showNotificationCallback("Error processing fetched API data.", "error");
            // Fallback to cached if API processing fails
            if (cachedData) {
                if (showNotificationCallback) showNotificationCallback("Failed to process new API data. Displaying older cached version.", "warning", 3000);
                const status = (Date.now() - cachedData.sourceInfo.lastDataPointTimestamp / (1000 * 60)) > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY ? 'stale_api_process_error' : 'fresh_api_process_error';
                return { ...cachedData, status: status, message: `Failed to process API data. Displaying cached data from ${formatUnixTimestamp(cachedData.sourceInfo.lastDataPointTimestamp/1000).timeString}.` };
            }
            return { times: [], values: [], sourceInfo: {lat: latitude, lon: longitude, source: 'error_api_process'}, status: 'error_api_process', message: 'Failed to process API data, no cache.' };
        }
    } else { // API fetch failed
        if (G_CONFIG.DEBUG_MODE) console.error("DataService: API fetch failed.");
        // Fallback to cached data if API fetch itself fails
        if (cachedData) {
            if (showNotificationCallback) showNotificationCallback("Failed to fetch new data from API. Displaying older cached version.", "warning", 3000);
            const status = (Date.now() - cachedData.sourceInfo.lastDataPointTimestamp / (1000 * 60)) > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY ? 'stale_api_fetch_error' : 'fresh_api_fetch_error';
            return { ...cachedData, status: status, message: `API fetch failed. Displaying cached data from ${formatUnixTimestamp(cachedData.sourceInfo.lastDataPointTimestamp/1000).timeString}.` };
        } else {
            // No data from API and no cache, critical error
            if (showNotificationCallback) showNotificationCallback("Failed to load any pressure data from API and no cache available.", "error");
            return { times: [], values: [], sourceInfo: {lat: latitude, lon: longitude, source: 'error_api_fetch_no_cache'}, status: 'error_api_fetch_no_cache', message: 'API fetch failed, no cache available.' };
        }
    }
}
// filename: js/dataService.js