// js/uiRenderer.js
import { formatUnixTimestamp, createRipple } from './utils.js';
import * as Config from './config.js';

let currentOnRowClickHandler = null; 

/**
 * Sets the handler function to be called when an automated event row is clicked.
 * @param {Function} handler - The function to call (receives eventId and rowElement).
 */
export function setCurrentHighlightHandler(handler) {
    currentOnRowClickHandler = handler;
}

/**
 * Renders the table of automated pressure events.
 * @param {Array<Object>} eventsToRender - The array of event objects to display.
 * @param {string|null} currentlyHighlightedEventId - ID of the event that should be marked as highlighted.
 * @param {Object} currentEventMigraineLogs - Migraine logs { eventId: { severity, loggedAt } }.
 * @param {Function} onEventMigraineChangeAppCallback - Callback to app.js for select change.
 * @param {Function} onCheckboxChangeAppCallback - Callback to app.js for checkbox state change.
 * @param {boolean} isShowAllEventsActive - Whether the "Show All Events" toggle is active.
 */
export function renderAutomatedEventsTable(
    eventsToRender,
    currentlyHighlightedEventId,
    currentEventMigraineLogs,
    onEventMigraineChangeAppCallback,
    onCheckboxChangeAppCallback,
    isShowAllEventsActive
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
        cell.colSpan = 9; 
        cell.textContent = 'No automated pressure events detected or to display.';
        cell.style.textAlign = 'center';
    } else {
        eventsToRender.forEach(event => {
            const row = tableBody.insertRow();
            row.dataset.eventId = event.id; 

            if (event.isMerged) {
                row.classList.add('merged-event-row'); 
            }

            row.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
                    if (currentOnRowClickHandler) currentOnRowClickHandler(event.id, row);
                }
            });

            const cellSelect = row.insertCell();
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.eventId = event.id;
            checkbox.classList.add('m3-table-checkbox'); 
            checkbox.addEventListener('change', () => onCheckboxChangeAppCallback()); 
            cellSelect.appendChild(checkbox);

            row.insertCell().textContent = formatUnixTimestamp(event.startTime);
            row.insertCell().textContent = formatUnixTimestamp(event.endTime);
            row.insertCell().textContent = event.durationHours.toFixed(1);
            row.insertCell().textContent = typeof event.pressureChange === 'number' ? event.pressureChange.toFixed(1) : 'N/A';
            
            let typeDisplay = event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'N/A';
            if (event.isMerged) typeDisplay += " (Merged)";
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
            if (nowUnix >= event.startTime && nowUnix <= event.endTime && !event.isMerged) {
                 row.classList.add('current-event');
            }
             // Only add distinct highlight class if "Show All" is OFF and this event is the one
            if (event.id === currentlyHighlightedEventId && !isShowAllEventsActive) {
                row.classList.add('highlighted-automated-event-row');
            }
        });
    }
    onCheckboxChangeAppCallback();
}

/**
 * Updates the enabled/disabled state of merge/unmerge buttons.
 * @param {number} numberOfSelectedItems - How many checkboxes are selected.
 * @param {boolean} isSingleSelectedEventAMergedOne - If exactly one item is selected, is it a merged event?
 */
export function updateAutomatedEventActionButtonsState(numberOfSelectedItems, isSingleSelectedEventAMergedOne) {
    const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
    const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);

    if (mergeBtn) {
        mergeBtn.disabled = numberOfSelectedItems < 2;
        mergeBtn.textContent = `Merge Selected (${numberOfSelectedItems > 0 ? numberOfSelectedItems : ''})`;
    } else {
        console.warn(`Button with ID ${Config.MERGE_EVENTS_BTN_ID} not found.`);
    }

    if (unmergeBtn) {
        unmergeBtn.disabled = !(numberOfSelectedItems === 1 && isSingleSelectedEventAMergedOne);
    } else {
        console.warn(`Button with ID ${Config.UNMERGE_EVENT_BTN_ID} not found.`);
    }
}


/**
 * Displays a notification message.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'warning'|'error'} type - The type of notification.
 * @param {number} duration - How long to display the notification in ms.
 */
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
            if (notification.parentElement === notificationArea) { 
                notificationArea.removeChild(notification);
            }
        }, { once: true });
    }, duration);
}

/**
 * Updates the visual state (text and active class) of the "Show All Events" button.
 * @param {boolean} isActive - Whether the toggle is currently active.
 */
export function updateShowAllEventsButtonState(isActive) {
    const showAllBtn = document.getElementById(Config.SHOW_ALL_EVENTS_BTN_ID);
    if (showAllBtn) {
        if (isActive) {
            showAllBtn.textContent = "Hide All on Chart";
            showAllBtn.classList.add('m3-button--active');
        } else {
            showAllBtn.textContent = "Show All on Chart";
            showAllBtn.classList.remove('m3-button--active');
        }
    }
}

// The renderShowAllEventsToggle function is removed as the button is now static HTML.
// Its state will be managed by app.js directly.

// filename: js/uiRenderer.js