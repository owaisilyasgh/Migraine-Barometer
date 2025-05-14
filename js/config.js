// https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&currentt=surface_pressure&timezone=auto&past_days=1&forecast_days=3&timeformat=unixtime

// js/config.js
/**
 * @file config.js
 * @description Application-wide configuration constants.
 */

// Feature flags
export const USE_MOCK_DATA = false; // Set to false to attempt live API calls
export const ENABLE_GEOLOCATION = true; // Set to false to disable geolocation attempts

// API Configuration
export const API_URL_TEMPLATE = 'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&current=surface_pressure&timezone=auto&past_days=1&forecast_days=3&timeformat=unixtime';
export const DEFAULT_LATITUDE = 43.6532; // Toronto latitude
export const DEFAULT_LONGITUDE = -79.3832; // Toronto longitude

// Mock Data Configuration
export const MOCK_DATA_PATH = './mock_pressure_data.json';

// Chart Themes Configuration
export const THEMES = [
    { id: 'default-light', name: 'Default Light', path: null },
    { id: 'highcharts-dark', name: 'Highcharts Dark', path: 'https://code.highcharts.com/themes/dark-unica.js' },
    { id: 'highcharts-sand', name: 'Highcharts Sand', path: 'https://code.highcharts.com/themes/sand-signika.js' },
];
export const DEFAULT_THEME_ID = 'default-light';
export const DYNAMIC_THEME_SCRIPT_ID = 'dynamicThemeScript';

// Cached Data Configuration
export const CACHED_PRESSURE_DATA_KEY = 'pressureDataCache';
export const THEME_STORAGE_KEY = 'selectedTheme';
export const EVENT_MIGRAINE_LOGS_KEY = 'eventMigraineLogs';
export const SHOW_ALL_EVENTS_TOGGLE_STATE_KEY = 'showAllEventsToggleState';


// Migraine Logging Configuration
export const MIGRAINE_SEVERITIES = ['None', 'Low', 'Medium', 'High', 'Very High'];

// Configuration for automated peak/valley detection
export const MIN_DURATION_HOURS = 2; 
export const MIN_PRESSURE_CHANGE_HPA = 1.0; 
export const PRESSURE_TREND_WINDOW = 1; 

// DOM Element IDs
export const CHART_CONTAINER_ID = 'pressureChart';
export const EVENTS_TABLE_BODY_ID = 'pressureEventsTableBody';
export const MERGE_EVENTS_BTN_ID = 'mergeAutomatedEventsBtn';
export const UNMERGE_EVENT_BTN_ID = 'unmergeAutomatedEventBtn';
export const SHOW_ALL_EVENTS_BTN_ID = 'showAllEventsBtn'; // New ID for the button toggle
export const NOTIFICATION_AREA_ID = 'notification-area';

// Plot Band ID for Highcharts
export const SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID = 'singleSelectedEventPlotBand';
export const AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX = 'auto-event-plot-band-';
export const CURRENT_TIME_PLOT_LINE_ID = 'currentTimePlotLine';

// Colors for plot bands
export const PLOT_BAND_COLOR_STANDARD = 'rgba(103, 80, 164, 0.1)'; 
export const PLOT_BAND_COLOR_PROMINENT = 'rgba(103, 80, 164, 0.3)';
export const PLOT_BAND_BORDER_COLOR_PROMINENT = 'rgba(103, 80, 164, 0.7)';

// Chart Configuration
export const CHART_Y_AXIS_PADDING = 3; // hPa padding for min/max of Y-axis
// filename: js/config.js