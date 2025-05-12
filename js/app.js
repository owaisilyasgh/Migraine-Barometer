// js/app.js
// Ensure ChartManager is imported and other necessary imports
import * as ChartManager from './chartManager.js'; // Using namespace import
import * as PressureEventManager from './pressureEventManager.js';
import * as UIRenderer from './uiRenderer.js';
import db from './db.js'; // Default export
import * as Config from './config.js'; // Assuming config.js exports its constants

// Application state
let currentlyHighlightedAutomatedEventId = null; // Tracks which event row/plotband is highlighted
let hourlyTimes = [];
let hourlyPressures = [];

// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    setupEventListeners();
    UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick); // Pass the click handler to UI Renderer
    UIRenderer.loadAndDisplayMigraines(db); // Load migraines on startup
    loadPressureData(); // Initial load of pressure data and chart rendering
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js') // sw.js should be in the root
            .then(registration => console.log('Service Worker registered with scope:', registration.scope))
            .catch(error => console.error('Service Worker registration failed:', error));
    }
}

async function loadPressureData() {
    try {
        const response = await fetch('mock_pressure_data.json'); // Ensure this path is correct relative to index.html
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data && data.hourly && data.hourly.time && data.hourly.surface_pressure) {
            hourlyTimes = data.hourly.time; // Unix timestamps (seconds)
            hourlyPressures = data.hourly.surface_pressure;

            // Initialize chart only if data is valid
            // The addCurrentTimePlotLine call is now handled by the chart's load event in chartManager.js
            const chartInstance = ChartManager.initializeChart(hourlyTimes, hourlyPressures);
            
            if (!chartInstance) {
                 // Handle case where chart couldn't be initialized, message already shown by chartManager
                UIRenderer.showNotification("Error: Could not initialize pressure chart.", "error");
            }

            // Automated event detection depends on chart data being available
            PressureEventManager.detectAndStoreAutomatedPressureEvents(hourlyTimes, hourlyPressures);
            rerenderAutomatedEventsUI(); // This will also update button states
            UIRenderer.showNotification("Pressure data loaded and chart updated.", "info", 1500);

        } else {
            console.error("No hourly data available or data is malformed.");
            UIRenderer.showNotification("Error: No pressure data loaded or data is malformed.", "error");
            ChartManager.destroyChart(); // Ensure any existing chart is cleared
            // Clear the automated events table as well if data is bad
            const tableElement = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
            const autoTableBody = tableElement ? tableElement.getElementsByTagName('tbody')[0] : null;
            if (autoTableBody) autoTableBody.innerHTML = '<tr><td colspan="6">No pressure data loaded.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading pressure data:', error);
        UIRenderer.showNotification(`Error loading pressure data: ${error.message}. Check console for details.`, "error");
        ChartManager.destroyChart(); // Ensure any existing chart is cleared if data load fails
         // Clear the automated events table as well if data fails to load
        const tableElement = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
        const autoTableBody = tableElement ? tableElement.getElementsByTagName('tbody')[0] : null;
        if (autoTableBody) autoTableBody.innerHTML = '<tr><td colspan="6">Failed to load pressure data.</td></tr>';
    } finally {
        // This function should always be called to ensure buttons are in a correct state
        UIRenderer.updateAutomatedEventActionButtonsState();
    }
}

function rerenderAutomatedEventsUI() {
    UIRenderer.renderAutomatedEventsTable(
        PressureEventManager.getAllAutomatedEvents(),
        currentlyHighlightedAutomatedEventId,
        handleAutomatedEventRowClick, // Pass the handler function
        UIRenderer.updateAutomatedEventActionButtonsState // Pass button state updater
    );
}


function handleAutomatedEventRowClick(eventId, clickedRowElement) {
    const allEvents = PressureEventManager.getAllAutomatedEvents();
    const eventData = allEvents.find(e => e.id === eventId);

    if (currentlyHighlightedAutomatedEventId === eventId) {
        currentlyHighlightedAutomatedEventId = null;
        ChartManager.updateChartPlotBand(null);
        if (clickedRowElement) clickedRowElement.classList.remove('highlighted-automated-event-row');
    } else {
        currentlyHighlightedAutomatedEventId = eventId;
        if (eventData) {
            ChartManager.updateChartPlotBand({ startTime: eventData.startTime, endTime: eventData.endTime });
        }
        document.querySelectorAll(`#${Config.EVENTS_TABLE_BODY_ID} tbody tr.highlighted-automated-event-row`).forEach(row => {
            row.classList.remove('highlighted-automated-event-row');
        });
        if (clickedRowElement) clickedRowElement.classList.add('highlighted-automated-event-row');
    }
}


function setupEventListeners() {
    const migraineForm = document.getElementById(Config.MIGRAINE_FORM_ID);
    if (migraineForm) migraineForm.addEventListener('submit', handleMigraineSubmit);

    const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
    if (mergeBtn) mergeBtn.addEventListener('click', () => {
        const highlightCleared = PressureEventManager.handleMergeAutomatedEvents(
            () => currentlyHighlightedAutomatedEventId,
            rerenderAutomatedEventsUI,
            ChartManager.updateChartPlotBand, 
            (message, type) => UIRenderer.showNotification(message, type) 
        );
        if (highlightCleared) currentlyHighlightedAutomatedEventId = null; 
        rerenderAutomatedEventsUI(); 
    });

    const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
    if (unmergeBtn) unmergeBtn.addEventListener('click', () => {
        const highlightCleared = PressureEventManager.handleUnmergeAutomatedEvent(
            () => currentlyHighlightedAutomatedEventId,
            rerenderAutomatedEventsUI,
            ChartManager.updateChartPlotBand, 
            (message, type) => UIRenderer.showNotification(message, type)
        );
        if (highlightCleared) currentlyHighlightedAutomatedEventId = null;
        rerenderAutomatedEventsUI();
    });
}

function handleMigraineSubmit(event) {
    event.preventDefault();
    const startTimeInput = document.getElementById(Config.MIGRAINE_START_TIME_ID);
    const endTimeInput = document.getElementById(Config.MIGRAINE_END_TIME_ID);

    if (!startTimeInput.value || !endTimeInput.value) {
        UIRenderer.showNotification("Please select both start and end times for the migraine.", "error");
        return;
    }

    const startTimeUnix = Math.floor(new Date(startTimeInput.value).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(endTimeInput.value).getTime() / 1000);

    if (endTimeUnix < startTimeUnix) {
        UIRenderer.showNotification("Migraine end time cannot be before start time.", "error");
        return;
    }

    const newMigraine = {
        id: `migraine_${Date.now()}`, 
        startTime: startTimeUnix,
        endTime: endTimeUnix
    };

    const migraines = db.loadData('migraines') || [];
    migraines.push(newMigraine);
    db.saveData('migraines', migraines);

    UIRenderer.loadAndDisplayMigraines(db); 
    if(migraineForm) migraineForm.reset();
    UIRenderer.showNotification("Migraine event logged!", "success");
}