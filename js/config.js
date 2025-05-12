// js/config.js

// Configuration for automated peak/valley detection
export const MIN_PRESSURE_CHANGE_HPA = 1.0; // Minimum hPa change to be considered significant
export const MIN_DURATION_HOURS = 2;      // Minimum duration in hours for an event to be considered

// DOM Element IDs (optional, but can help manage references)
export const CHART_CONTAINER_ID = 'pressureChart';
export const EVENTS_TABLE_BODY_ID = 'pressureEventsTable'; // Note: the table itself, tbody is accessed via it
export const MIGRAINE_FORM_ID = 'migraineForm';
export const MIGRAINE_LIST_ID = 'migraineList';
export const NOTIFICATION_AREA_ID = 'notification-area';
export const MERGE_EVENTS_BTN_ID = 'mergeAutomatedEventsBtn';
export const UNMERGE_EVENT_BTN_ID = 'unmergeAutomatedEventBtn';
export const MIGRAINE_START_TIME_ID = 'migraineStartTime';
export const MIGRAINE_END_TIME_ID = 'migraineEndTime';

// Plot Band ID for Highcharts
export const PLOT_BAND_ID = 'highlight-band';