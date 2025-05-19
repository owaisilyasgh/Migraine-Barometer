// js/config.js
/**
 * @file config.js
 * @description Application-wide configuration constants.
 */

// App Behavior
export const APP_VERSION = "1.5.3"; // Updated for highlight sync fix
export const DEBUG_MODE = true; // Master debug switch for console logs. Set to false for production.
export const ENABLE_GEOLOCATION = true; // Set to false to always use default coordinates without asking

// UI Configuration
export const APP_TITLE = "Pressure & Migraine Tracker";
export const CHART_CONTAINER_ID = 'pressureChart';
export const CHART_CONTROLS_SECTION_ID = 'chart-controls-section';
export const PRESSURE_EVENTS_SECTION_ID = 'pressure-events-section'; // Card that holds carousel
export const FOCUSED_EVENT_CAROUSEL_ID = 'focusedEventCarousel'; // Main carousel container (viewport)
export const SHOW_ALL_EVENTS_TOGGLE_ID = 'show-all-events-toggle';
export const RETURN_TO_CURRENT_BTN_ID = 'return-to-current-btn';
export const NOTIFICATION_AREA_ID = 'notification-area';

// API Configuration
// USER CONFIGURABLE: Replace with a valid API endpoint.
export const API_URL_TEMPLATE = "https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure,temperature_2m&timeformat=unixtime&timezone=auto&forecast_days=2&past_days=0";
export const DEFAULT_LATITUDE = 51.5074;  // London
export const DEFAULT_LONGITUDE = 0.1278; // London
export const API_CALL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const GEOLOCATION_TIMEOUT_MS = 10000; // 10 seconds

// Cached Data Configuration
export const CACHED_PRESSURE_DATA_KEY = 'pressureDataCache';
export const LAST_API_FETCH_COORDS_KEY = 'lastApiFetchCoords';
export const LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY = 'lastSuccessfulApiFetchTimestamp';
export const CACHE_MAX_AGE_MINUTES_FOR_DISPLAY = 60 * 3;
export const CACHE_MAX_AGE_MINUTES_FOR_AUTO_REFRESH = 30;
export const MIN_DATA_POINTS_FOR_DISPLAY = 6;

// Migraine Logging Configuration
export const EVENT_MIGRAINE_LOGS_KEY = 'eventMigraineLogs';
export const MIGRAINE_SEVERITIES = ['Mild', 'Moderate', 'Severe', 'Very Severe', 'Cleared'];

// Configuration for automated peak/valley detection
export const MIN_DURATION_HOURS = 3;
export const MIN_PRESSURE_CHANGE_HPA = 0.8;
export const SEVERITY_THRESHOLDS = {
    MEDIUM: 0.8,
    HIGH: 1.5
};
export const TREND_WINDOW_SIZE = 3;

// Storage Keys
export const USER_PREFERENCES_KEY = 'userPreferences';
export const SHOW_ALL_EVENTS_TOGGLE_STATE_KEY = 'showAllEventsToggleState';

// Plot Band ID for Highcharts
export const CURRENT_TIME_PLOT_LINE_ID = 'current_time_line';
export const AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX = 'event_band_';
export const SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID = 'single_event_highlight';
export const ACTIVE_FOCUS_PLOT_BAND_ID = 'active_focus_highlight';

// Colors for plot bands and chart elements
export const PLOT_BAND_RISE_COLOR = 'rgba(255, 0, 0, 0.1)';
export const PLOT_BAND_FALL_COLOR = 'rgba(0, 0, 255, 0.1)';
export const PLOT_BAND_STABLE_COLOR = 'rgba(0, 255, 0, 0.1)';
export const PLOT_BAND_HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.45)'; // Yellow, increased opacity
export const ACTIVE_FOCUS_HIGHLIGHT_COLOR = 'rgba(128,0,128,0.2)'; // Purple

// Chart Configuration
export const CHART_YAXIS_PADDING_MIN_HPA = 2;
export const CHART_YAXIS_PADDING_DYNAMIC_FACTOR = 0.05;
export const CHART_AREA_FILL_GRADIENT_START_COLOR = '#6750A4';
export const CHART_SERIES_LINE_COLOR = '#6750A4';
export const CURRENT_TIME_LINE_COLOR = '#FF4500';
export const DEFAULT_CHART_HEIGHT_PX = 270;

// UI Behavior
export const MOBILE_BREAKPOINT_PX = 768;
export const CAROUSEL_SWIPE_THRESHOLD_PX = 50;

if (DEBUG_MODE) {
    console.log(`Config loaded (v${APP_VERSION}). Debug mode: ${DEBUG_MODE}, Geolocation: ${ENABLE_GEOLOCATION}`);
}
// filename: js/config.js