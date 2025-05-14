// js/uiRenderer.js
import { formatUnixTimestamp, showNotification as utilShowNotification } from './utils.js';
import { EVENTS_TABLE_BODY_ID, MERGE_EVENTS_BTN_ID, UNMERGE_EVENT_BTN_ID, MIGRAINE_SEVERITIES } from './config.js';
import { getAllAutomatedEvents } from './pressureEventManager.js';

export const showNotification = utilShowNotification;

let currentHighlightHandler = null;

export function setCurrentHighlightHandler(handler) {
    currentHighlightHandler = handler;
}

export function renderAutomatedEventsTable(
    eventsToRender,
    currentlyHighlightedEventId,
    onRowClickHandler,
    onCheckboxChangeHandler,
    currentEventMigraineLogs, // New: Pass all current logs
    onEventMigraineChangeAppCallback // New: Callback to app.js for select change
) {
    const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
    if (!tableElement) return;
    const tableBody = tableElement.getElementsByTagName('tbody')[0];
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!eventsToRender || eventsToRender.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 9; // Adjusted for new column count
        cell.textContent = 'No automated pressure events detected or data not loaded.';
        cell.style.textAlign = 'center';
        updateAutomatedEventActionButtonsState(onCheckboxChangeHandler);
        return;
    }

    eventsToRender.forEach(event => {
        const row = tableBody.insertRow();
        row.dataset.eventId = event.id;

        row.addEventListener('click', (e) => {
            // Prevent row click if interacting with checkbox or the new select dropdown
            if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
            if (onRowClickHandler) onRowClickHandler(event.id, row);
        });

        const cellSelect = row.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.eventId = event.id;
        checkbox.addEventListener('change', () => onCheckboxChangeHandler());
        cellSelect.appendChild(checkbox);

        row.insertCell().textContent = formatUnixTimestamp(event.startTime); // Uses updated format
        row.insertCell().textContent = formatUnixTimestamp(event.endTime);   // Uses updated format
        row.insertCell().textContent = event.durationHours.toFixed(1);
        row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';
        
        // Capitalize Type
        let typeDisplay = event.type.charAt(0).toUpperCase() + event.type.slice(1);
        if (event.isMerged) typeDisplay += ' (Merged)';
        row.insertCell().textContent = typeDisplay;

        row.insertCell().textContent = (typeof event.rateOfChange === 'number') ? event.rateOfChange.toFixed(2) : 'N/A';
        const severityCell = row.insertCell();
        severityCell.textContent = event.severity || 'N/A';
        severityCell.classList.add(`severity-${(event.severity || 'na').toLowerCase()}`);

        // Migraine Log Dropdown Cell
        const migraineLogCell = row.insertCell();
        migraineLogCell.classList.add('migraine-log-cell');
        const selectMigraine = document.createElement('select');
        selectMigraine.classList.add('m3-table-select'); // For potential M3 select styling
        selectMigraine.dataset.eventId = event.id;

        // Default "None" or placeholder option
        const defaultOption = document.createElement('option');
        defaultOption.value = "none"; // Or ""
        defaultOption.textContent = "-- Log Severity --";
        selectMigraine.appendChild(defaultOption);

        MIGRAINE_SEVERITIES.forEach(severity => {
            const option = document.createElement('option');
            option.value = severity;
            option.textContent = severity;
            selectMigraine.appendChild(option);
        });

        // Set selected value based on current logs
        const loggedMigraine = currentEventMigraineLogs[event.id];
        if (loggedMigraine && loggedMigraine.severity) {
            selectMigraine.value = loggedMigraine.severity;
        } else {
            selectMigraine.value = "none";
        }

        selectMigraine.addEventListener('change', (e) => {
            if (onEventMigraineChangeAppCallback) {
                onEventMigraineChangeAppCallback(event.id, e.target); // Pass eventId and the select element
            }
        });
        migraineLogCell.appendChild(selectMigraine);

        const nowUnix = Math.floor(Date.now() / 1000);
        if (nowUnix >= event.startTime && nowUnix <= event.endTime) row.classList.add('current-event');
        if (event.id === currentlyHighlightedEventId) row.classList.add('highlighted-automated-event-row');
    });
    updateAutomatedEventActionButtonsState(onCheckboxChangeHandler);
}

export function updateAutomatedEventActionButtonsState() { /* ... (no changes) ... */ }
// filename: js/uiRenderer.js