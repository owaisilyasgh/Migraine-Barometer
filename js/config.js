// js/config.js

// Feature flags
export const USE_LIVE_DATA = true;

// API Configuration
export const API_URL_TEMPLATE = 'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&current=surface_pressure&timezone=auto&past_days=1&timeformat=unixtime';
export const DEFAULT_LATITUDE = 43.8632;
export const DEFAULT_LONGITUDE = -79.2297;

// Mock Data Configuration
export const MOCK_DATA_PATH = 'mock_pressure_data.json';

// Chart Themes Configuration
export const DEFAULT_THEME_ID = 'default';
export const THEME_STORAGE_KEY = 'chartThemePreference';
export const DYNAMIC_THEME_SCRIPT_ID = 'dynamic-highcharts-theme-script';

export const THEMES = [
    { id: 'default', name: 'Default', url: null },
    { id: 'brand-dark', name: 'Brand Dark', url: 'https://code.highcharts.com/themes/brand-dark.js' },
    { id: 'brand-light', name: 'Brand Light', url: 'https://code.highcharts.com/themes/brand-light.js' }
];

// Cached Data Configuration
export const CACHED_PRESSURE_DATA_KEY = 'pressureTracker_cachedPressureData';
// Optional: Define cache expiry if needed later, e.g., 1 hour
// export const CACHE_EXPIRY_DURATION_MS = 1 * 60 * 60 * 1000;


// Configuration for automated peak/valley detection
export const MIN_PRESSURE_CHANGE_HPA = 1.0;
export const MIN_DURATION_HOURS = 2;

// DOM Element IDs
export const CHART_CONTAINER_ID = 'pressureChart';
export const EVENTS_TABLE_BODY_ID = 'pressureEventsTable';
export const MIGRAINE_FORM_ID = 'migraineForm';
export const MIGRAINE_START_TIME_ID = 'migraineStartTime';
export const MIGRAINE_END_TIME_ID = 'migraineEndTime';
export const MIGRAINE_LIST_ID = 'migraineList';
export const NOTIFICATION_AREA_ID = 'notification-area';
export const MERGE_EVENTS_BTN_ID = 'mergeAutomatedEventsBtn';
export const UNMERGE_EVENT_BTN_ID = 'unmergeAutomatedEventBtn';

// Plot Band ID for Highcharts
export const PLOT_BAND_ID = 'event-highlight-band';
export const CURRENT_TIME_PLOT_LINE_ID = 'current-time-plot-line';
// filename: js/config.js