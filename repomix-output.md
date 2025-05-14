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
    <meta name="theme-color" content="#317EFB"/>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="PressureTrack">
    <link rel="apple-touch-icon" href="icons/icon-192x192.png">
</head>
<body>
    <div id="notification-area"></div>

    <header>
        <h1>Pressure & Migraine Tracker</h1>
    </header>

    <main>

        <section id="pressure-chart-section">
            <h2>Surface Pressure Over Time</h2>
            <div class="chart-container large-chart-container">
                <div id="pressureChart"></div>
            </div>
        </section>

        <section id="pressure-events-section">
            <h2>Detected Pressure Events (Automated)</h2>
            <div class="automated-events-controls">
                <button id="mergeAutomatedEventsBtn" disabled>Merge Selected Automated (2)</button>
                <button id="unmergeAutomatedEventBtn" disabled>Unmerge Selected (1)</button>
            </div>
            <table id="pressureEventsTable">
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Duration (hrs)</th>
                        <th>Pressure Change (hPa)</th>
                        <th>Type</th>
                        <th>Rate (hPa/hr)</th>
                        <th>Severity</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </section>

        <section id="migraine-log-section">
            <h2>Log Migraine Event</h2>
            <form id="migraineForm">
                <div>
                    <label for="migraineStartTime">Start Time:</label>
                    <input type="datetime-local" id="migraineStartTime" required>
                </div>
                <div>
                    <label for="migraineEndTime">End Time:</label>
                    <input type="datetime-local" id="migraineEndTime" required>
                </div>
                <button type="submit">Log Migraine</button>
            </form>
            <h3>Logged Migraines</h3>
            <ul id="migraineList"></ul>
        </section>
    </main>

    <footer>
        <p>Pressure Tracker PWA</p>
    </footer>

    <script src="https://code.highcharts.com/highcharts.js" defer></script>
    <script src="https://code.highcharts.com/modules/accessibility.js" defer></script>
    <script src="https://code.highcharts.com/modules/exporting.js" defer></script> {/* Needed for context menu */}
    {/* Theme JS files will be loaded dynamically by app.js if not default */}
    <script type="module" src="js/app.js" defer></script>

</body>
</html>
<!-- filename: index.html -->
```

## File: js/app.js
```javascript
// js/app.js
⋮----
let currentThemeId = Config.DEFAULT_THEME_ID; // Keep track of the current theme
⋮----
document.addEventListener('DOMContentLoaded', () => {
registerServiceWorker();
setupEventListeners(); // General listeners
UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);
UIRenderer.loadAndDisplayMigraines(db);
⋮----
// Load saved theme or use default, then apply it (which triggers data load)
currentThemeId = db.loadData(Config.THEME_STORAGE_KEY) || Config.DEFAULT_THEME_ID;
applyTheme(currentThemeId);
⋮----
function registerServiceWorker() {
⋮----
navigator.serviceWorker.register('./sw.js')
.then(registration => console.log('SW registered:', registration.scope))
.catch(error => console.error('SW registration failed:', error));
⋮----
/**
 * Applies the selected theme and reloads the chart.
 * @param {string} themeId - The ID of the theme to apply.
 */
function applyTheme(themeId) {
currentThemeId = themeId; // Update global current theme
db.saveData(Config.THEME_STORAGE_KEY, themeId);
⋮----
const selectedTheme = Config.THEMES.find(t => t.id === themeId);
⋮----
console.error(`Theme with ID ${themeId} not found.`);
// Apply defaults and reload chart
applyGlobalStylesAndReloadChart(null); // Pass null if theme object isn't found or is default
⋮----
// Remove any previously loaded dynamic theme script
const oldThemeScript = document.getElementById(Config.DYNAMIC_THEME_SCRIPT_ID);
if (oldThemeScript) oldThemeScript.remove();
⋮----
UIRenderer.showNotification(`Loading ${selectedTheme.name} theme...`, "info", 2000);
const script = document.createElement('script');
⋮----
script.onload = () => {
console.log(`${selectedTheme.name} theme script loaded.`);
UIRenderer.showNotification(`${selectedTheme.name} theme applied.`, "success", 1500);
applyGlobalStylesAndReloadChart(selectedTheme);
⋮----
script.onerror = () => {
console.error(`Error loading theme script: ${selectedTheme.url}`);
UIRenderer.showNotification(`Error loading ${selectedTheme.name}. Reverting.`, "error");
const failedScript = document.getElementById(Config.DYNAMIC_THEME_SCRIPT_ID);
if (failedScript) failedScript.remove();
currentThemeId = Config.DEFAULT_THEME_ID; // Revert to default ID
db.saveData(Config.THEME_STORAGE_KEY, currentThemeId);
applyGlobalStylesAndReloadChart(Config.THEMES.find(t => t.id === Config.DEFAULT_THEME_ID));
⋮----
document.head.appendChild(script);
} else { // Default theme or theme without a URL (e.g. our "Default")
console.log(`Applying ${selectedTheme.name} theme (no external script).`);
⋮----
/**
 * Sets global Highcharts styles (defaults then base) and reloads chart data.
 * If a theme script was just loaded, its styles are already globally set by Highcharts.
 * We then re-apply our base options to ensure crucial functional settings.
 * @param {object|null} themeObject - The theme object that was just applied (null if default or error).
 */
function applyGlobalStylesAndReloadChart(themeObject) {
⋮----
// 1. Reset to our explicit default visual styles
Highcharts.setOptions(ChartManager.HIGHCHARTS_EXPLICIT_DEFAULT_STYLES);
// 2. Re-apply our base functional options (e.g., useUTC: false)
Highcharts.setOptions(ChartManager.BASE_HIGHCHARTS_OPTIONS);
// 3. If an external theme script was loaded, its styles are already in Highcharts' global options.
//    The above two setOptions calls ensure our defaults are a base, and our functional
//    options are prioritized or correctly merged.
⋮----
loadPressureData(); // This will re-initialize the chart
⋮----
// Removed handleThemeChange as it's now part of Highcharts menu items.
// The callback `applyTheme` is passed to `initializeChart`.
⋮----
async function fetchPressureDataFromAPI(latitude, longitude) {
const apiUrl = Config.API_URL_TEMPLATE.replace('{LAT}', latitude).replace('{LON}', longitude);
UIRenderer.showNotification("Fetching live pressure data...", "info", 3000);
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
UIRenderer.showNotification("Fetching mock pressure data...", "info", 2000);
⋮----
const response = await fetch(Config.MOCK_DATA_PATH);
if (!response.ok) throw new Error(`Mock data HTTP error! status: ${response.status}`);
⋮----
UIRenderer.showNotification("Mock data loaded.", "success", 1000);
⋮----
console.error('Error fetching mock data:', error);
UIRenderer.showNotification(`Error loading mock data: ${error.message}.`, "error");
⋮----
async function loadPressureData() {
⋮----
const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
pressureDataJson = await fetchPressureDataFromAPI(position.coords.latitude, position.coords.longitude);
if (!pressureDataJson) pressureDataJson = await fetchPressureDataFromAPI(Config.DEFAULT_LATITUDE, Config.DEFAULT_LONGITUDE);
⋮----
UIRenderer.showNotification(`Geolocation failed: ${geoError.message}. Using default.`, "warning", 4000);
pressureDataJson = await fetchPressureDataFromAPI(Config.DEFAULT_LATITUDE, Config.DEFAULT_LONGITUDE);
⋮----
UIRenderer.showNotification("Geolocation N/A. Using default location.", "warning", 4000);
⋮----
if (!pressureDataJson) pressureDataJson = await fetchPressureDataFromMock(); // Ultimate fallback
⋮----
pressureDataJson = await fetchPressureDataFromMock();
⋮----
const chartInstance = ChartManager.initializeChart(
⋮----
Config.THEMES, // Pass available themes
currentThemeId, // Pass current active theme ID
applyTheme      // Pass the callback for theme selection
⋮----
PressureEventManager.detectAndStoreAutomatedPressureEvents(pressureDataJson.hourly.time, pressureDataJson.hourly.surface_pressure, UIRenderer.showNotification, ChartManager.updateChartPlotBand);
rerenderAutomatedEventsUI();
} else { UIRenderer.showNotification("Error initializing chart.", "error"); }
⋮----
UIRenderer.showNotification("No pressure data. Chart cannot be displayed.", "error");
ChartManager.destroyChart();
const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID)?.getElementsByTagName('tbody')[0];
⋮----
UIRenderer.updateAutomatedEventActionButtonsState();
⋮----
function rerenderAutomatedEventsUI() {
UIRenderer.renderAutomatedEventsTable(PressureEventManager.getAllAutomatedEvents(), currentlyHighlightedAutomatedEventId, handleAutomatedEventRowClick, UIRenderer.updateAutomatedEventActionButtonsState);
⋮----
function handleAutomatedEventRowClick(eventId, clickedRowElement) {
const eventData = PressureEventManager.getAllAutomatedEvents().find(e => e.id === eventId);
⋮----
ChartManager.updateChartPlotBand(null);
if (clickedRowElement) clickedRowElement.classList.remove('highlighted-automated-event-row');
⋮----
if (eventData) ChartManager.updateChartPlotBand({ startTime: eventData.startTime, endTime: eventData.endTime });
else ChartManager.updateChartPlotBand(null);
document.querySelectorAll(`#${Config.EVENTS_TABLE_BODY_ID} tbody tr.highlighted-automated-event-row`).forEach(row => row.classList.remove('highlighted-automated-event-row'));
if (clickedRowElement) clickedRowElement.classList.add('highlighted-automated-event-row');
⋮----
function setupEventListeners() {
const migraineForm = document.getElementById(Config.MIGRAINE_FORM_ID);
if (migraineForm) migraineForm.addEventListener('submit', handleMigraineSubmit);
const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
if (mergeBtn) mergeBtn.addEventListener('click', () => {
if (PressureEventManager.handleMergeAutomatedEvents(() => currentlyHighlightedAutomatedEventId, UIRenderer.showNotification, ChartManager.updateChartPlotBand)) currentlyHighlightedAutomatedEventId = null;
⋮----
const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
if (unmergeBtn) unmergeBtn.addEventListener('click', () => {
if (PressureEventManager.handleUnmergeAutomatedEvent(() => currentlyHighlightedAutomatedEventId, UIRenderer.showNotification, ChartManager.updateChartPlotBand)) currentlyHighlightedAutomatedEventId = null;
⋮----
function handleMigraineSubmit(event) {
event.preventDefault();
const startTimeInput = document.getElementById(Config.MIGRAINE_START_TIME_ID);
const endTimeInput = document.getElementById(Config.MIGRAINE_END_TIME_ID);
if (!startTimeInput.value || !endTimeInput.value) { UIRenderer.showNotification("Please select both start and end times.", "error"); return; }
const startTimeUnix = Math.floor(new Date(startTimeInput.value).getTime() / 1000);
const endTimeUnix = Math.floor(new Date(endTimeInput.value).getTime() / 1000);
if (endTimeUnix <= startTimeUnix) { UIRenderer.showNotification("End time cannot be before or same as start time.", "error"); return; }
const newMigraine = { id: `migraine_${Date.now()}`, startTime: startTimeUnix, endTime: endTimeUnix };
const migraines = db.loadData('migraines') || [];
migraines.push(newMigraine);
db.saveData('migraines', migraines);
⋮----
if (migraineForm) migraineForm.reset();
UIRenderer.showNotification("Migraine event logged!", "success");
⋮----
// filename: js/app.js
```

## File: js/chartManager.js
```javascript
// js/chartManager.js
⋮----
// These are our core functional settings that should always apply or be reapplied.
⋮----
useUTC: false // Ensures chart displays in local time
⋮----
// Add any other essential global overrides here if themes tend to change them undesirably
// For example, if a theme sets credits, and you always want them off:
// credits: { enabled: false }
⋮----
// Define styles that represent Highcharts' "factory default" look.
// This helps in resetting visual aspects when switching from a styled theme back to "Default".
⋮----
backgroundColor: '#FFFFFF', // Default Highcharts background
// plotBorderColor: '#cccccc', // Example
// plotBackgroundColor: null, // Example
⋮----
colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'], // Default series colors
⋮----
gridLineWidth: 0, // Default for spline, but themes like "Grid Light" change this
⋮----
gridLineWidth: 1, // Often default, but good to be explicit
⋮----
enabled: false // Explicitly disable credits as a baseline
⋮----
// Add other common styling attributes that themes might override and you want to reset.
⋮----
// Apply base functional options globally when chartManager.js is first loaded.
⋮----
Highcharts.setOptions(BASE_HIGHCHARTS_OPTIONS);
⋮----
/**
 * Initializes the Highcharts pressure chart.
 * @param {number[]} times - Array of Unix timestamps (seconds).
 * @param {number[]} pressures - Array of pressure values.
 * @param {object[]} availableThemes - Config.THEMES array.
 * @param {string} activeThemeId - The ID of the currently active theme.
 * @param {function} onThemeSelectedCallback - Function to call when a theme is selected from context menu.
 */
export function initializeChart(times, pressures, availableThemes, activeThemeId, onThemeSelectedCallback) {
const chartContainer = document.getElementById(CHART_CONTAINER_ID);
⋮----
console.error("Chart container div not found:", CHART_CONTAINER_ID);
⋮----
console.error("Invalid or empty data provided for chart initialization.");
if (pressureChartInstance) pressureChartInstance.destroy();
⋮----
const seriesData = times.map((time, index) => [time * 1000, pressures[index]]);
⋮----
// --- Construct theme menu items for Highcharts context menu ---
const themeMenuItems = availableThemes.map(theme => ({
⋮----
onThemeSelectedCallback(theme.id);
⋮----
pressureChartInstance = Highcharts.chart(CHART_CONTAINER_ID, {
chart: { type: 'spline', zoomType: 'x', events: { load: function() { addCurrentTimePlotLine(this); } } },
// time: { useUTC: false } is set globally via BASE_HIGHCHARTS_OPTIONS
⋮----
xAxis: { type: 'datetime', labels: { formatter: function () { return Highcharts.dateFormat('%e %b, %H:%M', this.value); } }, title: { text: 'Time' } },
⋮----
tooltip: { formatter: function () { return `<b>${Highcharts.dateFormat('%A, %b %e, %Y, %H:%M', this.x)}</b><br/>Pressure: ${this.y.toFixed(1)} hPa`; } },
⋮----
credits: { enabled: false }, // Ensure credits are off, might be re-enabled by themes
⋮----
// Default exporting options
⋮----
// Custom theme selector items
⋮----
console.error("Error initializing Highcharts:", error);
⋮----
export function addCurrentTimePlotLine(chartInstance) {
⋮----
chartInstance.xAxis[0].removePlotLine(CURRENT_TIME_PLOT_LINE_ID);
const nowMs = new Date().getTime();
const xAxisExtremes = chartInstance.xAxis[0].getExtremes();
⋮----
chartInstance.xAxis[0].addPlotLine({
⋮----
label: { text: 'Now', align: 'center', y: -5, style: { fontWeight: 'bold' } }, // Color will be themed
⋮----
export function updateChartPlotBand(eventData) {
⋮----
pressureChartInstance.xAxis[0].removePlotBand(PLOT_BAND_ID);
⋮----
pressureChartInstance.xAxis[0].addPlotBand({
⋮----
// color: 'rgba(0, 123, 255, 0.2)', // Color will be themed
⋮----
export function destroyChart() {
⋮----
try { pressureChartInstance.destroy(); } catch (e) { console.error("Error destroying chart:", e); }
⋮----
// filename: js/chartManager.js
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
// Configuration for automated peak/valley detection
⋮----
// DOM Element IDs
⋮----
// export const CHART_THEME_SELECTOR_ID = 'chartThemeSelector'; // No longer needed for external dropdown
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
// Note: showNotification and updateChartPlotBand will be passed in from app.js
⋮----
/**
 * Assigns a severity score based on the absolute rate of pressure change.
 * @param {number} absoluteRateOfChange - The absolute rate of pressure change in hPa/hour.
 * @returns {string} The severity score ('Low', 'Medium', 'High').
 */
function getSeverityScore(absoluteRateOfChange) {
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
⋮----
console.error("Insufficient or invalid data for event detection in pressureEventManager.");
⋮----
let ongoingEventType = null; // 'rise' or 'fall'
⋮----
// Trend changed, finalize previous event if significant
⋮----
const pChange = parseFloat((endP - pressures[eventSegmentStartIdx]).toFixed(1));
⋮----
if (durationHrs >= MIN_DURATION_HOURS && Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
⋮----
durationHours: parseFloat(durationHrs.toFixed(1)),
⋮----
calculateRateAndSeverity(newEvent); // Calculate and add rate/severity
allAutomatedEvents.push(newEvent);
⋮----
// Start new event segment
⋮----
// Finalize any ongoing event at the end of the data
⋮----
allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);
⋮----
export function getAllAutomatedEvents() {
⋮----
export function handleMergeAutomatedEvents(getCurrentlyHighlightedEventId, showNotification, updateChartPlotBand) {
const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
⋮----
const selectedCheckboxes = Array.from(tableElement.querySelectorAll('tbody input[type="checkbox"]:checked'));
const eventIdsToMerge = selectedCheckboxes.map(cb => cb.dataset.eventId);
⋮----
showNotification("Please select exactly two automated events to merge.", "error");
⋮----
const eventsToMerge = allAutomatedEvents.filter(event => eventIdsToMerge.includes(event.id));
if (eventsToMerge.some(e => e.isMerged)) {
showNotification("Cannot merge: one or more selected events are already merged events.", "error");
⋮----
if (eventsToMerge.length !== 2) { // Should be caught by previous check, but good for safety
showNotification("Error: Could not find two distinct events to merge.", "error");
⋮----
const [event1, event2] = eventsToMerge.sort((a, b) => a.startTime - b.startTime);
⋮----
// Clear highlight if one of the merged events was highlighted
const currentlyHighlightedId = getCurrentlyHighlightedEventId();
⋮----
if (eventIdsToMerge.includes(currentlyHighlightedId)) {
updateChartPlotBand(null);
highlightNeedsClear = true; // Signal to app.js to clear its state
⋮----
const mergedStartTime = event1.startTime; // Since sorted
const mergedEndTime = event2.endTime;     // Since sorted, event2 is later or same
⋮----
const mergedDurHrs = parseFloat((mergedDurSecs / 3600).toFixed(1));
⋮----
// Find pressure at start of event1 and end of event2 from cached data
let mergedStartP = hourlyPressuresCache[hourlyTimesCache.indexOf(event1.startTime)];
let mergedEndP = hourlyPressuresCache[hourlyTimesCache.indexOf(event2.endTime)];
⋮----
mergedPChange = parseFloat((mergedEndP - mergedStartP).toFixed(1));
⋮----
console.warn("Could not find exact start/end pressures for merged event in hourly data. Pressure change might be N/A.");
⋮----
type: mergedPChange > 0 ? 'rise' : (mergedPChange < 0 ? 'fall' : 'stable'), // Determine type based on overall change
⋮----
originalEventsData: [JSON.parse(JSON.stringify(event1)), JSON.parse(JSON.stringify(event2))]
⋮----
calculateRateAndSeverity(mergedEvent); // Calculate rate/severity for the new merged event
⋮----
allAutomatedEvents = allAutomatedEvents.filter(event => !eventIdsToMerge.includes(event.id));
allAutomatedEvents.push(mergedEvent);
⋮----
showNotification("Automated events merged successfully!", "success");
⋮----
export function handleUnmergeAutomatedEvent(getCurrentlyHighlightedEventId, showNotification, updateChartPlotBand) {
⋮----
showNotification("Please select exactly one merged event to unmerge.", "error");
⋮----
const eventToUnmerge = allAutomatedEvents.find(event => event.id === eventIdToUnmerge);
⋮----
showNotification("Selected event is not a merged event or has no original data to restore.", "error");
⋮----
// Clear highlight if the unmerged event was highlighted
⋮----
if (getCurrentlyHighlightedEventId() === eventIdToUnmerge) {
⋮----
allAutomatedEvents = allAutomatedEvents.filter(event => event.id !== eventIdToUnmerge);
eventToUnmerge.originalEventsData.forEach(originalEvent => {
// Original events already have their rate/severity calculated
allAutomatedEvents.push(originalEvent);
⋮----
showNotification("Event unmerged successfully!", "success");
⋮----
// filename: js/pressureEventManager.js
```

## File: js/uiRenderer.js
```javascript
// js/uiRenderer.js
⋮----
import { EVENTS_TABLE_BODY_ID, MIGRAINE_LIST_ID, MERGE_EVENTS_BTN_ID, UNMERGE_EVENT_BTN_ID } from './config.js'; // Removed CHART_THEME_SELECTOR_ID
⋮----
export function setCurrentHighlightHandler(handler) {
⋮----
// Removed setupThemeSelector and updateThemeSelectorUI as dropdown is now in chart context menu.
⋮----
export function renderAutomatedEventsTable(eventsToRender, currentlyHighlightedEventId, onRowClickHandler, onCheckboxChangeHandler) {
const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
⋮----
console.error("Automated pressure events table element not found:", EVENTS_TABLE_BODY_ID);
⋮----
const tableBody = tableElement.getElementsByTagName('tbody')[0];
⋮----
console.error("Automated pressure events table body not found.");
⋮----
const row = tableBody.insertRow();
const cell = row.insertCell();
⋮----
updateAutomatedEventActionButtonsState(onCheckboxChangeHandler);
⋮----
const nowUnix = Math.floor(Date.now() / 1000);
eventsToRender.forEach(event => {
⋮----
row.addEventListener('click', (e) => {
⋮----
if (onRowClickHandler) onRowClickHandler(event.id, row);
⋮----
const cellSelect = row.insertCell();
const checkbox = document.createElement('input');
⋮----
checkbox.addEventListener('change', () => onCheckboxChangeHandler());
cellSelect.appendChild(checkbox);
⋮----
row.insertCell().textContent = formatUnixTimestamp(event.startTime);
row.insertCell().textContent = formatUnixTimestamp(event.endTime);
row.insertCell().textContent = event.durationHours.toFixed(1);
row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';
row.insertCell().textContent = event.isMerged ? `${event.type} (Merged)` : event.type;
row.insertCell().textContent = (typeof event.rateOfChange === 'number') ? event.rateOfChange.toFixed(2) : 'N/A';
const severityCell = row.insertCell();
⋮----
severityCell.classList.add(`severity-${(event.severity || 'na').toLowerCase()}`);
⋮----
if (nowUnix >= event.startTime && nowUnix <= event.endTime) row.classList.add('current-event');
if (event.id === currentlyHighlightedEventId) row.classList.add('highlighted-automated-event-row');
⋮----
export function updateAutomatedEventActionButtonsState() {
⋮----
const events = getAllAutomatedEvents();
const checkboxes = Array.from(tableElement.querySelectorAll('tbody input[type="checkbox"]:checked'));
const mergeBtn = document.getElementById(MERGE_EVENTS_BTN_ID);
const unmergeBtn = document.getElementById(UNMERGE_EVENT_BTN_ID);
⋮----
const selectedEventIds = checkboxes.map(cb => cb.dataset.eventId);
const selectedEvents = events.filter(e => selectedEventIds.includes(e.id));
if (selectedEvents.length === 2 && !selectedEvents.some(e => e.isMerged)) canMerge = true;
⋮----
const selectedEvent = events.find(e => e.id === checkboxes[0].dataset.eventId);
⋮----
export function loadAndDisplayMigraines(dbInstance) {
const migraines = dbInstance.loadData('migraines') || [];
const listElement = document.getElementById(MIGRAINE_LIST_ID);
⋮----
console.error("Migraine list element not found:", MIGRAINE_LIST_ID);
⋮----
migraines.sort((a, b) => b.startTime - a.startTime);
⋮----
migraines.forEach(migraine => {
const listItem = document.createElement('li');
listItem.textContent = `From: ${formatUnixTimestamp(migraine.startTime)} To: ${formatUnixTimestamp(migraine.endTime)}`;
listElement.appendChild(listItem);
⋮----
// filename: js/uiRenderer.js
```

## File: js/utils.js
```javascript
// js/utils.js
⋮----
/**
 * Formats a Unix timestamp (seconds) into a human-readable string.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @param {string} formatType - 'datetime' for full locale string, or any other for locale string.
 * @returns {string} The formatted date string.
 */
export function formatUnixTimestamp(unixTimestamp, formatType = 'datetime') {
const date = new Date(unixTimestamp * 1000);
⋮----
return date.toLocaleString();
⋮----
// Highcharts handles its own axis formatting, this is for other UI parts.
⋮----
/**
 * Shows a notification message to the user.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error').
 * @param {number} [duration=3000] - How long to display the notification in milliseconds.
 */
export function showNotification(message, type = 'info', duration = 3000) {
const notificationArea = document.getElementById('notification-area'); // Using ID from config might be an option later
⋮----
console.warn('Notification area not found in DOM.');
⋮----
const notification = document.createElement('div');
⋮----
notificationArea.appendChild(notification);
⋮----
// Trigger reflow to enable animation
requestAnimationFrame(() => {
notification.classList.add('show');
⋮----
setTimeout(() => {
notification.classList.remove('show');
// Remove the element after the animation completes
⋮----
notificationArea.removeChild(notification);
⋮----
}, 500); // Matches CSS transition duration
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
    "theme_color": "#317EFB",
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
/* style.css - Add these styles */
body {
⋮----
#notification-area {
⋮----
.notification {
.notification.show { opacity: 1; transform: translateY(0); }
.notification.success { background-color: #28a745; }
.notification.error { background-color: #dc3545; }
.notification.info { background-color: #17a2b8; }
.notification.warning { background-color: #ffc107; color: #333; }
⋮----
header {
header h1 { margin: 0; font-size: 1.8em; }
⋮----
main {
⋮----
section {
⋮----
/* New styles for settings section */
.settings-section div {
⋮----
gap: 10px; /* Space between label and select */
⋮----
.settings-section label {
#chartThemeSelector {
⋮----
min-width: 200px; /* Ensure dropdown is not too small */
⋮----
h2 {
h3 { font-size: 1.2em; color: #555; margin-top: 1.5em; margin-bottom: 0.5em; }
⋮----
.chart-container { position: relative; height: 350px; width: 100%; margin-bottom: 1em; }
.large-chart-container { height: 450px; } /* Can be adjusted */
#pressureChart { display: block; box-sizing: border-box; height: 100% !important; width: 100% !important; }
⋮----
#migraineList li { font-weight: normal; color: #333; }
⋮----
.automated-events-controls { margin-bottom: 1em; }
.automated-events-controls button { margin-right: 10px; }
⋮----
table { width: 100%; border-collapse: collapse; margin-top: 1em; font-size: 0.9em; }
th, td {
th { background-color: #f9f9f9; color: #555; font-weight: bold; }
tr.current-event td { background-color: #fff8e1; font-weight: bold; }
td input[type="checkbox"] { transform: scale(1.2); margin-right: 5px;}
⋮----
#pressureEventsTable tbody tr.highlighted-automated-event-row td {
⋮----
background-color: rgba(0, 123, 255, 0.15) !important; /* Ensure it overrides other hover/current styles */
⋮----
#pressureEventsTable tbody tr:not(.highlighted-automated-event-row):hover td {
⋮----
/* Severity styling hints */
.severity-low { color: #28a745; /* Green */ }
.severity-medium { color: #ffc107; /* Yellow/Orange */ }
.severity-high { color: #dc3545; /* Red */ }
.severity-na { color: #6c757d; /* Grey */ }
⋮----
button, .delete-event-btn, .confirm-delete-btn {
button:hover, .delete-event-btn:hover, .confirm-delete-btn:hover { background-color: #0056b3; }
button:disabled { background-color: #cccccc; cursor: not-allowed; color: #666;}
⋮----
.delete-event-btn {
.delete-event-btn:hover { background-color: #e0a800; }
⋮----
.confirm-delete-btn {
.confirm-delete-btn:hover { background-color: #c82333; }
⋮----
input[type="datetime-local"], input[type="number"] {
#migraineForm div { margin-bottom: 1em; }
⋮----
#migraineList { list-style-type: disc; padding-left: 20px; }
#migraineList li {
⋮----
footer {
⋮----
margin-top: auto; /* Pushes footer to bottom */
⋮----
/* filename: style.css */
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
