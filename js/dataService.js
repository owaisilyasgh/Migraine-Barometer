// js/dataService.js
import * as G_CONFIG from './config.js';
import * as db from './db.js';
import { formatUnixTimestamp } from './utils.js';

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
    if (!rawData || !rawData.hourly || !rawData.hourly.time || !rawData.hourly.surface_pressure ||
        rawData.hourly.time.length !== rawData.hourly.surface_pressure.length) {
        if (G_CONFIG.DEBUG_MODE) console.warn("DataService: Raw data is not in the expected {hourly: {time, surface_pressure}} structure:", rawData);
        return null;
    }
    sourceInfo.fetchTimestamp = Date.now();
    sourceInfo.lastDataPointTimestamp = rawData.hourly.time[rawData.hourly.time.length - 1] * 1000; // ms
    sourceInfo.source = 'api';

    if (G_CONFIG.DEBUG_MODE) console.log("DataService: Raw data processed. Last data point:", new Date(sourceInfo.lastDataPointTimestamp).toLocaleString());
    return {
        times: rawData.hourly.time, // Keep as seconds for compatibility
        values: rawData.hourly.surface_pressure,
        sourceInfo: { ...sourceInfo }
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

    let sourceInfo = {
        lat: G_CONFIG.DEFAULT_LATITUDE,
        lon: G_CONFIG.DEFAULT_LONGITUDE,
        source: 'unknown',
        fetchTimestamp: 0,
        lastDataPointTimestamp: 0
    };

    const cachedData = db.loadData(G_CONFIG.CACHED_PRESSURE_DATA_KEY);
    let canUseCache = false;

    if (cachedData && cachedData.times && cachedData.values && cachedData.sourceInfo) {
        sourceInfo = { ...cachedData.sourceInfo }; // Load sourceInfo from cache
        canUseCache = true;
        if (G_CONFIG.DEBUG_MODE) console.log("DataService: Found cached data. Last data point in cache:", new Date(sourceInfo.lastDataPointTimestamp).toLocaleString());

        const dataPointAgeMs = Date.now() - sourceInfo.lastDataPointTimestamp;
        const dataPointAgeMinutes = dataPointAgeMs / (1000 * 60);
        const isStaleForUI = dataPointAgeMinutes > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY;
        
        const cacheAgeMinutesForAutoRefresh = (Date.now() - (sourceInfo.fetchTimestamp || 0)) / (1000 * 60);
        const attemptApiFetch = isManualRefresh || isStaleForUI || cacheAgeMinutesForAutoRefresh > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_AUTO_REFRESH;

        if (!attemptApiFetch) {
            if (G_CONFIG.DEBUG_MODE) console.log(`DataService: Cached data is FRESH. Age: ${dataPointAgeMinutes.toFixed(0)} mins. Returning cached.`);
            if (showNotificationCallback && !isManualRefresh) showNotificationCallback("Displaying recently cached pressure data.", "info", 2000);
            return { ...cachedData, status: 'fresh', message: `Displaying cached data, updated ${formatUnixTimestamp(sourceInfo.lastDataPointTimestamp/1000).timeString}.` };
        }
         if (isStaleForUI && !isManualRefresh && cacheAgeMinutesForAutoRefresh <= G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_AUTO_REFRESH) {
            if (G_CONFIG.DEBUG_MODE) console.log(`DataService: Cached data STALE for UI, but cache entry recent enough. Returning cached, UI will show stale message.`);
            return { ...cachedData, status: 'stale_ui_only', message: `Data last updated ${formatUnixTimestamp(sourceInfo.lastDataPointTimestamp/1000).dateString} ${formatUnixTimestamp(sourceInfo.lastDataPointTimestamp/1000).timeString}. Displaying cached version.` };
        }

    } else {
        if (G_CONFIG.DEBUG_MODE) console.log("DataService: No valid cached data found or structure mismatch. Must fetch from API.");
    }

    // API Fetch Logic
    const lastApiFetchMs = db.loadData(G_CONFIG.LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY) || 0;
    const timeSinceLastApiFetchMs = Date.now() - lastApiFetchMs;

    if (!isManualRefresh && timeSinceLastApiFetchMs < G_CONFIG.API_CALL_INTERVAL_MS) {
        const remainingCooldownMinutes = Math.round((G_CONFIG.API_CALL_INTERVAL_MS - timeSinceLastApiFetchMs) / (1000 * 60));
        const message = `API calls on cooldown. ${remainingCooldownMinutes} mins remaining.`;
        if (G_CONFIG.DEBUG_MODE) console.log(`DataService: API call SKIPPED. Cooldown. ${message}`);

        if (canUseCache) {
            if (showNotificationCallback) showNotificationCallback(message + " Displaying cached data.", "info", 4000);
            const dataPointAgeMs = Date.now() - cachedData.sourceInfo.lastDataPointTimestamp;
            const status = (dataPointAgeMs / (1000 * 60)) > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY ? 'stale_api_cooldown' : 'fresh_api_cooldown'; // more specific status
            return { ...cachedData, status: status, message: `Data last updated ${formatUnixTimestamp(cachedData.sourceInfo.lastDataPointTimestamp/1000).timeString}. API on cooldown.` };
        } else {
            if (showNotificationCallback) showNotificationCallback("No cached data available and API is on cooldown. Try again later.", "warning", 5000);
            return { times: [], values: [], sourceInfo, status: 'error_api_cooldown_no_cache', message: 'API on cooldown, no cache available.' };
        }
    }

    if (G_CONFIG.DEBUG_MODE) console.log("DataService: API call PERMITTED. Cooldown passed or manual refresh.");
    sourceInfo.source = 'api'; // Reset source for new fetch attempt

    let pressureDataJson = null;
    if (G_CONFIG.ENABLE_GEOLOCATION && navigator.geolocation) {
        if (G_CONFIG.DEBUG_MODE) console.log("DataService: Attempting geolocation...");
        if (showNotificationCallback) showNotificationCallback("Attempting geolocation...", "info", 2500);
        try {
            const position = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
            );
            sourceInfo.lat = position.coords.latitude;
            sourceInfo.lon = position.coords.longitude;
            if (G_CONFIG.DEBUG_MODE) console.log(`DataService: Geolocation successful: Lat ${sourceInfo.lat}, Lon ${sourceInfo.lon}`);
            pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon, showNotificationCallback);
        } catch (geoError) {
            if (G_CONFIG.DEBUG_MODE) console.warn('DataService: Geolocation failed or denied:', geoError);
            if (showNotificationCallback) showNotificationCallback(`Geolocation failed: ${geoError.message}. Using default coordinates.`, "warning", 4000);
            // Fallback to default coordinates and fetch
            sourceInfo.lat = G_CONFIG.DEFAULT_LATITUDE;
            sourceInfo.lon = G_CONFIG.DEFAULT_LONGITUDE;
            pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon, showNotificationCallback);
        }
    } else {
        const reason = !G_CONFIG.ENABLE_GEOLOCATION ? "Geolocation disabled in config." : "Geolocation not supported by browser.";
        if (G_CONFIG.DEBUG_MODE) console.log(`DataService: ${reason} Using default coordinates.`);
        if (showNotificationCallback) showNotificationCallback(`${reason} Using default coordinates.`, "info", 3500);
        sourceInfo.lat = G_CONFIG.DEFAULT_LATITUDE;
        sourceInfo.lon = G_CONFIG.DEFAULT_LONGITUDE;
        pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon, showNotificationCallback);
    }

    // Process and cache new data if fetched
    if (pressureDataJson) {
        const processed = processRawData(pressureDataJson, sourceInfo);
        if (processed) {
            db.saveData(G_CONFIG.CACHED_PRESSURE_DATA_KEY, processed);
            if (G_CONFIG.DEBUG_MODE) console.log("DataService: New data fetched from API, processed, and cached.", processed.sourceInfo);
            return { ...processed, status: 'fresh', message: `Live data fetched at ${new Date(processed.sourceInfo.fetchTimestamp).toLocaleTimeString()}` };
        } else {
            if (G_CONFIG.DEBUG_MODE) console.error("DataService: Failed to process fetched API data.");
            if (showNotificationCallback) showNotificationCallback("Error processing fetched API data.", "error");
            if (canUseCache) {
                 if (showNotificationCallback) showNotificationCallback("Failed to process new API data. Displaying older cached version.", "warning", 3000);
                const status = (Date.now() - cachedData.sourceInfo.lastDataPointTimestamp / (1000 * 60)) > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY ? 'stale_api_process_error' : 'fresh_api_process_error';
                return { ...cachedData, status: status, message: `Failed to process API data. Displaying cached data from ${formatUnixTimestamp(cachedData.sourceInfo.lastDataPointTimestamp/1000).timeString}.` };
            }
            return { times: [], values: [], sourceInfo, status: 'error_api_process', message: 'Error processing API data, no cache available.' };
        }
    } else { // API fetch failed
        if (G_CONFIG.DEBUG_MODE) console.error("DataService: API fetch failed.");
        if (canUseCache) {
             if (showNotificationCallback) showNotificationCallback("Failed to fetch new data from API. Displaying older cached version.", "warning", 3000);
             const status = (Date.now() - cachedData.sourceInfo.lastDataPointTimestamp / (1000 * 60)) > G_CONFIG.CACHE_MAX_AGE_MINUTES_FOR_DISPLAY ? 'stale_api_fetch_error' : 'fresh_api_fetch_error';
             return { ...cachedData, status: status, message: `API fetch failed. Displaying cached data from ${formatUnixTimestamp(cachedData.sourceInfo.lastDataPointTimestamp/1000).timeString}.` };
        }
        if (showNotificationCallback) showNotificationCallback("Failed to load any pressure data from API and no cache available.", "error");
        return { times: [], values: [], sourceInfo, status: 'error_api_no_cache', message: 'API fetch failed, no cache available.' };
    }
}
// filename: js/dataService.js