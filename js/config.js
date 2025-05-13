// js/config.js

// Feature flags
export const USE_LIVE_DATA = true; // true to use live API data, false to use mock_pressure_data.json

// API Configuration
export const API_URL_TEMPLATE = 'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=surface_pressure&current=surface_pressure&timezone=auto&past_days=1&timeformat=unixtime';
export const DEFAULT_LATITUDE = 43.8632; // Default latitude (e.g., Toronto area)
export const DEFAULT_LONGITUDE = -79.2297; // Default longitude (e.g., Toronto area)

// Mock Data Configuration
export const MOCK_DATA_PATH = 'mock_pressure_data.json';

// Configuration for automated peak/valley detection
export const MIN_PRESSURE_CHANGE_HPA = 1.0; // Minimum hPa change to be considered significant
export const MIN_DURATION_HOURS = 2;      // Minimum duration in hours for an event to be considered

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