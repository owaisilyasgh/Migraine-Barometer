// Configuration for automated peak/valley detection
const MIN_PRESSURE_CHANGE_HPA = 0.7; 
const MIN_DURATION_HOURS = 2;      

let pressureChartInstance = null;
let hourlyTimes = []; 
let hourlyPressures = [];
let currentPressureTime = null; 

let clickedChartTimestamp = null; 
let clickedChartPressure = null;
let markedEventStart = null; 
let markedEventEnd = null; 

let currentlyHighlightedEventId = null; 
const HIGHLIGHT_ANNOTATION_ID = 'userEventRangeHighlight';

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    loadPressureData();
    setupEventListeners();
    loadAndDisplayMigraines();
    loadAndDisplayUserMarkedEvents();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('Service Worker registered with scope:', registration.scope))
            .catch(error => console.error('Service Worker registration failed:', error));
    }
}

async function loadPressureData() {
    try {
        const response = await fetch('mock_pressure_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        hourlyTimes = data.hourly.time; 
        hourlyPressures = data.hourly.surface_pressure;
        currentPressureTime = data.current.time;

        if (hourlyTimes && hourlyTimes.length > 0 && hourlyPressures && hourlyPressures.length > 0) {
            initializeChart(hourlyTimes, hourlyPressures, currentPressureTime);
            detectAndDisplayPressureEvents(hourlyTimes, hourlyPressures); // Ensure this is called
        } else {
            console.error("No hourly data available or data is malformed.");
            showNotification("Error: No pressure data loaded or data is malformed.", "error");
            // Clear chart and table if data is bad
            if (pressureChartInstance) { pressureChartInstance.destroy(); pressureChartInstance = null; }
            const autoTableBody = document.getElementById('pressureEventsTable').getElementsByTagName('tbody')[0];
            if (autoTableBody) autoTableBody.innerHTML = '<tr><td colspan="5">Error loading pressure data.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading pressure data:', error);
        showNotification(`Error loading pressure data: ${error.message}.`, "error");
        if (pressureChartInstance) { pressureChartInstance.destroy(); pressureChartInstance = null; }
        const autoTableBody = document.getElementById('pressureEventsTable').getElementsByTagName('tbody')[0];
        if (autoTableBody) autoTableBody.innerHTML = `<tr><td colspan="5">Error loading pressure data: ${error.message}.</td></tr>`;
    }
}

function formatUnixTimestamp(unixTimestamp, formatType = 'datetime') {
    if (unixTimestamp === null || typeof unixTimestamp === 'undefined') return 'N/A';
    const date = new Date(unixTimestamp * 1000);
    if (formatType === 'datetime') { return date.toLocaleString(); }
    if (formatType === 'chartaxis') { return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`; }
    return date.toLocaleString(); 
}

function initializeChart(times, pressures, currentPressureTimeMarker) {
    const ctx = document.getElementById('pressureChart').getContext('2d');
    if (!ctx) { console.error("Canvas context not found for pressureChart"); return; }
    const dataPoints = times.map((time, index) => ({ x: time * 1000, y: pressures[index] }));
    const currentTimestampMs = currentPressureTimeMarker * 1000;
    if (pressureChartInstance) { pressureChartInstance.destroy(); }
    pressureChartInstance = new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ label: 'Surface Pressure (hPa)', data: dataPoints, borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', tension: 0.1, pointRadius: 2, pointHoverRadius: 5 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { parser: 'MMM d, yyyy, HH:mm', tooltipFormat: 'MMM d, yyyy, HH:mm', displayFormats: { hour: 'MMM d, HH:mm' } }, ticks: { callback: (val) => `${new Date(val).getDate()} ${new Date(val).toLocaleString('default', {month:'short'})}, ${new Date(val).getHours().toString().padStart(2,'0')}:${new Date(val).getMinutes().toString().padStart(2,'0')}`, autoSkip: true, maxTicksLimit: 15 }, title: { display: true, text: 'Time' } },
                y: { title: { display: true, text: 'Pressure (hPa)' } }
            },
            plugins: {
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label || ''}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + ' hPa' : ''}`, title: (items) => formatUnixTimestamp(new Date(items[0].parsed.x).getTime()/1000, 'datetime') } },
                annotation: { annotations: { currentTimeLine: { type: 'line', xMin: currentTimestampMs, xMax: currentTimestampMs, borderColor: 'rgb(255, 99, 132)', borderWidth: 2, label: { content: 'Current', display: true, position: 'start' } } } }
            },
            onClick: handleChartClick
        }
    });
}

function updateChartHighlight(startTime, endTime, eventId) {
    if (!pressureChartInstance || !pressureChartInstance.options || !pressureChartInstance.options.plugins || !pressureChartInstance.options.plugins.annotation) {
        console.error("Chart instance or annotation plugin not ready for highlighting."); return;
    }
    const annotations = pressureChartInstance.options.plugins.annotation.annotations;
    if (annotations[HIGHLIGHT_ANNOTATION_ID]) { delete annotations[HIGHLIGHT_ANNOTATION_ID]; }
    if (startTime !== null && endTime !== null) {
        annotations[HIGHLIGHT_ANNOTATION_ID] = { type: 'box', xMin: startTime * 1000, xMax: endTime * 1000, backgroundColor: 'rgba(255, 204, 0, 0.3)', borderColor: 'rgba(255, 204, 0, 0.5)', borderWidth: 1 };
        currentlyHighlightedEventId = eventId;
    } else { currentlyHighlightedEventId = null; }
    pressureChartInstance.update();
    document.querySelectorAll('#userMarkedEventsTable tbody tr').forEach(row => {
        row.classList.remove('highlighted-event-row');
        if (currentlyHighlightedEventId && parseInt(row.dataset.eventId) === currentlyHighlightedEventId) {
            row.classList.add('highlighted-event-row');
        }
    });
}

function handleChartClick(event, elements) {
    if (elements.length > 0) {
        const dataIndex = elements[0].index;
        clickedChartTimestamp = hourlyTimes[dataIndex]; 
        clickedChartPressure = hourlyPressures[dataIndex];
        document.getElementById('clickedChartTime').textContent = formatUnixTimestamp(clickedChartTimestamp);
        document.getElementById('clickedChartPressure').textContent = `${clickedChartPressure.toFixed(1)} hPa`;
        updateMarkingButtonStates();
    }
}

// Function to detect and display automated pressure events - CRITICAL RESTORATION
function detectAndDisplayPressureEvents(times, pressures) {
    const events = [];
    const tableBody = document.getElementById('pressureEventsTable').getElementsByTagName('tbody')[0];
    if (!tableBody) { console.error("Automated pressure events table body not found."); return; }
    tableBody.innerHTML = ''; 

    if (!times || !pressures || pressures.length < 3 || times.length !== pressures.length) {
        const row = tableBody.insertRow(); const cell = row.insertCell(); cell.colSpan = 5;
        cell.textContent = 'Not enough data for automated event detection.'; cell.style.textAlign = 'center';
        return;
    }

    let trend = 'none'; let trendStartIndex = 0;
    for (let i = 1; i < pressures.length; i++) {
        const pressureDiff = pressures[i] - pressures[i-1];
        if (trend === 'none') {
            if (pressureDiff > 0.01) trend = 'rising'; else if (pressureDiff < -0.01) trend = 'falling';
            if (trend !== 'none') trendStartIndex = i - 1;
        } else if (trend === 'rising' && pressureDiff < -0.01) {
            const peakIndex = i - 1; const pChange = pressures[peakIndex] - pressures[trendStartIndex];
            const durHrs = (times[peakIndex] - times[trendStartIndex]) / 3600;
            if (Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA && durHrs >= MIN_DURATION_HOURS) {
                events.push({ start: times[trendStartIndex], end: times[peakIndex], duration: durHrs, change: pChange, type: 'Peak' });
            }
            trend = 'falling'; trendStartIndex = peakIndex;
        } else if (trend === 'falling' && pressureDiff > 0.01) {
            const valleyIndex = i - 1; const pChange = pressures[valleyIndex] - pressures[trendStartIndex];
            const durHrs = (times[valleyIndex] - times[trendStartIndex]) / 3600;
            if (Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA && durHrs >= MIN_DURATION_HOURS) {
                events.push({ start: times[trendStartIndex], end: times[valleyIndex], duration: durHrs, change: pChange, type: 'Valley' });
            }
            trend = 'rising'; trendStartIndex = valleyIndex;
        }
    }
    const timeStepHours = (times.length > 1 && times[0] !== undefined && times[1] !== undefined) ? (times[1]-times[0])/3600 : 1;
    const minPointsForTrend = MIN_DURATION_HOURS / timeStepHours;
    if (trend !== 'none' && (pressures.length - 1 - trendStartIndex) >= minPointsForTrend ) {
        const endIndex = pressures.length - 1; const pChange = pressures[endIndex] - pressures[trendStartIndex];
        const durHrs = (times[endIndex] - times[trendStartIndex]) / 3600;
        if (Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
             events.push({ start: times[trendStartIndex], end: times[endIndex], duration: durHrs, change: pChange, type: trend === 'rising' ? 'Ongoing Rise' : 'Ongoing Fall' });
        }
    }

    if (events.length === 0) {
        const row = tableBody.insertRow(); const cell = row.insertCell(); cell.colSpan = 5;
        cell.textContent = 'No significant automated events detected.'; cell.style.textAlign = 'center';
        return;
    }
    const nowUnix = Math.floor(Date.now() / 1000);
    events.forEach(event => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = formatUnixTimestamp(event.start);
        row.insertCell().textContent = formatUnixTimestamp(event.end);
        row.insertCell().textContent = event.duration.toFixed(1);
        row.insertCell().textContent = typeof event.change === 'number' ? event.change.toFixed(1) : 'N/A';
        row.insertCell().textContent = event.type;
        if (nowUnix >= event.start && nowUnix <= event.end) { row.classList.add('current-event'); }
    });
}

function showNotification(message, type = 'info', duration = 3000) { /* ... (same as before) ... */ }
function setupEventListeners() { /* ... (same as before) ... */ }
function updateMarkingButtonStates() { /* ... (same as before) ... */ }
function clearMarking() { /* ... (same as before) ... */ }
function saveUserMarkedEvent() { /* ... (same as before, ensures duration and isMerged:false) ... */ }
function handleUserMarkedEventDelete(eventId, buttonElement) { /* ... (same as before) ... */ }
function loadAndDisplayUserMarkedEvents() { /* ... (same as before, ensures tabular display, duration, merged flag (M), and click for highlight) ... */ }

// Function to update merge button state - CRITICAL FIX
function updateMergeButtonState() {
    const checkboxes = document.querySelectorAll('#userMarkedEventsTable tbody input[type="checkbox"]:checked'); // Corrected selector target
    const mergeButton = document.getElementById('mergeEventsBtn');
    if (mergeButton) { // Check if button exists
        mergeButton.disabled = checkboxes.length !== 2;
    }
}

function handleMergeEvents() { /* ... (same as before, ensures isMerged:true on new event) ... */ }
function handleMigraineSubmit(event) { /* ... (same as before) ... */ }
function loadAndDisplayMigraines() { /* ... (same as before) ... */ }
function exportUserEvents() { /* ... (same as before, includes duration and isMerged) ... */ }


// --- RE-PASTING FULL FUNCTIONS THAT WERE ABBREVIATED OR MODIFIED ---

function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById('notification-area');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationArea.appendChild(notification);
    requestAnimationFrame(() => { notification.classList.add('show'); });
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode === notificationArea) { notificationArea.removeChild(notification); }
        }, 300);
    }, duration);
}

function setupEventListeners() {
    document.getElementById('migraineForm').addEventListener('submit', handleMigraineSubmit);
    document.getElementById('markStartTimeBtn').addEventListener('click', () => {
        if (clickedChartTimestamp !== null) {
            markedEventStart = clickedChartTimestamp;
            document.getElementById('selectedStartTimeDisplay').textContent = formatUnixTimestamp(markedEventStart);
            updateMarkingButtonStates();
        } else { showNotification("Please click on the chart to select a data point first.", "error"); }
    });
    document.getElementById('markEndTimeBtn').addEventListener('click', () => {
        if (clickedChartTimestamp !== null) {
            if (markedEventStart !== null && clickedChartTimestamp < markedEventStart) {
                showNotification("End time cannot be before start time.", "error"); return;
            }
            markedEventEnd = clickedChartTimestamp;
            document.getElementById('selectedEndTimeDisplay').textContent = formatUnixTimestamp(markedEventEnd);
            updateMarkingButtonStates();
        } else { showNotification("Please click on the chart to select a data point first.", "error"); }
    });
    document.getElementById('saveMarkedEventBtn').addEventListener('click', saveUserMarkedEvent);
    document.getElementById('clearMarkingBtn').addEventListener('click', clearMarking);
    document.getElementById('exportUserEventsBtn').addEventListener('click', exportUserEvents);
    document.getElementById('mergeEventsBtn').addEventListener('click', handleMergeEvents);
}

function updateMarkingButtonStates() {
    const markStartBtn = document.getElementById('markStartTimeBtn');
    const markEndBtn = document.getElementById('markEndTimeBtn');
    const saveBtn = document.getElementById('saveMarkedEventBtn');
    const clearBtn = document.getElementById('clearMarkingBtn');
    markStartBtn.disabled = clickedChartTimestamp === null && markedEventStart === null;
    markEndBtn.disabled = markedEventStart === null || clickedChartTimestamp === null;
    saveBtn.disabled = markedEventStart === null || markedEventEnd === null;
    clearBtn.disabled = markedEventStart === null && markedEventEnd === null && clickedChartTimestamp === null;
}

function clearMarking() {
    clickedChartTimestamp = null; clickedChartPressure = null;
    markedEventStart = null; markedEventEnd = null;
    document.getElementById('clickedChartTime').textContent = 'N/A';
    document.getElementById('clickedChartPressure').textContent = 'N/A';
    document.getElementById('selectedStartTimeDisplay').textContent = 'N/A';
    document.getElementById('selectedEndTimeDisplay').textContent = 'N/A';
    updateMarkingButtonStates();
    updateChartHighlight(null,null,null); // Clear chart highlight
}

function saveUserMarkedEvent() {
    if (!markedEventStart || !markedEventEnd) { showNotification("Please mark both start and end times.", "error"); return; }
    if (markedEventEnd < markedEventStart) { showNotification("End time cannot be before start time.", "error"); return; }
    const userEvents = db.loadData('userMarkedEvents') || [];
    const startIdx = hourlyTimes.indexOf(markedEventStart); const endIdx = hourlyTimes.indexOf(markedEventEnd);
    const startPVal = (startIdx !== -1) ? hourlyPressures[startIdx] : null;
    const endPVal = (endIdx !== -1) ? hourlyPressures[endIdx] : null;
    let pChangeVal = null;
    if (startPVal !== null && endPVal !== null) { pChangeVal = parseFloat((endPVal - startPVal).toFixed(1)); }
    const durSecs = markedEventEnd - markedEventStart; const durHrs = parseFloat((durSecs / 3600).toFixed(1));
    const newEvent = {
        id: Date.now(), startTime: markedEventStart, endTime: markedEventEnd,
        durationHours: durHrs, 
        startPressure: startPVal !== null ? parseFloat(startPVal.toFixed(1)) : null,
        endPressure: endPVal !== null ? parseFloat(endPVal.toFixed(1)) : null,
        pressureChange: pChangeVal, isMerged: false 
    };
    userEvents.push(newEvent); db.saveData('userMarkedEvents', userEvents);
    loadAndDisplayUserMarkedEvents(); clearMarking();
    showNotification("Pressure event saved!", "success");
}

function handleUserMarkedEventDelete(eventId, buttonElement) {
    document.querySelectorAll('#userMarkedEventsTable tbody button[data-confirming="true"]').forEach(btn => { // Corrected selector
        if (btn !== buttonElement) { 
            btn.textContent = 'Delete'; btn.classList.remove('confirm-delete-btn');
            btn.classList.add('delete-event-btn'); delete btn.dataset.confirming;
        }
    });
    if (buttonElement.dataset.confirming === "true") {
        let userEvents = db.loadData('userMarkedEvents') || [];
        userEvents = userEvents.filter(event => event.id !== eventId);
        db.saveData('userMarkedEvents', userEvents);
        loadAndDisplayUserMarkedEvents();
        if(eventId === currentlyHighlightedEventId) { updateChartHighlight(null,null,null); } // Clear highlight if deleted event was highlighted
        showNotification("Event deleted.", "success");
    } else {
        buttonElement.textContent = 'Confirm Delete?';
        buttonElement.classList.remove('delete-event-btn'); buttonElement.classList.add('confirm-delete-btn');
        buttonElement.dataset.confirming = "true";
        setTimeout(() => {
            if (buttonElement.dataset.confirming === "true") {
                buttonElement.textContent = 'Delete';
                buttonElement.classList.remove('confirm-delete-btn'); buttonElement.classList.add('delete-event-btn');
                delete buttonElement.dataset.confirming;
            }
        }, 5000);
    }
}

function loadAndDisplayUserMarkedEvents() {
    const userEvents = db.loadData('userMarkedEvents') || [];
    const tableBody = document.getElementById('userMarkedEventsTable').getElementsByTagName('tbody')[0];
    if (!tableBody) { console.error("User marked events table body not found."); return; }
    tableBody.innerHTML = ''; 
    if (userEvents.length === 0) {
        const row = tableBody.insertRow(); const cell = row.insertCell(); cell.colSpan = 8; 
        cell.textContent = 'No user-marked events yet.'; cell.style.textAlign = 'center';
        updateMergeButtonState(); return;
    }
    userEvents.sort((a,b) => a.startTime - b.startTime).forEach(event => {
        const row = tableBody.insertRow(); row.dataset.eventId = event.id; 
        const cellSelect = row.insertCell(); const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.dataset.eventId = event.id;
        checkbox.addEventListener('change', updateMergeButtonState); cellSelect.appendChild(checkbox);
        row.insertCell().textContent = formatUnixTimestamp(event.startTime);
        row.insertCell().textContent = formatUnixTimestamp(event.endTime);
        const durationCell = row.insertCell();
        let durationText = event.durationHours !== undefined ? event.durationHours.toFixed(1) : 'N/A';
        if (event.isMerged) { durationText += ` <span class="merged-indicator">(M)</span>`; }
        durationCell.innerHTML = durationText;
        const startP = event.startPressure !== null && typeof event.startPressure === 'number' ? event.startPressure.toFixed(1) : 'N/A';
        row.insertCell().textContent = startP;
        const endP = event.endPressure !== null && typeof event.endPressure === 'number' ? event.endPressure.toFixed(1) : 'N/A';
        row.insertCell().textContent = endP;
        let changeP = 'N/A';
        if (event.pressureChange !== null && typeof event.pressureChange === 'number') {
            changeP = event.pressureChange.toFixed(1);
        } else if (typeof event.pressureChange === 'string') {
            const parsedChange = parseFloat(event.pressureChange); if (!isNaN(parsedChange)) changeP = parsedChange.toFixed(1);
        }
        row.insertCell().textContent = changeP;
        const cellAction = row.insertCell(); const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete'; deleteButton.classList.add('delete-event-btn');
        deleteButton.onclick = (e) => { e.stopPropagation(); handleUserMarkedEventDelete(event.id, deleteButton); };
        cellAction.appendChild(deleteButton);
        Array.from(row.cells).forEach((cell, index) => {
            if (index !== 0 && index !== (row.cells.length -1) ) { 
                 cell.style.cursor = 'pointer'; // Indicate clickable
                 cell.addEventListener('click', () => {
                    if (event.id === currentlyHighlightedEventId) { updateChartHighlight(null, null, null); } 
                    else { updateChartHighlight(event.startTime, event.endTime, event.id); }
                });
            }
        });
        if (parseInt(row.dataset.eventId) === currentlyHighlightedEventId) { row.classList.add('highlighted-event-row'); }
    });
    updateMergeButtonState();
}

function handleMergeEvents() {
    const selectedCheckboxes = Array.from(document.querySelectorAll('#userMarkedEventsTable tbody input[type="checkbox"]:checked')); // Corrected selector
    if (selectedCheckboxes.length !== 2) { showNotification("Please select exactly two events to merge.", "error"); return; }
    const eventIdsToMerge = selectedCheckboxes.map(cb => parseInt(cb.dataset.eventId));
    let allUserEvents = db.loadData('userMarkedEvents') || [];
    const eventsToMerge = allUserEvents.filter(event => eventIdsToMerge.includes(event.id));
    if (eventsToMerge.length !== 2) { showNotification("Error finding events to merge.", "error"); return; }
    const event1 = eventsToMerge[0]; const event2 = eventsToMerge[1];
    const mergedStartTime = Math.min(event1.startTime, event2.startTime);
    const mergedEndTime = Math.max(event1.endTime, event2.endTime);
    const mergedStartIdx = hourlyTimes.indexOf(mergedStartTime); const mergedEndIdx = hourlyTimes.indexOf(mergedEndTime);
    const mergedStartP = (mergedStartIdx !== -1) ? hourlyPressures[mergedStartIdx] : null;
    const mergedEndP = (mergedEndIdx !== -1) ? hourlyPressures[mergedEndIdx] : null;
    let mergedPChange = null;
    if (mergedStartP !== null && mergedEndP !== null) { mergedPChange = parseFloat((mergedEndP - mergedStartP).toFixed(1)); }
    const mergedDurSecs = mergedEndTime - mergedStartTime; const mergedDurHrs = parseFloat((mergedDurSecs / 3600).toFixed(1));
    const mergedEvent = {
        id: Date.now(), startTime: mergedStartTime, endTime: mergedEndTime,
        durationHours: mergedDurHrs, 
        startPressure: mergedStartP !== null ? parseFloat(mergedStartP.toFixed(1)) : null,
        endPressure: mergedEndP !== null ? parseFloat(mergedEndP.toFixed(1)) : null,
        pressureChange: mergedPChange, isMerged: true 
    };
    allUserEvents = allUserEvents.filter(event => !eventIdsToMerge.includes(event.id));
    allUserEvents.push(mergedEvent); db.saveData('userMarkedEvents', allUserEvents);
    loadAndDisplayUserMarkedEvents();
    if(eventIdsToMerge.includes(currentlyHighlightedEventId)) { updateChartHighlight(null,null,null); } // Clear highlight if merged events were highlighted
    showNotification("Events merged successfully!", "success");
}

function handleMigraineSubmit(event) { /* ... (same as before) ... */ }
function loadAndDisplayMigraines() { /* ... (same as before) ... */ }
function exportUserEvents() { /* ... (same as before) ... */ }

// Re-pasting previously identical functions for completeness in this Act
function handleMigraineSubmit(event) {
    event.preventDefault();
    const startTimeInput = document.getElementById('migraineStartTime').value;
    const endTimeInput = document.getElementById('migraineEndTime').value;
    if (!startTimeInput || !endTimeInput) { showNotification("Please select both start and end times.", "error"); return; }
    const startTimeUnix = Math.floor(new Date(startTimeInput).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(endTimeInput).getTime() / 1000);
    if (endTimeUnix < startTimeUnix) { showNotification("Migraine end time cannot be before start time.", "error"); return; }
    const migraines = db.loadData('migraines') || [];
    migraines.push({ id: Date.now(), startTime: startTimeUnix, endTime: endTimeUnix }); 
    db.saveData('migraines', migraines);
    loadAndDisplayMigraines(); document.getElementById('migraineForm').reset();
    showNotification("Migraine event logged!", "success");
}

function loadAndDisplayMigraines() {
    const migraines = db.loadData('migraines') || [];
    const listElement = document.getElementById('migraineList');
    listElement.innerHTML = ''; 
    if (migraines.length === 0) { listElement.innerHTML = '<li>No migraines logged yet.</li>'; return; }
    migraines.sort((a,b) => b.startTime - a.startTime); 
    migraines.forEach(migraine => {
        const listItem = document.createElement('li');
        listItem.textContent = `From: ${formatUnixTimestamp(migraine.startTime)} To: ${formatUnixTimestamp(migraine.endTime)}`;
        listElement.appendChild(listItem);
    });
}

function exportUserEvents() {
    const userEvents = db.loadData('userMarkedEvents') || [];
    if (userEvents.length === 0) { showNotification("No marked events to export.", "info"); return; }
    const jsonData = JSON.stringify(userEvents, null, 2); 
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'user_marked_pressure_events.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showNotification("User marked events exported.", "success");
}