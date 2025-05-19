// js/config.js
/**
 * @file config.js
 * @description Application-wide configuration constants.
 */

// App Behavior
export const APP_VERSION = "1.5.5"; // Updated for PRESSURE_SEVERITY_THRESHOLDS fix
export const DEBUG_MODE = true; // Master debug switch for console logs. Set to false for production.
export const ENABLE_GEOLOCATION = true; // Set to false to always use default coordinates without asking

// UI Configuration
export const CHART_CONTAINER_ID = 'pressureChart';
export const CHART_RESIZE_DEBOUNCE_MS = 250; // Debounce for chart reflow on resize
export const NOTIFICATION_AREA_ID = 'notification-area';
export const SHOW_ALL_EVENTS_TOGGLE_ID = 'showAllEventsToggle';
export const EVENT_MIGRAINE_LOGS_TABLE_ID = 'migraineLogsTableBody'; // Example, if used
export const PRESSURE_EVENTS_SECTION_ID = 'pressure-events-section'; // Card that holds carousel
export const CHART_CONTROLS_SECTION_ID = 'chart-controls-section'; // Card that holds chart controls
export const FOCUSED_EVENT_CAROUSEL_ID = 'focusedEventCarousel'; // Main carousel container (viewport)

// API Configuration
// USER CONFIGURABLE: Replace with a valid API endpoint.
// Example uses Open-Meteo API: https://open-meteo.com/en/docs
export const API_URL_TEMPLATE = 'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&timeformat=unixtime&forecast_days=2&past_days=0';
export const DEFAULT_LATITUDE = 51.5074;  // London
export const DEFAULT_LONGITUDE = 0.1278; // London
export const API_CALL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const GEOLOCATION_TIMEOUT_MS = 10000; // 10 seconds
export const GEOLOCATION_CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

// Cached Data Configuration
export const CACHE_MAX_AGE_MINUTES_FOR_DISPLAY = 180; // 3 hours (pressure data is stale for display if older)
export const CACHE_MAX_AGE_MINUTES_FOR_API_REFRESH_CHECK = 60; // 1 hour (API can refresh if cached pressure data's *fetch time* is older)

// Migraine Logging Configuration
export const MIGRAINE_SEVERITIES = ["Mild", "Moderate", "Severe", "Very Severe"]; // Options for select
export const MIGRAINE_SEVERITY_MAP = { // For display if needed, and consistency
    low: "Mild",
    medium: "Moderate",
    high: "Severe",
    extreme: "Very Severe"
};

// Configuration for automated peak/valley detection
export const MIN_DURATION_HOURS = 2; // Minimum hours for a pressure event to be considered significant
export const MIN_PRESSURE_CHANGE_HPA = 1.0; // Minimum pressure change (hPa) for an event
export const PRESSURE_TREND_STABILITY_THRESHOLD_HPA = 0.4; // Changes less than this are considered stable

// Pressure Event Severity Thresholds (rate of change in hPa/hr)
export const PRESSURE_SEVERITY_THRESHOLDS = {
    HIGH: 1.5,    // Absolute rate >= 1.5 hPa/hr is High
    MEDIUM: 0.75, // Absolute rate >= 0.75 hPa/hr is Medium
    // Anything less than MEDIUM but meeting MIN_PRESSURE_CHANGE_HPA and MIN_DURATION_HOURS is Low
    // "Minimal" would be for changes that don't meet event criteria.
};


// Storage Keys
export const CACHED_PRESSURE_DATA_KEY = "pressureDataCache";
export const EVENT_MIGRAINE_LOGS_KEY = "eventMigraineLogs";
export const LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY = "lastSuccessfulApiFetchTimestamp";
export const SHOW_ALL_EVENTS_TOGGLE_STATE_KEY = "showAllEventsToggleState";
export const CACHED_GEOLOCATION_KEY = "geolocationCache";

// Plot Band ID for Highcharts
export const AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX = 'auto_event_';
export const SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID = 'single_event_highlight';
export const ACTIVE_FOCUS_PLOT_BAND_ID = 'active_focus_highlight'; // For calm periods with "Show All" OFF
export const CURRENT_TIME_PLOT_LINE_ID = 'current_time_line';

// Colors for plot bands and chart elements
export const PLOT_BAND_DEFAULT_COLOR = 'rgba(100, 100, 100, 0.15)'; // Default for multiple events
export const PLOT_BAND_HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.45)'; // Yellow, increased opacity
export const ACTIVE_FOCUS_HIGHLIGHT_COLOR = 'rgba(128,0,128,0.2)'; // Purple
export const CHART_SERIES_LINE_COLOR = 'var(--m3-primary)';
export const CHART_AREA_FILL_GRADIENT_START_COLOR = 'var(--m3-primary-container)';

// Chart Configuration
export const CHART_YAXIS_PADDING_MIN_HPA = 5; // Minimum padding above/below max/min pressure
export const CHART_YAXIS_PADDING_DYNAMIC_FACTOR = 0.1; // 10% of range for dynamic padding

// UI Behavior
export const CAROUSEL_SWIPE_THRESHOLD_PX = 50; // Minimum swipe distance to change card

if (DEBUG_MODE) console.log(`Config loaded (v${APP_VERSION}). Debug mode: ${DEBUG_MODE}, Geolocation: ${ENABLE_GEOLOCATION}`);

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// filename: js/config.js