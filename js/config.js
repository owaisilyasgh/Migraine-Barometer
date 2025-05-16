// js/config.js
/**
 * @file config.js
 * @description Application-wide configuration constants.
 */

// App Behavior
export const APP_NAME = "Pressure & Migraine Tracker";
export const APP_VERSION = "1.4.0"; // Corresponds to cache version strategy

// Feature flags
export const USE_MOCK_DATA = false;
export const ENABLE_GEOLOCATION = true;

// API Configuration
export const API_URL_TEMPLATE = 'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&timeformat=unixtime&forecast_days=3';
export const DEFAULT_LATITUDE = 43.6532;
export const DEFAULT_LONGITUDE = -79.3832;

// Mock Data Configuration
export const MOCK_DATA_PATH = './mock_pressure_data.json';

// Cached Data Configuration
export const CACHED_PRESSURE_DATA_KEY = 'pressureDataCache_v1';
export const CACHE_EXPIRY_MINUTES = 360;

// Migraine Logging Configuration
export const EVENT_MIGRAINE_LOGS_KEY = 'eventMigraineLogs_v1';
export const MIGRAINE_SEVERITIES = ['Mild', 'Moderate', 'Severe'];

// Configuration for automated peak/valley detection
export const MIN_DURATION_HOURS = 1.0;
export const MIN_PRESSURE_CHANGE_HPA = 0.8;

// DOM Element IDs
export const CHART_CONTAINER_ID = 'pressureChart';
export const EVENTS_TABLE_BODY_ID = 'pressureEventsTableBody';
export const SHOW_ALL_EVENTS_TOGGLE_ID = 'showAllEventsToggle'; // << CORRECTED DEFINITION
export const NOTIFICATION_AREA_ID = 'notification-area';
export const DYNAMIC_THEME_SCRIPT_ID = 'dynamic-theme-script';

// Storage Keys
export const PRESSURE_EVENTS_STORAGE_KEY = 'automatedPressureEvents_v1';
export const SHOW_ALL_EVENTS_TOGGLE_STATE_KEY = 'showAllEventsToggleState_v1';

// Plot Band ID for Highcharts
export const CURRENT_TIME_PLOT_LINE_ID = 'current-time-line';
export const AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX = 'auto-event-band-';
export const SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID = 'single-event-highlight-band';

// Colors for plot bands and chart elements
export const PRIMARY_CHART_LINE_COLOR = '#6750A4';
export const CHART_AREA_FILL_GRADIENT_START_COLOR = '#6750A4';
export const CURRENT_TIME_PLOT_LINE_COLOR = '#B3261E';
export const EVENT_HIGHLIGHT_COLOR = 'rgba(103, 80, 164, 0.4)';
export const EVENT_PLOT_BAND_RISE_COLOR = 'rgba(52, 152, 219, 0.2)';
export const EVENT_PLOT_BAND_FALL_COLOR = 'rgba(231, 76, 60, 0.2)';
export const EVENT_PLOT_BAND_BASE_COLOR = 'rgba(128,128,128,0.2)';

// Chart Configuration
export const CHART_Y_AXIS_PADDING = 3;
export const META_THEME_COLOR = '#6750A4';

// filename: js/config.js