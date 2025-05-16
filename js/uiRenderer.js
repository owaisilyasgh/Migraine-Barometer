// js/uiRenderer.js
import * as Config from './config.js';
import { formatUnixTimestamp } from './utils.js';

let currentOnRowClickHandler = null;

export function setCurrentHighlightHandler(handler) {
    currentOnRowClickHandler = handler;
}

export function renderAutomatedEventsTable(
    eventsToRender,
    currentlyHighlightedEventId,
    currentEventMigraineLogs,
    onEventMigraineChangeAppCallback,
    isShowAllEventsActive // Note: parameter name changed for clarity
) {
    const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
    if (!tableBody) {
        console.error("Events table body element not found:", Config.EVENTS_TABLE_BODY_ID);
        return;
    }
    tableBody.innerHTML = '';

    if (!eventsToRender || eventsToRender.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.textContent = 'No pressure events detected or to display.';
        cell.style.textAlign = 'center';
        return;
    }

    eventsToRender.forEach(event => {
        const row = tableBody.insertRow();
        row.dataset.eventId = event.id;
        row.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'select' && currentOnRowClickHandler) {
                currentOnRowClickHandler(event.id, row);
            }
        });

        const startTimeCell = row.insertCell();
        const startFormatted = formatUnixTimestamp(event.startTime);
        startTimeCell.innerHTML = `${startFormatted.dateString}<br><small>${startFormatted.timeString}</small>`;

        const endTimeCell = row.insertCell();
        const endFormatted = formatUnixTimestamp(event.endTime);
        endTimeCell.innerHTML = `${endFormatted.dateString}<br><small>${endFormatted.timeString}</small>`;

        row.insertCell().textContent = event.durationHours.toFixed(1);
        row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';
        let typeDisplay = event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'N/A';
        row.insertCell().textContent = typeDisplay;
        row.insertCell().textContent = (typeof event.rateOfChange === 'number') ? event.rateOfChange.toFixed(2) : 'N/A';

        const severityCell = row.insertCell();
        severityCell.textContent = event.severity || 'N/A';
        if (event.severity) {
            severityCell.classList.add(`severity-${(event.severity).toLowerCase()}`);
        }

        const migraineLogCell = row.insertCell();
        migraineLogCell.classList.add('migraine-log-cell');
        const selectMigraine = document.createElement('select');
        selectMigraine.classList.add('m3-table-select');
        selectMigraine.dataset.eventId = event.id;
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Log Migraine...";
        selectMigraine.appendChild(defaultOption);
        Config.MIGRAINE_SEVERITIES.forEach(severity => {
            const option = document.createElement('option');
            option.value = severity.toLowerCase();
            option.textContent = severity;
            selectMigraine.appendChild(option);
        });
        const loggedMigraine = currentEventMigraineLogs[event.id];
        if (loggedMigraine) {
            selectMigraine.value = loggedMigraine.severity.toLowerCase();
        }
        selectMigraine.addEventListener('change', (e) => {
            onEventMigraineChangeAppCallback(event.id, e.target);
        });
        migraineLogCell.appendChild(selectMigraine);

        const nowUnix = Math.floor(Date.now() / 1000);
        if (event.startTime <= nowUnix && event.endTime >= nowUnix) {
            row.classList.add('current-event');
        }
        if (!isShowAllEventsActive && event.id === currentlyHighlightedEventId) {
            row.classList.add('highlighted-automated-event-row');
        } else if (isShowAllEventsActive && event.id === currentlyHighlightedEventId) {
            row.classList.add('highlighted-automated-event-row');
        }
    });
}

export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById(Config.NOTIFICATION_AREA_ID);
    if (!notificationArea) {
        console.warn('Notification area not found in DOM for message:', message);
        return;
    }
    const notification = document.createElement('div');
    notification.classList.add('m3-notification', type);
    notification.textContent = message;
    notificationArea.appendChild(notification);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    });
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            try {
                if (notification.parentNode === notificationArea) {
                    notificationArea.removeChild(notification);
                }
            } catch(e) { /* ignore */ }
        }, { once: true });
    }, duration);
}

/**
 * Updates the visual state of the "Show All Events" toggle switch.
 * This is mainly for setting the initial state from persistence.
 * @param {boolean} isActive - Whether the toggle should be in the "on" state.
 */
export function updateShowAllEventsToggleState(isActive) {
    const toggleSwitch = document.getElementById(Config.SHOW_ALL_EVENTS_TOGGLE_ID);
    if (toggleSwitch) {
        toggleSwitch.checked = isActive;
        // CSS handles the visual update based on the :checked state
        // console.log(`Toggle switch ${Config.SHOW_ALL_EVENTS_TOGGLE_ID} state set to: ${isActive}`);
    } else {
        console.warn(`Toggle switch with ID ${Config.SHOW_ALL_EVENTS_TOGGLE_ID} not found when trying to update state.`);
    }
}
// filename: js/uiRenderer.js