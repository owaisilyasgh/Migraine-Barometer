// js/uiRenderer.js
import { formatUnixTimestamp, showNotification as utilShowNotification } from './utils.js'; // Renamed to avoid conflict
import { EVENTS_TABLE_BODY_ID, MIGRAINE_LIST_ID, MERGE_EVENTS_BTN_ID, UNMERGE_EVENT_BTN_ID } from './config.js';
import { getAllAutomatedEvents } from './pressureEventManager.js'; // To get events for button state

// Forward showNotification
export const showNotification = utilShowNotification;

let currentHighlightHandler = null; // To be set by app.js

export function setCurrentHighlightHandler(handler) {
    currentHighlightHandler = handler;
}

/**
 * Renders the table of automated pressure events.
 * @param {object[]} eventsToRender - The events to display.
 * @param {string|null} currentlyHighlightedEventId - ID of the event to highlight in the table.
 * @param {function} onRowClickHandler - Function to call when a row is clicked.
 * @param {function} onCheckboxChangeHandler - Function to call when a checkbox state changes.
 */
export function renderAutomatedEventsTable(eventsToRender, currentlyHighlightedEventId, onRowClickHandler, onCheckboxChangeHandler) {
    const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
    if (!tableElement) {
        console.error("Automated pressure events table element not found:", EVENTS_TABLE_BODY_ID);
        return;
    }
    const tableBody = tableElement.getElementsByTagName('tbody')[0];
    if (!tableBody) {
        console.error("Automated pressure events table body not found.");
        return;
    }
    tableBody.innerHTML = '';

    if (eventsToRender.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.textContent = 'No significant pressure events detected or loaded.';
        updateAutomatedEventActionButtonsState(onCheckboxChangeHandler); // Pass handler
        return;
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    eventsToRender.forEach(event => {
        const row = tableBody.insertRow();
        row.dataset.eventId = event.id;
        row.style.cursor = 'pointer';

        row.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox' || (e.target.parentNode && e.target.parentNode.firstChild && e.target.parentNode.firstChild.type === 'checkbox')) {
                return;
            }
            if (onRowClickHandler) onRowClickHandler(event.id, row);
        });

        const cellSelect = row.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.eventId = event.id;
        checkbox.addEventListener('change', () => onCheckboxChangeHandler()); // Call the passed handler
        cellSelect.appendChild(checkbox);

        row.insertCell().textContent = formatUnixTimestamp(event.startTime);
        row.insertCell().textContent = formatUnixTimestamp(event.endTime);
        row.insertCell().textContent = event.durationHours.toFixed(1);
        row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';

        let typeDisplay = event.type;
        if (event.isMerged) { typeDisplay += " (M)"; }
        row.insertCell().textContent = typeDisplay;

        if (nowUnix >= event.startTime && nowUnix <= event.endTime) { row.classList.add('current-event'); }
        if (event.id === currentlyHighlightedEventId) {
            row.classList.add('highlighted-automated-event-row');
        }
    });
    updateAutomatedEventActionButtonsState(onCheckboxChangeHandler); // Pass handler
}


/**
 * Updates the enabled/disabled state of merge/unmerge buttons.
 * This function will be called by app.js after checkbox changes.
 */
export function updateAutomatedEventActionButtonsState() {
    const events = getAllAutomatedEvents(); // Get current events state
    const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
    if (!tableElement) return;

    const checkboxes = Array.from(tableElement.querySelectorAll('tbody input[type="checkbox"]:checked'));
    const mergeBtn = document.getElementById(MERGE_EVENTS_BTN_ID);
    const unmergeBtn = document.getElementById(UNMERGE_EVENT_BTN_ID);

    if (!mergeBtn || !unmergeBtn) return;

    let selectedNonMergedEventsCount = 0;
    let countSelectedMerged = 0;

    checkboxes.forEach(cb => {
        const eventId = cb.dataset.eventId;
        const event = events.find(e => e.id === eventId);
        if (event) {
            if (event.isMerged) {
                countSelectedMerged++;
            } else {
                selectedNonMergedEventsCount++;
            }
        }
    });

    mergeBtn.disabled = !(selectedNonMergedEventsCount === 2 && countSelectedMerged === 0 && checkboxes.length === 2);
    unmergeBtn.disabled = !(countSelectedMerged === 1 && selectedNonMergedEventsCount === 0 && checkboxes.length === 1);
}


/**
 * Loads and displays migraine events from localStorage.
 * @param {object} dbInstance - The database utility object.
 */
export function loadAndDisplayMigraines(dbInstance) {
    const migraines = dbInstance.loadData('migraines') || [];
    const listElement = document.getElementById(MIGRAINE_LIST_ID);
    if (!listElement) {
        console.error("Migraine list element not found:", MIGRAINE_LIST_ID);
        return;
    }

    listElement.innerHTML = '';
    if (migraines.length === 0) {
        listElement.innerHTML = '<li>No migraines logged yet.</li>';
        return;
    }

    migraines.sort((a,b) => b.startTime - a.startTime); // Show newest first
    migraines.forEach(migraine => {
        const listItem = document.createElement('li');
        listItem.textContent = `From: ${formatUnixTimestamp(migraine.startTime)} To: ${formatUnixTimestamp(migraine.endTime)}`;
        listElement.appendChild(listItem);
    });
}