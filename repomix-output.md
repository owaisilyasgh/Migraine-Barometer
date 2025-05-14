This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
index.html
js/app.js
js/chartManager.js
js/config.js
js/db.js
js/pressureEventManager.js
js/uiRenderer.js
js/utils.js
manifest.json
mock_pressure_data.json
README.md
style.css
sw.js
```

# Files

## File: index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pressure & Migraine Tracker</title>
    <link rel="stylesheet" href="style.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#6750A4"/>
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="PressureTrack">
    <link rel="apple-touch-icon" href="icons/icon-192x192.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body class="theme-mode-light m3-body">

    <div id="notification-area" class="m3-snackbar-container"></div>

    <header class="m3-top-app-bar">
        <h1 class="m3-top-app-bar__title">Pressure & Migraine Tracker</h1>
    </header>

    <main class="m3-main-content">
        <section id="pressure-chart-section" class="m3-card">
            <h2 class="m3-card__title">Surface Pressure Over Time</h2>
            <div class="m3-card__content">
                <div class="chart-container large-chart-container">
                    <div id="pressureChart"></div>
                </div>
            </div>
        </section>

        <section id="pressure-events-section" class="m3-card">
            <h2 class="m3-card__title">Detected Pressure Events (Automated)</h2>
            <div class="m3-card__content">
                <div class="automated-events-controls m3-button-group">
                    <button id="mergeAutomatedEventsBtn" class="m3-button m3-button-outlined" disabled>Merge Selected (2)</button>
                    <button id="unmergeAutomatedEventBtn" class="m3-button m3-button-outlined" disabled>Unmerge Selected (1)</button>
                </div>
                <div class="m3-table-container">
                    <table id="pressureEventsTable" class="m3-table">
                        <thead>
                            <tr>
                                <th>Select</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Duration (hrs)</th>
                                <th>(hPa)±</th>
                                <th>Type</th>
                                <th>Rate (hPa/hr)</th>
                                <th>Severity</th>
                                <th>Migraine Log</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </section>


    </main>

    <footer class="m3-footer">
        <p>Pressure Tracker PWA</p>
    </footer>

    <script src="https://code.highcharts.com/highcharts.js" defer></script>
    <script src="https://code.highcharts.com/modules/accessibility.js" defer></script>
    <script src="https://code.highcharts.com/modules/exporting.js" defer></script>
    <script type="module" src="js/app.js" defer></script>

</body>
</html>
<!-- filename: index.html -->
```

## File: js/app.js
```javascript
// js/app.js
⋮----
import { createRipple } from './utils.js'; // Assuming showNotification is now in UIRenderer
⋮----
// Module-level state
⋮----
let eventMigraineLogs = {}; // Store migraine logs { eventId: { severity: 'High', loggedAt: timestamp }}
⋮----
function registerServiceWorker() {
⋮----
navigator.serviceWorker.register('./sw.js')
.then(registration => console.log('SW registered:', registration.scope))
.catch(error => console.error('SW registration failed:', error));
⋮----
function applyTheme(themeId) {
⋮----
db.saveData(Config.THEME_STORAGE_KEY, themeId);
⋮----
const selectedTheme = Config.THEMES.find(t => t.id === themeId);
⋮----
console.error(`Theme with id ${themeId} not found.`);
UIRenderer.showNotification(`Theme ${themeId} not found. Using default.`, "error");
if (themeId !== Config.DEFAULT_THEME_ID) { // Avoid infinite loop
applyTheme(Config.DEFAULT_THEME_ID);
⋮----
// Remove old theme script if it exists
const oldThemeScript = document.getElementById(Config.DYNAMIC_THEME_SCRIPT_ID);
if (oldThemeScript) oldThemeScript.remove();
⋮----
// Highcharts specific global options (re-apply if theme changes Highcharts vars)
Highcharts.setOptions(ChartManager.HIGHCHARTS_EXPLICIT_DEFAULT_STYLES);
Highcharts.setOptions(ChartManager.BASE_HIGHCHARTS_OPTIONS);
// Apply timezone offset, ensuring it's part of BASE_HIGHCHARTS_OPTIONS
⋮----
Highcharts.setOptions({ time: { timezoneOffset: ChartManager.BASE_HIGHCHARTS_OPTIONS.time.timezoneOffset } });
⋮----
const finalizeThemeAndProcessData = () => {
// Re-initialize chart with current data if it exists
⋮----
ChartManager.destroyChart(); // Destroy existing chart instance
processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
⋮----
initiateFreshDataLoad(); // Or just try to re-render if data already loaded
⋮----
if (selectedTheme.path) { // If theme has a CSS file to load
UIRenderer.showNotification(`Loading ${selectedTheme.name} theme...`, "info", 2000);
const script = document.createElement('script'); // This was for JS themes, for CSS it's a link
// Assuming themes are CSS files or JS that applies styles
// For this example, let's stick to the Highcharts theme logic if it's JS based like in example
// If it's purely CSS variables, a script might not be needed, just a body class change.
// The current setup suggests themes are JS files defining Highcharts options.
⋮----
script.onload = () => {
UIRenderer.showNotification(`${selectedTheme.name} theme applied.`, "success", 1500);
finalizeThemeAndProcessData();
⋮----
script.onerror = () => {
UIRenderer.showNotification(`Error loading ${selectedTheme.name}. Reverting to Default.`, "error");
db.saveData(Config.THEME_STORAGE_KEY, Config.DEFAULT_THEME_ID); // Revert stored theme
if (currentThemeId !== Config.DEFAULT_THEME_ID) applyTheme(Config.DEFAULT_THEME_ID); // Apply default
⋮----
document.head.appendChild(script);
} else { // For themes that don't load external files (e.g., default, or CSS var only themes)
⋮----
async function fetchPressureDataFromAPI(latitude, longitude) {
const apiUrl = Config.API_URL_TEMPLATE.replace('{LAT}', latitude).replace('{LON}', longitude);
⋮----
const response = await fetch(apiUrl);
if (!response.ok) throw new Error(`API error! status: ${response.status}`);
const data = await response.json();
UIRenderer.showNotification("Live pressure data fetched!", "success", 1500);
⋮----
console.error('Error fetching live data:', error);
UIRenderer.showNotification(`Error fetching live data: ${error.message}.`, "error");
⋮----
async function fetchPressureDataFromMock() {
⋮----
const response = await fetch(Config.MOCK_DATA_PATH);
if (!response.ok) throw new Error(`Mock data HTTP error! status: ${response.status}`);
⋮----
UIRenderer.showNotification("Mock data loaded.", "success", 1000);
⋮----
console.error('Error fetching mock data:', error);
UIRenderer.showNotification(`Error loading mock data: ${error.message}.`, "error");
⋮----
async function initiateFreshDataLoad() {
UIRenderer.showNotification("Fetching latest pressure data...", "info", 2500);
⋮----
let sourceInfo = { type: 'unknown', fetchTimestamp: Date.now() };
⋮----
const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
⋮----
pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
⋮----
UIRenderer.showNotification(`Geolocation failed: ${geoError.message}. Using default.`, "warning", 4000);
⋮----
// Fallback to default coordinates or mock data
⋮----
pressureDataJson = await fetchPressureDataFromMock();
⋮----
pressureDataJson = await fetchPressureDataFromAPI(Config.DEFAULT_LATITUDE, Config.DEFAULT_LONGITUDE);
⋮----
UIRenderer.showNotification("Geolocation N/A. Using default coords for live data.", "warning", 4000);
⋮----
UIRenderer.showNotification("Live data failed or not enabled. Using mock as fallback.", "warning", 3000);
sourceInfo.type = 'mock-fallback'; pressureDataJson = await fetchPressureDataFromMock();
⋮----
sourceInfo.type = 'mock'; pressureDataJson = await fetchPressureDataFromMock();
⋮----
db.saveData(Config.CACHED_PRESSURE_DATA_KEY, { times: currentPressureHourlyTimes, values: currentPressureHourlyValues, sourceInfo: currentPressureDataSourceInfo });
⋮----
UIRenderer.showNotification("Failed to load any pressure data. Check console.", "error");
⋮----
function processAndDisplayPressureData(times, values) {
⋮----
UIRenderer.showNotification("No data to display.", "error");
⋮----
ChartManager.initializeChart(times, values, Config.THEMES, currentThemeId, applyTheme);
currentAutomatedEvents = PressureEventManager.detectAndStoreAutomatedPressureEvents(
⋮----
ChartManager.updateChartPlotBand // This is for initial detection, merge/unmerge have their own calls
⋮----
rerenderAutomatedEventsUI(); // Render initial table
⋮----
console.error("Error processing or displaying pressure data:", error);
UIRenderer.showNotification("Error initializing chart or processing events.", "error");
⋮----
function handleEventMigraineChange(eventId, selectElement) {
⋮----
db.saveData(Config.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
UIRenderer.showNotification("Migraine log cleared for event.", "info", 1500);
⋮----
eventMigraineLogs[eventId] = { severity: newSeverity, loggedAt: Date.now() };
⋮----
UIRenderer.showNotification(`Migraine as '${newSeverity}' logged for event.`, "success", 1500);
⋮----
// No need to rerender table just for this, select element already updated visually
⋮----
function rerenderAutomatedEventsUI() {
UIRenderer.renderAutomatedEventsTable(
⋮----
updateMergeUnmergeButtonStates // Pass the handler from app.js
⋮----
function handleAutomatedEventRowClick(eventId, clickedRowElement) {
⋮----
ChartManager.updateChartPlotBand(null);
if (clickedRowElement) clickedRowElement.classList.remove('highlighted-automated-event-row');
⋮----
const eventData = currentAutomatedEvents.find(e => e.id === eventId);
if (eventData) ChartManager.updateChartPlotBand({ startTime: eventData.startTime, endTime: eventData.endTime });
else ChartManager.updateChartPlotBand(null); // Should not happen if eventId is valid
⋮----
document.querySelectorAll(`#${Config.EVENTS_TABLE_BODY_ID} tbody tr.highlighted-automated-event-row`).forEach(row => row.classList.remove('highlighted-automated-event-row'));
if (clickedRowElement) clickedRowElement.classList.add('highlighted-automated-event-row');
⋮----
// This function will be passed to UIRenderer as the onCheckboxChange callback
function updateMergeUnmergeButtonStates() {
const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID)?.getElementsByTagName('tbody')[0];
⋮----
const selectedCheckboxes = Array.from(tableBody.querySelectorAll('tbody input[type="checkbox"]:checked'));
⋮----
const selectedEvent = currentAutomatedEvents.find(event => event.id === selectedEventId);
⋮----
UIRenderer.updateAutomatedEventActionButtonsState(numberOfSelected, isSingleSelectedEventMerged);
⋮----
function setupEventListeners() {
const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
⋮----
mergeBtn.addEventListener('click', createRipple);
mergeBtn.addEventListener('click', () => {
⋮----
const selectedEventIds = selectedCheckboxes.map(cb => cb.dataset.eventId);
⋮----
const result = PressureEventManager.handleMergeAutomatedEvents(
⋮----
currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
⋮----
// ChartManager.updateChartPlotBand(null); // Already called by PEManager if needed
⋮----
// Optional: highlight the new merged event
// if (result.newMergedEventId) {
//    currentlyHighlightedAutomatedEventId = result.newMergedEventId;
//    const newEvent = currentAutomatedEvents.find(e => e.id === result.newMergedEventId);
//    if (newEvent) ChartManager.updateChartPlotBand({ startTime: newEvent.startTime, endTime: newEvent.endTime });
// }
rerenderAutomatedEventsUI(); // This will also call updateMergeUnmergeButtonStates
⋮----
const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
⋮----
unmergeBtn.addEventListener('click', createRipple);
unmergeBtn.addEventListener('click', () => {
⋮----
const selectedCheckbox = tableBody.querySelector('tbody input[type="checkbox"]:checked'); // Should be only one
⋮----
const result = PressureEventManager.handleUnmergeAutomatedEvent(
⋮----
// DOMContentLoaded listener is the main entry point
document.addEventListener('DOMContentLoaded', () => {
registerServiceWorker();
setupEventListeners();
UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);
⋮----
// Load initial state
currentThemeId = db.loadData(Config.THEME_STORAGE_KEY) || Config.DEFAULT_THEME_ID;
eventMigraineLogs = db.loadData(Config.EVENT_MIGRAINE_LOGS_KEY) || {};
⋮----
const cachedData = db.loadData(Config.CACHED_PRESSURE_DATA_KEY);
⋮----
UIRenderer.showNotification("Displaying cached pressure data.", "info", 2000);
applyTheme(currentThemeId); // This will call processAndDisplayPressureData
⋮----
db.removeData(Config.CACHED_PRESSURE_DATA_KEY); // Clear potentially stale/incomplete cache
applyTheme(currentThemeId); // This will call initiateFreshDataLoad if data is empty
⋮----
// Initialize button states after first render attempt
updateMergeUnmergeButtonStates();
```

## File: js/chartManager.js
```javascript
// js/chartManager.js
import * as Config from './config.js'; // Assuming config.js exports constants like CHART_CONTAINER_ID
// Module-level variable to hold the chart instance
⋮----
const CHART_CONTAINER_ID = Config.CHART_CONTAINER_ID || 'pressureChart'; // Default if not in config
⋮----
// Default Highcharts styles that might not be covered by M3 variables directly
// or need explicit setting for Highcharts structure.
⋮----
backgroundColor: 'var(--m3-surface-container-low, #FFFBFE)', // Use M3 variable with fallback
⋮----
plotBorderColor: 'var(--m3-outline-variant, #C4C6C9)', // For the plot area border
⋮----
style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-title-medium-font-size, 16px)', fontWeight: 'var(--m3-title-medium-font-weight, 500)' } // M3 Title Medium
⋮----
style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-body-medium-font-size, 14px)' } // M3 Body Medium (often used for subtitles)
⋮----
labels: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-medium-font-size, 12px)' } }, // M3 Label Medium
⋮----
itemStyle: { color: 'var(--m3-on-surface, #1C1B1F)', cursor: 'pointer', fontSize: 'var(--m3-label-large-font-size, 14px)', fontWeight: 'var(--m3-label-large-font-weight, 500)' }, // M3 Label Large
⋮----
backgroundColor: 'rgba(255, 255, 255, 0.85)', // Slight transparency if floating
⋮----
shadow: false // M3 tends towards flatter component design unless elevated
⋮----
backgroundColor: 'var(--m3-inverse-surface, #313033)', // M3 Inverse Surface for Tooltips
⋮----
style: { color: 'var(--m3-inverse-on-surface, #F4EFF4)', fontSize: 'var(--m3-body-small-font-size, 12px)' } // M3 Body Small
⋮----
dataLabels: { style: { color: 'var(--m3-on-surface, #1C1B1F)', fontSize: '11px', fontWeight: '500', textOutline: 'none' } }, // No text outline for M3
⋮----
enabled: true, // Enable markers by default
⋮----
spline: { // Specific to spline type if used
⋮----
marker: { enabled: false } // Often markers are off for splines for cleaner look
⋮----
area: { // Specific to area type if used
⋮----
[0, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.4)'], // M3 Primary with opacity
⋮----
navigation: { // For burger menu (exporting, etc.)
⋮----
fill: 'transparent', // Button background
⋮----
menuStyle: { background: 'var(--m3-surface-container-low, #F7F2FA)', border: '1px solid var(--m3-outline, #79747E)', padding: '8px 0' }, // M3 Menu
menuItemStyle: { background: 'none', color: 'var(--m3-on-surface-variant, #49454F)', padding: '12px 16px', fontSize: 'var(--m3-body-medium-font-size, 14px)' }, // M3 List Item
menuItemHoverStyle: { background: 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.08)', color: 'var(--m3-on-surface-variant, #49454F)' } // M3 State Layer
⋮----
enabled: false // Disable "Highcharts.com" link
⋮----
colors: ['var(--m3-primary, #6750A4)', 'var(--m3-secondary, #625B71)', 'var(--m3-tertiary, #7D5260)', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'], // M3 primary, secondary, tertiary then defaults
⋮----
// UTC-4 hours (e.g., America/Toronto during EDT)
// timezoneOffset is in minutes. Positive values are west of UTC.
// 4 hours * 60 minutes/hour = 240 minutes
⋮----
// Highcharts.dateFormat will now respect the global timezoneOffset
return Highcharts.dateFormat('%e %b, %H:%M', this.value);
⋮----
return `<b>${Highcharts.dateFormat('%A, %b %e, %Y, %H:%M', this.x)}</b><br/>Pressure: ${this.y.toFixed(1)} hPa`;
⋮----
// Exporting menu configuration
⋮----
// Default menuItems - will be overridden in initializeChart if themes are present
⋮----
// Default plot options for the series
⋮----
duration: 750 // Smooth animation on load/update
⋮----
Highcharts.setOptions(HIGHCHARTS_EXPLICIT_DEFAULT_STYLES); // Apply visual defaults first
Highcharts.setOptions(BASE_HIGHCHARTS_OPTIONS); // Then apply functional base options
⋮----
export function initializeChart(times, pressures, availableThemes = [], activeThemeId = '', onThemeSelectedCallback = () => {}) {
const chartContainer = document.getElementById(CHART_CONTAINER_ID);
⋮----
console.error("Chart container div not found:", CHART_CONTAINER_ID);
⋮----
pressureChartInstance.destroy();
⋮----
console.warn("Minor error destroying previous chart instance:", e);
⋮----
const seriesData = times.map((time, index) => [time * 1000, pressures[index]]);
⋮----
// Theme switcher menu items for Highcharts exporting
const themeMenuItems = availableThemes.map(theme => ({
⋮----
onclick: function () { onThemeSelectedCallback(theme.id); },
⋮----
pressureChartInstance = Highcharts.chart(CHART_CONTAINER_ID, {
// Base options are now set globally via Highcharts.setOptions(),
// including the timezoneOffset.
// We only need to override/add specific things here.
⋮----
addCurrentTimePlotLine(this);
setInterval(() => addCurrentTimePlotLine(this), 60000);
⋮----
console.error("Error initializing Highcharts:", error);
⋮----
try { pressureChartInstance.destroy(); } catch (e) { /* ignore */ }
⋮----
export function addCurrentTimePlotLine(chartInstance) {
⋮----
chartInstance.xAxis[0].removePlotLine(CURRENT_TIME_PLOT_LINE_ID);
⋮----
const nowMs = new Date().getTime();
const xAxisExtremes = chartInstance.xAxis[0].getExtremes();
⋮----
// Note: nowMs is client's local time. If chart is in a different timezone due to timezoneOffset,
// this "Now" line will reflect the client's actual current time projected onto the chart's
// potentially shifted timeline. This is generally the desired behavior for a "Now" marker.
⋮----
chartInstance.xAxis[0].addPlotLine({
⋮----
export function updateChartPlotBand(eventData) {
⋮----
console.warn("Cannot update plot band: Chart instance not available.");
⋮----
pressureChartInstance.xAxis[0].removePlotBand(PLOT_BAND_ID);
⋮----
pressureChartInstance.xAxis[0].addPlotBand({
// Timestamps from eventData are assumed to be UTC epoch seconds,
// consistent with chart data. Highcharts will handle display
// according to its timezoneOffset.
⋮----
export function destroyChart() {
⋮----
console.error("Error destroying chart:", e);
⋮----
export function getChartInstance() {
```

## File: js/config.js
```javascript
// js/config.js
⋮----
// Feature flags
⋮----
// API Configuration
⋮----
// Mock Data Configuration
⋮----
// Chart Themes Configuration
⋮----
// Cached Data Configuration
⋮----
// Migraine Logging Configuration
⋮----
// Configuration for automated peak/valley detection
⋮----
// DOM Element IDs
⋮----
// Removed old migraine form/list IDs
// export const MIGRAINE_FORM_ID = 'migraineForm';
// export const MIGRAINE_START_TIME_ID = 'migraineStartTime';
// export const MIGRAINE_END_TIME_ID = 'migraineEndTime';
// export const MIGRAINE_LIST_ID = 'migraineList';
⋮----
// Plot Band ID for Highcharts
⋮----
// filename: js/config.js
```

## File: js/db.js
```javascript
// js/db.js - Simple localStorage wrapper as an ES6 module
⋮----
/**
     * Saves data to localStorage.
     * @param {string} key - The key under which to store the data.
     * @param {any} data - The data to store (will be JSON.stringified).
     */
⋮----
if (typeof key !== 'string' || key.trim() === '') {
console.error('Error saving data: Key must be a non-empty string.');
⋮----
localStorage.setItem(key, JSON.stringify(data));
⋮----
console.error(`Error saving data for key "${key}":`, error);
⋮----
/**
     * Loads data from localStorage.
     * @param {string} key - The key for the data to retrieve.
     * @returns {any|null} The parsed data, or null if not found or if parsing fails.
     */
⋮----
console.error('Error loading data: Key must be a non-empty string.');
⋮----
const dataString = localStorage.getItem(key);
⋮----
return JSON.parse(dataString);
⋮----
console.error(`Error loading or parsing data for key "${key}":`, error);
⋮----
/**
     * Removes data from localStorage.
     * @param {string} key - The key for the data to remove.
     */
⋮----
console.error('Error removing data: Key must be a non-empty string.');
⋮----
localStorage.removeItem(key);
⋮----
console.error(`Error removing data for key "${key}":`, error);
⋮----
export default db; // <<< MAKE ABSOLUTELY SURE THIS LINE IS PRESENT AND CORRECT
```

## File: js/pressureEventManager.js
```javascript
// js/pressureEventManager.js
⋮----
EVENTS_TABLE_BODY_ID // Used for type checking, not direct DOM manipulation here
⋮----
let hourlyTimesCache = []; // Stores the 'time' array from pressure data
let hourlyPressuresCache = []; // Stores the 'surface_pressure' array from pressure data
⋮----
// Note: showNotification and updateChartPlotBand will be passed in from app.js
⋮----
/**
 * Assigns a severity score based on the absolute rate of pressure change.
 * @param {number} absoluteRateOfChange - The absolute rate of pressure change in hPa/hour.
 * @returns {string} The severity score ('Low', 'Medium', 'High').
 */
function getSeverityScore(absoluteRateOfChange) {
if (absoluteRateOfChange >= 0.8) return 'High'; // Example threshold
if (absoluteRateOfChange >= 0.4) return 'Medium'; // Example threshold
⋮----
/**
 * Calculates rate of change and severity for an event object.
 * Modifies the event object in place.
 * @param {object} event - The event object.
 */
function calculateRateAndSeverity(event) {
⋮----
event.rateOfChange = parseFloat((event.pressureChange / event.durationHours).toFixed(2)); // Signed rate
const absoluteRate = Math.abs(event.rateOfChange);
event.severity = getSeverityScore(absoluteRate);
⋮----
export function detectAndStoreAutomatedPressureEvents(times, pressures, showNotification, updateChartPlotBand) {
allAutomatedEvents = []; // Reset
hourlyTimesCache = [...times]; // Cache for merge/unmerge operations
hourlyPressuresCache = [...pressures]; // Cache for merge/unmerge operations
⋮----
console.error("Insufficient or invalid data for event detection in pressureEventManager.");
showNotification("Error: Cannot detect events due to invalid pressure data.", "error");
⋮----
showNotification("Not enough data points to detect pressure events.", "info");
⋮----
let ongoingEventType = null; // 'rise' or 'fall'
⋮----
// Trend changed, finalize previous event if significant
⋮----
const pChange = parseFloat((endP - startP).toFixed(1));
⋮----
if (durationHrs >= MIN_DURATION_HOURS && Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
⋮----
id: eventStartTime.toString() + '-' + ongoingEventType, // Simple ID
⋮----
durationHours: parseFloat(durationHrs.toFixed(1)),
⋮----
calculateRateAndSeverity(newEvent); // Calculate and add rate/severity
allAutomatedEvents.push(newEvent);
⋮----
// Start new event segment
⋮----
ongoingEventType = currentTrend === null && ongoingEventType !== null ? ongoingEventType : currentTrend; // Persist trend if current is flat
if (i === 1 && ongoingEventType === null && pressures[i] !== pressures[0]) { // Handle start
⋮----
// Finalize any ongoing event at the end of the data
⋮----
id: eventStartTime.toString() + '-' + ongoingEventType + '-final',
⋮----
calculateRateAndSeverity(newEvent);
⋮----
allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);
// console.log("Detected automated events:", allAutomatedEvents);
⋮----
showNotification(`${allAutomatedEvents.length} automated pressure events detected.`, "info", 2000);
⋮----
showNotification("No significant automated pressure events detected.", "info", 2000);
⋮----
export function getAllAutomatedEvents() {
return [...allAutomatedEvents]; // Return a copy
⋮----
export function handleMergeAutomatedEvents(selectedEventIds, showNotification, updateChartPlotBand, getCurrentlyHighlightedEventId) {
⋮----
showNotification("Please select at least two automated events to merge.", "error");
⋮----
.filter(event => selectedEventIds.includes(event.id))
.sort((a, b) => a.startTime - b.startTime);
⋮----
showNotification("Error: Some selected events for merging were not found.", "error");
⋮----
if (eventsToMergeDetails.some(e => e.isMerged)) {
showNotification("Cannot merge: one or more selected events are already merged events. Please unmerge them first if needed.", "error");
⋮----
const mergedId = Date.now().toString() + '-merged';
⋮----
const startIdx = hourlyTimesCache.indexOf(mergedStartTime);
const endIdx = hourlyTimesCache.indexOf(mergedEndTime);
⋮----
mergedPChange = parseFloat((mergedEndP - mergedStartP).toFixed(1));
⋮----
console.warn("Could not find exact start/end pressures for merged event in hourly data. Pressure change will be N/A.");
showNotification("Warning: Pressure values for merged event boundaries not found in source data.", "warning", 4000);
⋮----
const mergedDurHrs = parseFloat((mergedDurSecs / 3600).toFixed(1));
⋮----
const originalEventsData = eventsToMergeDetails.map(e => JSON.parse(JSON.stringify(e))); // Deep copy
⋮----
calculateRateAndSeverity(mergedEvent);
⋮----
// Update event list
allAutomatedEvents = allAutomatedEvents.filter(event => !selectedEventIds.includes(event.id));
allAutomatedEvents.push(mergedEvent);
⋮----
// Handle highlight
const currentlyHighlightedId = getCurrentlyHighlightedEventId();
if (selectedEventIds.includes(currentlyHighlightedId)) {
updateChartPlotBand(null); // Clear plot band from chart
highlightNeedsClear = true; // Signal app.js to clear its state
⋮----
showNotification("Automated events merged successfully!", "success");
⋮----
export function handleUnmergeAutomatedEvent(eventIdToUnmerge, showNotification, updateChartPlotBand, getCurrentlyHighlightedEventId) {
⋮----
const eventToUnmerge = allAutomatedEvents.find(event => event.id === eventIdToUnmerge);
⋮----
showNotification("Error: Event to unmerge not found.", "error");
⋮----
showNotification("Selected event is not a merged event or has no original data to restore.", "error");
⋮----
// Remove the merged event
allAutomatedEvents = allAutomatedEvents.filter(event => event.id !== eventIdToUnmerge);
⋮----
// Add back the original events (deep copies)
eventToUnmerge.originalEventsData.forEach(originalEvent => {
allAutomatedEvents.push(JSON.parse(JSON.stringify(originalEvent)));
⋮----
if (getCurrentlyHighlightedEventId() === eventIdToUnmerge) {
⋮----
showNotification("Event unmerged successfully!", "success");
```

## File: js/uiRenderer.js
```javascript
// js/uiRenderer.js
import { formatUnixTimestamp, createRipple } from './utils.js'; // Assuming utils.js exports these
⋮----
NOTIFICATION_AREA_ID // Added NOTIFICATION_AREA_ID to imports
⋮----
let currentOnRowClickHandler = null; // Store the handler for row clicks
⋮----
export function setCurrentHighlightHandler(handler) {
⋮----
export function renderAutomatedEventsTable(
⋮----
currentEventMigraineLogs, // Pass all current logs
onEventMigraineChangeAppCallback, // Callback to app.js for select change
onCheckboxChangeAppCallback // Callback to app.js for checkbox state change
⋮----
const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
⋮----
console.error("Events table element not found:", EVENTS_TABLE_BODY_ID);
⋮----
const tableBody = tableElement.getElementsByTagName('tbody')[0];
⋮----
console.error("Events table body (tbody) not found.");
⋮----
tableBody.innerHTML = ''; // Clear existing rows
⋮----
const row = tableBody.insertRow();
const cell = row.insertCell();
cell.colSpan = 9; // Adjusted for new column count
⋮----
eventsToRender.forEach(event => {
⋮----
row.classList.add('merged-event-row'); // Optional: for styling merged rows
⋮----
// Click handler for highlighting, excluding checkbox and select
row.addEventListener('click', (e) => {
⋮----
if (currentOnRowClickHandler) currentOnRowClickHandler(event.id, row);
⋮----
const cellSelect = row.insertCell();
const checkbox = document.createElement('input');
⋮----
checkbox.classList.add('m3-table-checkbox'); // For M3 styling if needed
checkbox.addEventListener('change', () => onCheckboxChangeAppCallback()); // Notify app.js
cellSelect.appendChild(checkbox);
⋮----
row.insertCell().textContent = formatUnixTimestamp(event.startTime);
row.insertCell().textContent = formatUnixTimestamp(event.endTime);
row.insertCell().textContent = event.durationHours.toFixed(1);
row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';
⋮----
let typeDisplay = event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'N/A';
⋮----
row.insertCell().textContent = typeDisplay;
⋮----
row.insertCell().textContent = (typeof event.rateOfChange === 'number') ? event.rateOfChange.toFixed(2) : 'N/A';
const severityCell = row.insertCell();
⋮----
severityCell.classList.add(`severity-${(event.severity).toLowerCase()}`);
⋮----
// Migraine Log Dropdown Cell
const migraineLogCell = row.insertCell();
migraineLogCell.classList.add('migraine-log-cell');
const selectMigraine = document.createElement('select');
selectMigraine.classList.add('m3-table-select');
selectMigraine.dataset.eventId = event.id; // For easy access
⋮----
const defaultOption = document.createElement('option');
⋮----
selectMigraine.appendChild(defaultOption);
⋮----
MIGRAINE_SEVERITIES.forEach(severity => {
const option = document.createElement('option');
option.value = severity.toLowerCase();
⋮----
selectMigraine.appendChild(option);
⋮----
selectMigraine.value = loggedMigraine.severity.toLowerCase();
⋮----
selectMigraine.addEventListener('change', (e) => {
onEventMigraineChangeAppCallback(event.id, e.target);
⋮----
migraineLogCell.appendChild(selectMigraine);
⋮----
// Highlight if current or selected
const nowUnix = Math.floor(Date.now() / 1000);
if (nowUnix >= event.startTime && nowUnix <= event.endTime && !event.isMerged) row.classList.add('current-event');
if (event.id === currentlyHighlightedEventId) row.classList.add('highlighted-automated-event-row');
⋮----
// Initial call to set button states based on rendered table (likely no checkboxes checked yet)
onCheckboxChangeAppCallback();
⋮----
export function updateAutomatedEventActionButtonsState(numberOfSelectedItems, isSingleSelectedEventAMergedOne) {
const mergeBtn = document.getElementById(MERGE_EVENTS_BTN_ID);
const unmergeBtn = document.getElementById(UNMERGE_EVENT_BTN_ID);
⋮----
mergeBtn.textContent = 'Merge Selected'; // Simplified text
⋮----
console.warn(`Button with ID ${MERGE_EVENTS_BTN_ID} not found.`);
⋮----
console.warn(`Button with ID ${UNMERGE_EVENT_BTN_ID} not found.`);
⋮----
// Notification function, can be moved to utils if not already there and just imported
export function showNotification(message, type = 'info', duration = 3000) {
// Corrected to use imported NOTIFICATION_AREA_ID directly
const notificationArea = document.getElementById(NOTIFICATION_AREA_ID || 'notification-area');
⋮----
console.warn('Notification area not found in DOM for message:', message);
⋮----
const notification = document.createElement('div');
notification.classList.add('m3-notification', type); // Ensure 'm3-notification' is a base class
⋮----
notificationArea.appendChild(notification);
// Trigger animation
requestAnimationFrame(() => {
notification.classList.add('show');
⋮----
setTimeout(() => {
notification.classList.remove('show');
notification.addEventListener('transitionend', () => {
if (notification.parentElement === notificationArea) { // Check if still child
notificationArea.removeChild(notification);
```

## File: js/utils.js
```javascript
// js/utils.js
⋮----
/**
 * Formats a Unix timestamp (seconds) into "Month Day, Hour AM/PM" string.
 * e.g., "May 12, 12 AM" or "May 12, 3 PM"
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {string} The formatted date string.
 */
export function formatUnixTimestamp(unixTimestamp) {
const date = new Date(unixTimestamp * 1000);
⋮----
const month = monthNames[date.getMonth()];
const day = date.getDate();
let hours = date.getHours();
⋮----
hours = hours ? hours : 12; // the hour '0' should be '12'
⋮----
export function showNotification(message, type = 'info', duration = 3000) {
const notificationArea = document.getElementById(NOTIFICATION_AREA_ID);
⋮----
console.warn('Notification area not found in DOM.');
⋮----
const notification = document.createElement('div');
notification.classList.add('m3-notification', type);
⋮----
notificationArea.appendChild(notification);
requestAnimationFrame(() => {
notification.classList.add('show');
⋮----
setTimeout(() => {
notification.classList.remove('show');
⋮----
notificationArea.removeChild(notification);
⋮----
export function createRipple(event) {
⋮----
if (getComputedStyle(button).position === 'static') {
⋮----
const ripple = document.createElement('span');
const rect = button.getBoundingClientRect();
const size = Math.max(rect.width, rect.height);
⋮----
ripple.classList.add('m3-ripple');
const existingRipple = button.querySelector('.m3-ripple');
if (existingRipple) existingRipple.remove();
button.appendChild(ripple);
⋮----
// filename: js/utils.js
```

## File: manifest.json
```json
{
    "name": "Pressure & Migraine Tracker",
    "short_name": "PressureTrack",
    "description": "Tracks surface pressure and helps correlate migraine events. Uses live location for data.",
    "start_url": ".",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#6750A4",
    "icons": [
        {
            "src": "icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

## File: mock_pressure_data.json
```json
{
   "latitude":0.0,
   "longitude":0.0,
   "generationtime_ms":0.052094459533691406,
   "utc_offset_seconds":-14400,
   "timezone":"America/Toronto",
   "timezone_abbreviation":"GMT-4",
   "elevation":176.0,
   "current_units":{
      "time":"unixtime",
      "interval":"seconds",
      "surface_pressure":"hPa"
   },
   "current":{
      "time":1747146600,
      "interval":900,
      "surface_pressure":996.5
   },
   "hourly_units":{
      "time":"unixtime",
      "surface_pressure":"hPa"
   },
   "hourly":{
      "time":[
         1747022400,
         1747026000,
         1747029600,
         1747033200,
         1747036800,
         1747040400,
         1747044000,
         1747047600,
         1747051200,
         1747054800,
         1747058400,
         1747062000,
         1747065600,
         1747069200,
         1747072800,
         1747076400,
         1747080000,
         1747083600,
         1747087200,
         1747090800,
         1747094400,
         1747098000,
         1747101600,
         1747105200,
         1747108800,
         1747112400,
         1747116000,
         1747119600,
         1747123200,
         1747126800,
         1747130400,
         1747134000,
         1747137600,
         1747141200,
         1747144800,
         1747148400,
         1747152000,
         1747155600,
         1747159200,
         1747162800,
         1747166400,
         1747170000,
         1747173600,
         1747177200,
         1747180800,
         1747184400,
         1747188000,
         1747191600,
         1747195200,
         1747198800,
         1747202400,
         1747206000,
         1747209600,
         1747213200,
         1747216800,
         1747220400,
         1747224000,
         1747227600,
         1747231200,
         1747234800,
         1747238400,
         1747242000,
         1747245600,
         1747249200,
         1747252800,
         1747256400,
         1747260000,
         1747263600,
         1747267200,
         1747270800,
         1747274400,
         1747278000,
         1747281600,
         1747285200,
         1747288800,
         1747292400,
         1747296000,
         1747299600,
         1747303200,
         1747306800,
         1747310400,
         1747314000,
         1747317600,
         1747321200,
         1747324800,
         1747328400,
         1747332000,
         1747335600,
         1747339200,
         1747342800,
         1747346400,
         1747350000,
         1747353600,
         1747357200,
         1747360800,
         1747364400,
         1747368000,
         1747371600,
         1747375200,
         1747378800,
         1747382400,
         1747386000,
         1747389600,
         1747393200,
         1747396800,
         1747400400,
         1747404000,
         1747407600,
         1747411200,
         1747414800,
         1747418400,
         1747422000,
         1747425600,
         1747429200,
         1747432800,
         1747436400,
         1747440000,
         1747443600,
         1747447200,
         1747450800,
         1747454400,
         1747458000,
         1747461600,
         1747465200,
         1747468800,
         1747472400,
         1747476000,
         1747479600,
         1747483200,
         1747486800,
         1747490400,
         1747494000,
         1747497600,
         1747501200,
         1747504800,
         1747508400,
         1747512000,
         1747515600,
         1747519200,
         1747522800,
         1747526400,
         1747530000,
         1747533600,
         1747537200,
         1747540800,
         1747544400,
         1747548000,
         1747551600,
         1747555200,
         1747558800,
         1747562400,
         1747566000,
         1747569600,
         1747573200,
         1747576800,
         1747580400,
         1747584000,
         1747587600,
         1747591200,
         1747594800,
         1747598400,
         1747602000,
         1747605600,
         1747609200,
         1747612800,
         1747616400,
         1747620000,
         1747623600,
         1747627200,
         1747630800,
         1747634400,
         1747638000,
         1747641600,
         1747645200,
         1747648800,
         1747652400,
         1747656000,
         1747659600,
         1747663200,
         1747666800,
         1747670400,
         1747674000,
         1747677600,
         1747681200,
         1747684800,
         1747688400,
         1747692000,
         1747695600,
         1747699200,
         1747702800,
         1747706400,
         1747710000
      ],
      "surface_pressure":[
         1003.3,
         1003.1,
         1002.5,
         1001.8,
         1001.7,
         1001.3,
         1001.0,
         1001.3,
         1001.8,
         1002.0,
         1001.9,
         1001.6,
         1001.5,
         1000.7,
         999.9,
         999.3,
         998.7,
         997.8,
         997.2,
         996.6,
         996.8,
         996.3,
         996.7,
         996.4,
         996.5,
         996.3,
         996.1,
         995.8,
         996.0,
         995.7,
         995.5,
         996.0,
         996.8,
         996.9,
         996.2,
         996.9,
         996.3,
         995.7,
         995.5,
         995.2,
         995.0,
         994.3,
         994.4,
         994.6,
         994.2,
         993.6,
         993.5,
         993.4,
         993.4,
         992.9,
         992.4,
         992.1,
         991.9,
         992.0,
         991.9,
         992.3,
         992.5,
         992.5,
         992.2,
         992.0,
         991.8,
         991.4,
         991.0,
         990.8,
         990.5,
         990.1,
         989.9,
         989.9,
         989.8,
         989.4,
         988.9,
         988.9,
         988.9,
         988.3,
         987.9,
         989.7,
         989.4,
         989.4,
         989.4,
         989.6,
         989.8,
         989.8,
         989.7,
         989.6,
         989.3,
         988.8,
         988.5,
         988.1,
         987.3,
         987.0,
         986.5,
         986.2,
         986.2,
         986.1,
         985.9,
         985.3,
         985.5,
         984.7,
         984.3,
         984.1,
         983.4,
         983.0,
         983.7,
         982.3,
         982.8,
         983.0,
         982.9,
         983.2,
         983.6,
         983.3,
         982.8,
         983.1,
         983.4,
         983.4,
         983.8,
         983.9,
         983.8,
         983.6,
         983.6,
         983.4,
         982.4,
         981.7,
         981.9,
         981.7,
         980.6,
         979.3,
         978.2,
         977.4,
         977.5,
         976.4,
         975.6,
         975.5,
         974.7,
         974.9,
         974.4,
         975.6,
         975.7,
         976.3,
         977.8,
         978.6,
         979.1,
         979.6,
         979.5,
         979.6,
         979.9,
         979.5,
         979.2,
         979.1,
         979.1,
         979.1,
         979.3,
         979.5,
         979.7,
         979.9,
         980.0,
         980.2,
         980.6,
         981.1,
         981.6,
         982.1,
         982.6,
         983.1,
         983.6,
         984.0,
         984.4,
         984.9,
         985.3,
         985.8,
         986.2,
         986.4,
         986.8,
         987.0,
         987.2,
         987.7,
         988.4,
         989.3,
         990.2,
         990.6,
         990.9,
         991.2,
         991.5,
         991.9,
         992.2,
         992.6,
         993.0,
         993.5,
         993.9,
         994.2,
         994.6,
         995.0,
         995.4,
         995.6
      ]
   }
}
```

## File: README.md
```markdown
# Migraine Barometer

Migraine Barometer is a Progressive Web Application (PWA) designed to help users track local barometric pressure changes and understand their potential correlation with migraine occurrences. The app automatically detects significant pressure events, which can be visualized on a chart. Users can log their migraine events to observe potential correlations.

This project is hosted on GitHub Pages: [Visit Migraine Barometer](https://owaisilyasgh.github.io/Migraine-Barometer/) <!-- Update this link if it's your fork/deployment -->

## Features

*   **Barometric Pressure Display:** Shows current and historical surface pressure data using the Highcharts library for a pre-set location (mock data used in this version).
*   **Automated Pressure Event Detection:** Identifies significant pressure changes (rises, falls, ongoing trends) from the data and lists them in a table.
    *   **Event Highlighting:** Clicking on a detected event in the table highlights the corresponding time range on the pressure chart for easier visual correlation.
    *   **Merge/Unmerge Events:** Users can select two detected automated events and merge them into a single, combined event. Merged events can also be unmerged back into their original components. This is useful for custom grouping.
*   **PWA:** Installable on compatible devices for an app-like experience and offline access to the basic app shell and cached data (though data updates require an internet connection).
*   **Migraine Logging:** Allows users to log migraine events with start and end times.

## How It Works

1.  **Data Loading:** The app loads hourly surface pressure data (from `mock_pressure_data.json` in this version).
2.  **Charting:** Pressure data is visualized using the Highcharts library.
3.  **Automated Event Detection:** The system analyzes the pressure data to find periods of significant rise or fall. These are displayed in a table.
4.  **Event Interaction:**
    *   Clicking an event row in the table highlights the event's duration on the chart using a plot band.
    *   Users can select two events from the "Detected Pressure Events (Automated)" table and merge them. The system calculates the combined duration and overall pressure change. A merged event can be selected and unmerged to revert to its original constituent events.
5.  **Migraine Logging:** Users can log their migraine events, providing start/end times. This data is stored locally in the browser's `localStorage`.
6.  **Correlation (Manual):** Users can visually compare their logged migraines with the charted pressure data and the list of automatically detected (and potentially merged/unmerged) pressure events.

## Technical Details

*   **Frontend:** HTML, CSS, JavaScript.
*   **JavaScript Structure:** Organized into ES6 modules located in the `js/` directory, promoting better code organization and maintainability.
*   **PWA:** Service Worker for basic caching and offline capabilities, Web App Manifest.
*   **Charting:** [Highcharts](https://www.highcharts.com/) library for displaying pressure data and highlighting event ranges.
*   **Data Storage:**
    *   `localStorage` for migraine logs.
    *   Automated pressure events (including their merged/unmerged states) are managed in JavaScript memory and are session-specific (not persisted between page loads).
*   **Mock Data:** Uses `mock_pressure_data.json` for barometric pressure data. In a real application, this would typically come from a weather API.

## Setup and Usage

**Running Locally (Crucial):**

1.  Clone or download the repository.
2.  **You MUST serve the files through a local web server.** Due to the use of ES6 JavaScript modules, directly opening the `index.html` file from your local file system (e.g., `file:///...`) **will not work**.
    *   **Recommended Servers:**
        *   If you have Node.js and npm: `npx live-server` in the project's root directory.
        *   If you have Python 3: `python -m http.server` in the project's root directory.
3.  Open your browser and navigate to the local server address (e.g., `http://localhost:8080`, `http://localhost:3000`, or `http://localhost:8000` depending on the server).

**Project Structure Overview:**
*   `index.html`: The main HTML file.
*   `style.css`: Styles for the application.
*   `manifest.json`: Web App Manifest for PWA properties.
*   `sw.js`: Service Worker file (ensure this is present in your root if you intend for PWA offline capabilities to function beyond basic app shell caching).
*   `mock_pressure_data.json`: Sample pressure data.
*   `js/`: Directory containing the JavaScript modules:
    *   `app.js`: Main application logic and coordinator.
    *   `chartManager.js`: Manages Highcharts interactions.
    *   `pressureEventManager.js`: Handles detection and manipulation of pressure events.
    *   `uiRenderer.js`: Manages DOM updates and UI rendering.
    *   `db.js`: localStorage interaction for migraines.
    *   `config.js`: Application constants.
    *   `utils.js`: Utility functions.
*   `icons/`: (You may need to create this folder and add PWA icons as specified in `manifest.json`).

**Deployment:**

This app can be deployed on platforms like GitHub Pages or any static site hosting service. Ensure the server serves files correctly, especially for ES6 module loading.

## Future Considerations / Potential Improvements

*   User-configurable location and live API data fetching for pressure data.
*   Persistence for merged/unmerged states of automated events (e.g., using `localStorage` or a backend).
*   More sophisticated algorithm for automated event detection.
*   Data export/import functionality for migraine logs.
*   Notifications for specific pressure patterns (if desired).
*   Enhanced PWA features, including more robust offline data access for pressure events.

## Attribution

*   Charting library: [Highcharts](https://www.highcharts.com/)
*   Mock weather data format based on [Open-Meteo.com](https://open-meteo.com/). If using their live API, please respect their terms of service.

---
*Disclaimer: This application is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*
```

## File: style.css
```css
/* style.css */
/* M3 Color Palette (Light Theme - Primary Purple) */
:root {
⋮----
/* Primary */
⋮----
--m3-primary-rgb: 103, 80, 164; /* For RGBA usage */
⋮----
/* Secondary */
⋮----
/* Tertiary */
⋮----
/* Error */
⋮----
/* Surface */
⋮----
--m3-on-surface-rgb: 28, 27, 31; /* For RGBA usage */
⋮----
--m3-on-surface-variant-rgb: 73, 69, 79; /* For RGBA usage with select arrow */
⋮----
/* Inverse Surface (for snackbars, etc.) */
⋮----
/* Outline */
⋮----
/* Scrim */
⋮----
/* Shadow */
⋮----
/* Typography */
⋮----
/* M3 Type Scale reference (use these for consistency) */
/* Display */
⋮----
/* Headline */
⋮----
/* Title */
⋮----
--m3-title-large-font-weight: 500; /* Note: M3 uses 400 for Title Large, but 500 is common for emphasis */
⋮----
/* Label */
⋮----
/* Body */
⋮----
--m3-body-large-letter-spacing: 0.5px; /* Or 0.15px if less spacing is desired */
⋮----
/* Shape */
⋮----
--m3-shape-corner-full: 50%; /* Or large value like 999px for pills */
⋮----
/* Elevation - using simplified box-shadows for web */
⋮----
/* Global M3 Body Styles */
.m3-body {
⋮----
/* Top App Bar */
.m3-top-app-bar {
⋮----
background-color: var(--m3-surface-container-low); /* Or var(--m3-primary) for colored bar */
color: var(--m3-on-surface-variant); /* Or var(--m3-on-primary) if colored */
padding: 8px 16px; /* M3 Compact Top App Bar often uses 64px height, centered title */
⋮----
box-shadow: var(--m3-elevation-0); /* Typically no shadow if content scrolls under */
⋮----
.m3-top-app-bar__title {
⋮----
/* Main Content Area */
.m3-main-content {
⋮----
gap: 24px; /* Spacing between sections/cards */
⋮----
/* Card Styles */
.m3-card {
⋮----
border-radius: var(--m3-shape-corner-md); /* 12px */
⋮----
overflow: hidden; /* If content might overflow rounded corners */
⋮----
.m3-card__title {
⋮----
margin-top: 0; /* Remove default h2 margin if needed */
margin-bottom: 16px; /* Space below title */
⋮----
/* Button Styles */
.m3-button {
⋮----
padding: 10px 24px; /* M3 Buttons Height 40dp */
border-radius: var(--m3-shape-corner-full); /* Pill shape */
⋮----
display: inline-flex; /* For icon alignment if any */
⋮----
position: relative; /* For ripple */
overflow: hidden; /* For ripple */
⋮----
/* General cursor for all disabled buttons */
.m3-button:disabled, .m3-button[disabled] {
⋮----
box-shadow: none !important; /* Remove any active/hover shadows */
⋮----
/* Filled Button */
.m3-button-filled {
.m3-button-filled:not(:disabled):hover {
⋮----
background-color: color-mix(in srgb, var(--m3-primary) 92%, var(--m3-on-primary) 8%); /* M3 Hover state layer */
⋮----
.m3-button-filled:disabled,
.m3-button-filled:disabled:hover,
⋮----
background-color: rgba(var(--m3-on-surface-rgb), 0.12); /* No change on hover when disabled */
⋮----
/* Outlined Button */
.m3-button-outlined {
⋮----
padding: 10px 23px; /* Adjust padding because of border */
⋮----
.m3-button-outlined:not(:disabled):hover {
⋮----
background-color: rgba(var(--m3-primary-rgb), 0.08); /* M3 Hover state layer for outlined */
⋮----
.m3-button-outlined:disabled,
.m3-button-outlined:disabled:hover,
⋮----
background-color: transparent; /* No change on hover when disabled */
⋮----
/* Text Button */
.m3-button-text {
⋮----
padding: 10px 12px; /* Text buttons have less horizontal padding */
⋮----
.m3-button-text:not(:disabled):hover {
⋮----
background-color: rgba(var(--m3-primary-rgb), 0.08); /* M3 Hover state layer for text */
⋮----
.m3-button-text:disabled,
.m3-button-text:disabled:hover,
⋮----
.m3-button-group {
⋮----
gap: 8px; /* Spacing between buttons in a group */
⋮----
/* Ripple Effect */
.m3-ripple {
⋮----
background-color: currentColor; /* Use button's text color for ripple */
opacity: 0.2; /* Ripple opacity */
⋮----
/* Table Styles */
.m3-table-container {
⋮----
overflow-x: auto; /* Allow horizontal scrolling for tables on small screens */
⋮----
.m3-table {
⋮----
background-color: var(--m3-surface-container-lowest); /* Or --m3-surface */
⋮----
.m3-table th, .m3-table td {
⋮----
padding: 12px 16px; /* M3 Table Cell Padding */
⋮----
.m3-table th {
⋮----
font-weight: var(--m3-label-large-font-weight); /* M3 uses Body Medium or Label Large for headers */
⋮----
background-color: var(--m3-surface-container-low); /* Slight distinction for header */
border-bottom: 1px solid var(--m3-outline); /* Stronger line under header */
⋮----
.m3-table td {
⋮----
.m3-table tbody tr:last-child td {
⋮----
border-bottom: none; /* Remove border from last row */
⋮----
.m3-table tbody tr:hover td { /* M3 Row Hover State */
⋮----
background-color: rgba(var(--m3-on-surface-rgb), 0.04); /* On Surface with 4% opacity */
⋮----
.m3-table td input[type="checkbox"] {
⋮----
accent-color: var(--m3-primary); /* Style checkbox color */
⋮----
.m3-table .severity-low { color: var(--m3-primary); }
.m3-table .severity-medium { color: #FF8C00; } /* Consider using a semantic M3 color if available */
.m3-table .severity-high { color: var(--m3-error); }
⋮----
/* Migraine Log Elements in Table */
.migraine-log-cell {
⋮----
.migraine-log-cell .m3-button, .migraine-log-cell .m3-table-select {
⋮----
margin: 0; /* Remove default margins if any */
height: 36px; /* Slightly smaller for table context */
⋮----
.migraine-log-cell .m3-button.danger-btn {
.migraine-log-cell .m3-button.danger-btn:not(:disabled):hover {
⋮----
.m3-table-select {
⋮----
border-radius: var(--m3-shape-corner-xs); /* 4px */
padding: 8px 32px 8px 12px; /* Right padding for arrow */
font-size: var(--m3-body-medium-font-size); /* 14px */
⋮----
/* SVG arrow, color uses --m3-on-surface-variant. Hex: #49454F, URL-encoded: %2349454F */
⋮----
min-width: 120px; /* Ensure it's not too small */
⋮----
height: 40px; /* Consistent height */
line-height: normal; /* Reset line-height that might be inherited */
⋮----
.m3-table-select:focus {
⋮----
outline: 2px solid transparent; /* Remove default, could add M3 focus ring if complex */
box-shadow: 0 0 0 2px var(--m3-primary); /* Simple focus ring */
⋮----
.m3-table-select option {
⋮----
background-color: var(--m3-surface-container-lowest); /* Or another appropriate M3 surface for dropdown menu */
⋮----
/* Notification Area (Snackbar Container) */
.m3-snackbar-container {
⋮----
bottom: 16px; /* M3 recommends 8dp from edge, but more can be acceptable */
⋮----
gap: 8px; /* Spacing between multiple snackbars */
width: fit-content; /* Ensure it doesn't stretch full width unnecessarily */
⋮----
.m3-notification {
⋮----
min-width: 288px; /* M3 min width */
max-width: 568px; /* M3 max width */
margin-top: 8px; /* Only if multiple, else handled by gap in container */
⋮----
pointer-events: none; /* Initially not interactive */
⋮----
.m3-notification.show {
⋮----
pointer-events: auto; /* Interactive when shown */
⋮----
.m3-notification.success { background-color: #4CAF50; color: white; } /* Custom, consider M3 semantic colors if available */
.m3-notification.error { background-color: var(--m3-error); color: var(--m3-on-error); }
.m3-notification.info { background-color: #2196F3; color: white; } /* Custom */
.m3-notification.warning { background-color: #FF9800; color: black; } /* Custom, ensure contrast */
⋮----
/* Footer */
.m3-footer {
⋮----
margin-top: auto; /* Pushes footer to bottom if main content is short */
⋮----
/* Highcharts specific overrides for M3 */
.highcharts-title, .highcharts-subtitle, .highcharts-axis-title, .highcharts-axis-labels, .highcharts-legend-item text, .highcharts-tooltip text {
.highcharts-credits { display: none !important; }
⋮----
/* Chart Container */
.chart-container {
⋮----
height: 400px; /* Or as needed */
⋮----
overflow: hidden; /* Ensure chart respects border radius */
⋮----
.large-chart-container { height: 390px; } /* If you need a larger default for main chart */
⋮----
/* Styles for automated event controls */
.automated-events-controls {
⋮----
margin-bottom: 16px; /* Space between controls and table */
⋮----
/* Table row highlighting */
#pressureEventsTable tbody tr.highlighted-automated-event-row {
⋮----
background-color: rgba(var(--m3-primary-rgb), 0.12) !important; /* M3 Selected state layer (Primary with 12% opacity), use !important to override hover if necessary */
⋮----
/* Ensure normal hover is less prominent than selection */
#pressureEventsTable tbody tr:not(.highlighted-automated-event-row):hover td {
⋮----
#pressureEventsTable tbody tr.current-event td {
⋮----
/* Example: A subtle indicator for current events */
/* You could add a border, a dot, or slightly different background */
/* box-shadow: inset 3px 0 0 var(--m3-secondary); */ /* Example: inner left border */
font-weight: 500; /* Make text slightly bolder */
⋮----
.migraine-log-cell > div { /* For the button container generated in app.js */
⋮----
gap: 4px; /* Small gap between buttons */
⋮----
/* Ensure HTML and BODY take full height for footer behavior */
html, body {
body > .m3-main-content {
```

## File: sw.js
```javascript
// sw.js
const CACHE_NAME = 'pressure-tracker-cache-v1.2'; // Increment version for updates
⋮----
'/', // Alias for index.html
⋮----
'mock_pressure_data.json', // Important for offline mock data mode
⋮----
// Add paths to your icons here if you have them locally.
// e.g., 'icons/icon-192x192.png', 'icons/icon-512x512.png'
// For now, these are not cached as they are not provided.
// The Highcharts library is loaded from a CDN and is not cached by this SW by default.
⋮----
// Install service worker and cache essential app assets
self.addEventListener('install', event => {
console.log('[ServiceWorker] Install');
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
console.log('[ServiceWorker] Pre-caching offline page');
return cache.addAll(FILES_TO_CACHE);
⋮----
.catch(error => {
console.error('[ServiceWorker] Cache addAll failed:', error);
⋮----
self.skipWaiting(); // Force the waiting service worker to become the active service worker.
⋮----
// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
console.log('[ServiceWorker] Activate');
⋮----
caches.keys().then(keyList => {
return Promise.all(keyList.map(key => {
⋮----
console.log('[ServiceWorker] Removing old cache', key);
return caches.delete(key);
⋮----
return self.clients.claim(); // Take control of all clients as soon as it activates.
⋮----
// Serve cached content when offline
self.addEventListener('fetch', event => {
// We only want to cache GET requests.
⋮----
// For navigation requests, try network first, then cache (for app updates)
// For other assets, try cache first.
// Skip caching for Open-Meteo API requests to always get fresh data when online.
if (event.request.url.startsWith('https://api.open-meteo.com/')) {
event.respondWith(fetch(event.request));
⋮----
// Cache-first strategy for app shell and local assets
event.respondWith(
caches.match(event.request)
.then(cachedResponse => {
⋮----
// console.log('[ServiceWorker] Returning from cache:', event.request.url);
⋮----
// console.log('[ServiceWorker] Network request for:', event.request.url);
return fetch(event.request).then(response => {
// If request is successful, clone it and cache it.
⋮----
const responseToCache = response.clone();
⋮----
cache.put(event.request, responseToCache);
⋮----
}).catch(error => {
console.error('[ServiceWorker] Fetch failed; returning offline page instead.', error);
// Optionally, return a generic offline page if specific asset not found
// For now, if a core asset is not cached, it will fail.
// return caches.match('/offline.html'); // You would need to create and cache an offline.html
⋮----
// filename: sw.js
```
