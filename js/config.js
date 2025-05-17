// filename: js/config.js
/**
 * @file config.js
 * @description Application-wide configuration constants.
 */

// App Behavior
export const APP_VERSION = "1.5.1"; // Incremented for UI changes
export const ENABLE_GEOLOCATION = true;
export const DEBUG_MODE = true;

// UI Configuration
export const MIGRAINE_SEVERITIES = ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'];
export const NOTIFICATION_AREA_ID = 'notification-area';
export const SHOW_ALL_EVENTS_TOGGLE_ID = 'showAllEventsToggle';
export const CHART_CONTROLS_SECTION_ID = 'chart-controls-section'; // New section ID

// API Configuration
export const API_URL_TEMPLATE = 'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&timeformat=unixtime&forecast_days=2&past_days=0';
export const DEFAULT_LATITUDE = 0.0;
export const DEFAULT_LONGITUDE = 0.0;
export const API_CALL_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const LAST_SUCCESSFUL_API_FETCH_TIMESTAMP_KEY = 'lastSuccessfulApiFetchTs';

// Cached Data Configuration
export const CACHED_PRESSURE_DATA_KEY = 'pressureData_v2';
export const CACHE_MAX_AGE_MINUTES_FOR_DISPLAY = 180;
export const CACHE_MAX_AGE_MINUTES_FOR_AUTO_REFRESH = 60;

// Migraine Logging Configuration
export const EVENT_MIGRAINE_LOGS_KEY = 'eventMigraineLogs_v1';

// Configuration for automated peak/valley detection
export const PEAK_VALLEY_WINDOW_SIZE = 3;
export const MIN_DURATION_HOURS = 1;
export const MIN_PRESSURE_CHANGE_HPA = 0.8;

// DOM Element IDs
export const CHART_CONTAINER_ID = 'pressureChart';
// export const EVENTS_TABLE_BODY_ID = 'pressureEventsTableBody'; // No longer used
export const PRESSURE_EVENTS_SECTION_ID = 'pressure-events-section';
export const FOCUSED_EVENT_CAROUSEL_ID = 'focusedEventCarousel';

// Storage Keys
export const SHOW_ALL_EVENTS_TOGGLE_STATE_KEY = 'showAllEventsToggleState_v1';

// Plot Band ID for Highcharts
export const CURRENT_TIME_PLOT_LINE_ID = 'current-time-plot-line';
export const AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX = 'auto-event-band-';
export const SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID = 'single-event-highlight-band';
export const ACTIVE_FOCUS_PLOT_BAND_ID = 'active-focus-event-band';

// Colors for plot bands and chart elements
export const CHART_LINE_COLOR = 'var(--m3-primary)';
export const CHART_AREA_FILL_GRADIENT_START_COLOR = 'var(--m3-primary-container)';
export const DEFAULT_EVENT_PLOT_BAND_COLOR = 'rgba(103, 80, 164, 0.1)';
export const FOCUSED_EVENT_PLOT_BAND_COLOR = 'rgba(103, 80, 164, 0.25)';

// Chart Configuration
export const CHART_YAXIS_PADDING_DYNAMIC_FACTOR = 0.1;
export const CHART_YAXIS_PADDING_MIN_HPA = 2;

// UI Behavior
export const MOBILE_BREAKPOINT_PX = 768; // Screen width below which assumes mobile-like layout needs
export const EVENT_CARD_ANIMATION_SPEED_MS = 300;
export const EVENT_CARD_QUICK_CYCLE_DELAY_MS = 50;
export const M3_SHAPE_CORNER_SM_PX = 8;

if (DEBUG_MODE) {
    console.log("Config loaded (v" + APP_VERSION + "):", { /* relevant keys */ });
}
// filename: js/config.js