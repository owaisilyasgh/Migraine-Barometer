// js/uiRenderer.js
import { formatUnixTimestamp, showNotification as utilShowNotification } from './utils.js';
import { EVENTS_TABLE_BODY_ID, MIGRAINE_LIST_ID, MERGE_EVENTS_BTN_ID, UNMERGE_EVENT_BTN_ID } from './config.js'; // Removed CHART_THEME_SELECTOR_ID
import { getAllAutomatedEvents } from './pressureEventManager.js';

export const showNotification = utilShowNotification;

let currentHighlightHandler = null;

export function setCurrentHighlightHandler(handler) {
    currentHighlightHandler = handler;
}

// Removed setupThemeSelector and updateThemeSelectorUI as dropdown is now in chart context menu.

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

    if (!eventsToRender || eventsToRender.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.textContent = 'No automated pressure events detected or data not loaded.';
        cell.style.textAlign = 'center';
        updateAutomatedEventActionButtonsState(onCheckboxChangeHandler);
        return;
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    eventsToRender.forEach(event => {
        const row = tableBody.insertRow();
        row.dataset.eventId = event.id;

        row.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            if (onRowClickHandler) onRowClickHandler(event.id, row);
        });

        const cellSelect = row.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.eventId = event.id;
        checkbox.addEventListener('change', () => onCheckboxChangeHandler());
        cellSelect.appendChild(checkbox);

        row.insertCell().textContent = formatUnixTimestamp(event.startTime);
        row.insertCell().textContent = formatUnixTimestamp(event.endTime);
        row.insertCell().textContent = event.durationHours.toFixed(1);
        row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';
        row.insertCell().textContent = event.isMerged ? `${event.type} (Merged)` : event.type;
        row.insertCell().textContent = (typeof event.rateOfChange === 'number') ? event.rateOfChange.toFixed(2) : 'N/A';
        const severityCell = row.insertCell();
        severityCell.textContent = event.severity || 'N/A';
        severityCell.classList.add(`severity-${(event.severity || 'na').toLowerCase()}`);

        if (nowUnix >= event.startTime && nowUnix <= event.endTime) row.classList.add('current-event');
        if (event.id === currentlyHighlightedEventId) row.classList.add('highlighted-automated-event-row');
    });
    updateAutomatedEventActionButtonsState(onCheckboxChangeHandler);
}

export function updateAutomatedEventActionButtonsState() {
    const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
    if (!tableElement) return;
    const events = getAllAutomatedEvents();
    const checkboxes = Array.from(tableElement.querySelectorAll('tbody input[type="checkbox"]:checked'));
    const mergeBtn = document.getElementById(MERGE_EVENTS_BTN_ID);
    const unmergeBtn = document.getElementById(UNMERGE_EVENT_BTN_ID);
    if (!mergeBtn || !unmergeBtn) return;
    let canMerge = false;
    let canUnmerge = false;
    if (checkboxes.length === 2) {
        const selectedEventIds = checkboxes.map(cb => cb.dataset.eventId);
        const selectedEvents = events.filter(e => selectedEventIds.includes(e.id));
        if (selectedEvents.length === 2 && !selectedEvents.some(e => e.isMerged)) canMerge = true;
    }
    if (checkboxes.length === 1) {
        const selectedEvent = events.find(e => e.id === checkboxes[0].dataset.eventId);
        if (selectedEvent && selectedEvent.isMerged) canUnmerge = true;
    }
    mergeBtn.disabled = !canMerge;
    unmergeBtn.disabled = !canUnmerge;
}

export function loadAndDisplayMigraines(dbInstance) {
    const migraines = dbInstance.loadData('migraines') || [];
    const listElement = document.getElementById(MIGRAINE_LIST_ID);
    if (!listElement) {
        console.error("Migraine list element not found:", MIGRAINE_LIST_ID);
        return;
    }
    listElement.innerHTML = '';
    migraines.sort((a, b) => b.startTime - a.startTime);
    if (migraines.length === 0) {
        listElement.innerHTML = '<li>No migraines logged yet.</li>';
        return;
    }
    migraines.forEach(migraine => {
        const listItem = document.createElement('li');
        listItem.textContent = `From: ${formatUnixTimestamp(migraine.startTime)} To: ${formatUnixTimestamp(migraine.endTime)}`;
        listElement.appendChild(listItem);
    });
}
// filename: js/uiRenderer.js