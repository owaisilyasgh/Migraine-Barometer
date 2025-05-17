// filename: js/uiRenderer.js
import * as G_CONFIG from './config.js';
import { formatUnixTimestamp, createRipple } from './utils.js';

// Callbacks to app.js
let onEventMigraineChangeAppCallback = null;
let onShowAllEventsToggleAppCallback = null;
let onReturnToCurrentAppCallback = null;
let onSwipeEventAppCallback = null; // Callback when card is swiped to
let onRefreshDataAppCallback = null;

// Carousel State
let eventCardsData = []; // All events data for the carousel
let currentCardIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

export function setAppCallbacks(callbacks) {
    if (callbacks.onEventMigraineChange) onEventMigraineChangeAppCallback = callbacks.onEventMigraineChange;
    if (callbacks.onShowAllEventsToggle) onShowAllEventsToggleAppCallback = callbacks.onShowAllEventsToggle;
    if (callbacks.onReturnToCurrent) onReturnToCurrentAppCallback = callbacks.onReturnToCurrent;
    if (callbacks.onSwipeEvent) onSwipeEventAppCallback = callbacks.onSwipeEvent;
    if (callbacks.onRefreshData) onRefreshDataAppCallback = callbacks.onRefreshData;
}

export function renderEventsDisplay(
    processedEvents,
    migraineLogs,
    currentlyFocusedEventId,
    isShowAllEventsActive,
    appStatus
) {
    const eventsSectionCardContent = document.querySelector(`#${G_CONFIG.PRESSURE_EVENTS_SECTION_ID} > .m3-card__content`);
    const chartControlsSectionCardContent = document.querySelector(`#${G_CONFIG.CHART_CONTROLS_SECTION_ID} > .m3-card__content`);

    if (!eventsSectionCardContent || !chartControlsSectionCardContent) {
        if (G_CONFIG.DEBUG_MODE) console.error("UIRenderer: Required card content sections not found.");
        return;
    }

    // Clear previous content
    eventsSectionCardContent.innerHTML = '';
    chartControlsSectionCardContent.innerHTML = '';

    // Render chart interaction controls (toggle, return to current)
    renderChartInteractionControls(chartControlsSectionCardContent, isShowAllEventsActive);

    // Handle different application/data states for the events section
    if (appStatus && appStatus.status === 'loading') {
        renderLoadingState(eventsSectionCardContent);
        return; // Don't render carousel or other states if loading
    }

    if (appStatus && (appStatus.status === 'stale_ui_only' || appStatus.status === 'stale_api_cooldown' || appStatus.status.startsWith('error_'))) {
        renderSpecialStateCard(eventsSectionCardContent, appStatus.status, appStatus.message);
        if (appStatus.status.startsWith('error_') || appStatus.status === 'stale_api_cooldown') {
            // For hard errors or when API is on cooldown and no data is available,
            // we might not want to show the carousel at all.
            // The special state card is enough.
            if (G_CONFIG.DEBUG_MODE) console.log("UIRenderer: Displaying error/cooldown card, not rendering event carousel.");
            return; // Stop further rendering for these specific states
        }
        // For 'stale_ui_only', we still show the carousel with cached data after the message.
    }

    if (processedEvents && processedEvents.length > 0) {
        renderFocusedEventCarousel(eventsSectionCardContent, processedEvents, migraineLogs, currentlyFocusedEventId);
    } else if (!appStatus || (!appStatus.status.startsWith('error_') && appStatus.status !== 'loading' && appStatus.status !== 'stale_api_cooldown')) {
        // Only show "No events" if not in a loading, error, or cooldown state that already has a message
        const noEventsMsg = document.createElement('p');
        noEventsMsg.textContent = "No significant pressure events detected or data available for the selected period.";
        noEventsMsg.style.textAlign = 'center';
        noEventsMsg.style.padding = '20px';
        eventsSectionCardContent.appendChild(noEventsMsg);
        if (G_CONFIG.DEBUG_MODE) console.log("UIRenderer: No events, rendering 'no events' message.");
    }
}

function renderChartInteractionControls(container, isShowAllEventsActive) {
    const controlsGroupDiv = document.createElement('div');
    controlsGroupDiv.className = 'automated-events-controls'; // Use this class for flex layout

    renderShowAllEventsToggle(controlsGroupDiv, isShowAllEventsActive);
    renderReturnToCurrentButton(controlsGroupDiv);

    container.appendChild(controlsGroupDiv);
}

function renderShowAllEventsToggle(container, isShowAllEventsActive) {
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'm3-toggle-switch-container';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID; // Use ID from config
    input.className = 'm3-toggle-switch-input';
    input.checked = isShowAllEventsActive;
    if (onShowAllEventsToggleAppCallback) {
        input.addEventListener('change', onShowAllEventsToggleAppCallback);
    }

    const label = document.createElement('label');
    label.className = 'm3-toggle-switch-label';
    label.setAttribute('for', G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID);
    label.innerHTML = `
        <div class="m3-toggle-switch-track"></div>
        <div class="m3-toggle-switch-thumb-container">
            <div class="m3-toggle-switch-thumb"></div>
        </div>
    `;

    const textLabel = document.createElement('label');
    textLabel.className = 'm3-toggle-switch-text-label';
    textLabel.setAttribute('for', G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID);
    textLabel.textContent = 'Show All Events on Chart';

    toggleContainer.append(input, label, textLabel);
    container.appendChild(toggleContainer);
}

function renderReturnToCurrentButton(container) {
    const button = document.createElement('button');
    button.id = 'returnToCurrentEventBtn';
    button.className = 'm3-button m3-button-text return-to-current-btn'; // Text button style
    button.innerHTML = '<span class="material-icons">gps_fixed</span> Return to Current';
    if (onReturnToCurrentAppCallback) {
        button.addEventListener('click', (event) => {
            createRipple(event);
            if (onReturnToCurrentAppCallback) onReturnToCurrentAppCallback();
        });
    }
    container.appendChild(button);
}

function renderLoadingState(container) {
    // Reuse special card styling for consistency if desired, or simple text
    container.innerHTML = ''; // Clear previous
    const loadingP = document.createElement('p');
    loadingP.textContent = "Loading pressure data and events...";
    loadingP.style.textAlign = 'center';
    loadingP.style.padding = '20px';
    container.appendChild(loadingP);
    if (G_CONFIG.DEBUG_MODE) console.log("UIRenderer: Displaying Loading State.");
}

function renderSpecialStateCard(container, status, message) {
    // This function will now render inside the #pressure-events-section > .m3-card__content
    // It should clear the container before adding the special card
    container.innerHTML = '';

    const cardElement = document.createElement('div');
    // Using 'event-card' for some base styling, but also 'special-state-card' for overrides
    cardElement.className = 'event-card special-state-card';

    if (status.includes('stale')) {
        // Could be 'stale_ui_only' or 'stale_api_cooldown'
        cardElement.classList.add('warning');
    } else if (status.includes('error')) {
        // e.g., 'error_api', 'error_cache', 'error_no_data'
        cardElement.classList.add('error');
    }
    // Default to info if no specific class matches (though less likely with current statuses)

    const titleElement = document.createElement('h3');
    titleElement.className = 'm3-card__title'; // Use card title style
    if (status.includes('stale')) titleElement.textContent = "Cached Data";
    else if (status.includes('error')) titleElement.textContent = "Data Error";
    else titleElement.textContent = "Information";
    cardElement.appendChild(titleElement);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'm3-card__content'; // Use card content style

    const messageP = document.createElement('p');
    messageP.textContent = message || "An update regarding the data status.";
    contentWrapper.appendChild(messageP);

    // Add refresh button for specific states
    if (status.includes('stale') || status === 'error_api_no_cache' || status === 'error_api_process' || status === 'error_api') {
        const refreshButton = document.createElement('button');
        refreshButton.id = 'refreshDataButton';
        refreshButton.className = 'm3-button m3-button-filled';
        refreshButton.textContent = 'Refresh Data';
        if (onRefreshDataAppCallback) {
            refreshButton.addEventListener('click', (event) => {
                createRipple(event);
                if (onRefreshDataAppCallback) onRefreshDataAppCallback();
            });
        }
        contentWrapper.appendChild(refreshButton);
    }

    cardElement.appendChild(contentWrapper);
    container.appendChild(cardElement);
    if (G_CONFIG.DEBUG_MODE) console.log(`UIRenderer: Displaying Special State Content. Status: ${status}, Message: ${message}`);
}


function renderFocusedEventCarousel(container, processedEvents, migraineLogs, focusedEventId) {
    const carouselViewport = document.createElement('div'); // Renamed for clarity
    carouselViewport.id = G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID; // Assign an ID for easier selection
    carouselViewport.className = 'focused-event-carousel-container'; // This is the viewport
    container.appendChild(carouselViewport); // Add to main page section first

    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'event-card-wrapper'; // This is the sliding strip
    carouselViewport.appendChild(cardWrapper);

    eventCardsData = processedEvents; // Store data for swipe logic

    if (!eventCardsData || eventCardsData.length === 0) {
        if (G_CONFIG.DEBUG_MODE) console.log("UIRenderer Carousel: No events for carousel.");
        // Optionally, display a message directly here or let renderEventsDisplay handle it.
        // For now, just ensure the structure is there but empty.
        container.appendChild(carouselViewport); // Append empty carousel structure
        return;
    }

    let initialIndex = eventCardsData.findIndex(event => event.id === focusedEventId);
    if (initialIndex === -1) {
        initialIndex = 0; // Default to the first card if focusedEventId is not found
        if (G_CONFIG.DEBUG_MODE) console.warn(`UIRenderer Carousel: focusedEventId ${focusedEventId} not found. Defaulting to index 0.`);
    }
    currentCardIndex = initialIndex;

    eventCardsData.forEach(eventData => {
        const card = createEventCardDOM(eventData, migraineLogs);
        cardWrapper.appendChild(card); // Cards go into the wrapper
    });

    // Create bottom controls (nav buttons, position indicator)
    const bottomControls = document.createElement('div');
    bottomControls.className = 'carousel-bottom-controls';

    const prevButton = document.createElement('button');
    prevButton.className = 'carousel-nav prev m3-button-icon'; // Basic button classes
    prevButton.innerHTML = '<span class="material-icons">arrow_back_ios</span>';
    prevButton.setAttribute('aria-label', 'Previous Event');
    prevButton.addEventListener('click', () => swipeCard('prev'));
    bottomControls.appendChild(prevButton);

    const positionIndicator = document.createElement('div');
    positionIndicator.className = 'carousel-position-indicator';
    // Text updated in updateCarouselView
    bottomControls.appendChild(positionIndicator);

    const nextButton = document.createElement('button');
    nextButton.className = 'carousel-nav next m3-button-icon'; // Basic button classes
    nextButton.innerHTML = '<span class="material-icons">arrow_forward_ios</span>';
    nextButton.setAttribute('aria-label', 'Next Event');
    nextButton.addEventListener('click', () => swipeCard('next'));
    bottomControls.appendChild(nextButton);

    carouselViewport.appendChild(bottomControls); // Bottom controls are direct children of the viewport
    // container.appendChild(carouselViewport); // Already appended above

    // Attach touch listeners
    cardWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    cardWrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
    cardWrapper.addEventListener('touchend', handleTouchEnd, false); // Not passive for preventDefault potential

    // MODIFICATION START: Wrap initial updateCarouselView call in requestAnimationFrame
    requestAnimationFrame(() => updateCarouselView(true)); // Initial positioning
    // MODIFICATION END

    if (G_CONFIG.DEBUG_MODE) console.log(`UIRenderer Carousel: Rendered. Initial index: ${currentCardIndex}`);
}

function createEventCardDOM(eventData, migraineLogs) {
    const cardElement = document.createElement('div');
    cardElement.className = 'event-card';
    cardElement.dataset.eventId = eventData.id;

    if (!eventData.isPressureEvent) { // Calm period
        cardElement.classList.add('calm-period-card');
    } else { // Pressure event
        cardElement.classList.add(`severity-${eventData.severity ? eventData.severity.toLowerCase() : 'unknown'}`);
    }

    const title = document.createElement('h3');
    title.className = 'm3-card__title';
    title.textContent = eventData.isPressureEvent ?
        `${eventData.type.charAt(0).toUpperCase() + eventData.type.slice(1)} (${eventData.severity || 'N/A'})` :
        "Calm Period";
    cardElement.appendChild(title);

    const cardInnerContent = document.createElement('div');
    cardInnerContent.className = 'm3-card__content'; // This will be the scrollable part

    const startTimeFormatted = formatUnixTimestamp(eventData.startTime);
    const endTimeFormatted = formatUnixTimestamp(eventData.endTime);

    let detailsHTML = `<p><strong>Start:</strong> ${startTimeFormatted.dateString}, ${startTimeFormatted.timeString}</p>`;
    detailsHTML += `<p><strong>End:</strong> ${endTimeFormatted.dateString}, ${endTimeFormatted.timeString}</p>`;
    detailsHTML += `<p><strong>Duration:</strong> ${eventData.durationHours.toFixed(1)} hrs</p>`;

    if (eventData.isPressureEvent) {
        detailsHTML += `<p><strong>Pressure Change:</strong> ${eventData.pressureChange.toFixed(1)} hPa</p>`;
        detailsHTML += `<p><strong>Rate:</strong> ${eventData.rateOfChange.toFixed(2)} hPa/hr</p>`;
        // Add select for migraine logging only for pressure events
        cardInnerContent.innerHTML = detailsHTML; // Set basic details first
        cardInnerContent.appendChild(renderMigraineSelect(eventData.id, migraineLogs));
    } else {
        // For calm periods, check for next event info
        if (eventData.nextEventInfo && eventData.nextEventInfo.type) {
            detailsHTML += `<p class="next-event-info"><strong>Next Event:</strong> ${eventData.nextEventInfo.type} (${eventData.nextEventInfo.severity}) starts at ${formatUnixTimestamp(eventData.nextEventInfo.startTime).timeString}</p>`;
        } else {
            detailsHTML += `<p class="next-event-info">No significant pressure event follows immediately.</p>`;
        }
        cardInnerContent.innerHTML = detailsHTML;
    }

    cardElement.appendChild(cardInnerContent);

    // Add event listener for the select if it was added
    if (eventData.isPressureEvent) {
        const selectInCard = cardInnerContent.querySelector('select.m3-table-select');
        if (selectInCard && onEventMigraineChangeAppCallback) {
            selectInCard.addEventListener('change', (e) => {
                onEventMigraineChangeAppCallback(eventData.id, e.target);
            });
        }
    }
    return cardElement;
}

export function updateCarouselCardContent(eventId, newEventData, migraineLogs) {
    const carouselViewport = document.getElementById(G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID);
    if (!carouselViewport) return;
    const cardWrapper = carouselViewport.querySelector('.event-card-wrapper');
    if (!cardWrapper) return;

    const cardToUpdate = cardWrapper.querySelector(`.event-card[data-event-id="${eventId}"]`);

    if (cardToUpdate) {
        // Create a new card with the new data
        const tempCard = createEventCardDOM(newEventData, migraineLogs);

        // Replace content carefully
        // Clear existing classes related to severity, calm status
        cardToUpdate.className = 'event-card'; // Reset to base
        if (!newEventData.isPressureEvent) {
            cardToUpdate.classList.add('calm-period-card');
        } else {
            cardToUpdate.classList.add(`severity-${newEventData.severity ? newEventData.severity.toLowerCase() : 'unknown'}`);
        }

        const oldTitle = cardToUpdate.querySelector('.m3-card__title');
        const oldInnerContent = cardToUpdate.querySelector('.m3-card__content');
        const newTitle = tempCard.querySelector('.m3-card__title');
        const newInnerContent = tempCard.querySelector('.m3-card__content');

        if (oldTitle && newTitle) oldTitle.replaceWith(newTitle);
        else if (newTitle) cardToUpdate.prepend(newTitle); // Should not happen if structure is consistent

        if (oldInnerContent && newInnerContent) oldInnerContent.replaceWith(newInnerContent);
        else if (newInnerContent) cardToUpdate.appendChild(newInnerContent); // Should not happen

        // Re-attach select listener if it's a pressure event
        if (newEventData.isPressureEvent) {
            const newSelect = cardToUpdate.querySelector('select.m3-table-select');
            if (newSelect && onEventMigraineChangeAppCallback) {
                newSelect.addEventListener('change', (e) => {
                    onEventMigraineChangeAppCallback(eventId, e.target);
                });
            }
        }
        // Update active state based on currentCardIndex
        cardToUpdate.classList.toggle('event-card--active', currentCardIndex >= 0 && eventCardsData[currentCardIndex] && eventCardsData[currentCardIndex].id === eventId);
        if (G_CONFIG.DEBUG_MODE) console.log(`UIRenderer Carousel: Updated card content for event ${eventId}`);
    } else {
        if (G_CONFIG.DEBUG_MODE) console.warn(`UIRenderer Carousel: Could not find card ${eventId} to update content.`);
    }
}


function updateCarouselView(isInitial = false) {
    const carouselViewport = document.getElementById(G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID);
    if (!carouselViewport) {
        if(G_CONFIG.DEBUG_MODE) console.warn("UIRenderer: Carousel viewport not found for update.");
        return;
    }
    const cardWrapper = carouselViewport.querySelector('.event-card-wrapper');
    if (!cardWrapper || eventCardsData.length === 0) {
        if(G_CONFIG.DEBUG_MODE && carouselViewport && eventCardsData.length === 0) console.log("UIRenderer: No cards in wrapper for update.");
        else if(G_CONFIG.DEBUG_MODE && carouselViewport) console.warn("UIRenderer: Card wrapper not found for update.");
        // Clear controls if no cards
        const positionIndicator = carouselViewport.querySelector('.carousel-position-indicator');
        const prevButton = carouselViewport.querySelector('.carousel-nav.prev');
        const nextButton = carouselViewport.querySelector('.carousel-nav.next');
        if (positionIndicator) positionIndicator.textContent = '0/0';
        if (prevButton) prevButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
        return;
    }

    const positionIndicator = carouselViewport.querySelector('.carousel-position-indicator');
    const prevButton = carouselViewport.querySelector('.carousel-nav.prev');
    const nextButton = carouselViewport.querySelector('.carousel-nav.next');

    // Ensure currentCardIndex is valid
    currentCardIndex = Math.max(0, Math.min(currentCardIndex, eventCardsData.length - 1));
    if (isNaN(currentCardIndex)) currentCardIndex = 0;


    const viewportWidth = carouselViewport.clientWidth; // CRITICAL: Use viewport's clientWidth
    const offset = -currentCardIndex * viewportWidth;

    requestAnimationFrame(() => { // Ensure transform update is smooth
        cardWrapper.style.transform = `translateX(${offset}px)`;

        const cards = cardWrapper.querySelectorAll('.event-card');
        cards.forEach((card, index) => {
            card.classList.toggle('event-card--active', index === currentCardIndex);
        });

        if (positionIndicator) {
            positionIndicator.textContent = `${currentCardIndex + 1}/${eventCardsData.length}`;
        }
        if (prevButton) {
            prevButton.disabled = currentCardIndex === 0;
        }
        if (nextButton) {
            nextButton.disabled = currentCardIndex === eventCardsData.length - 1;
        }
    });

    // Call app.js callback if focus changed and not initial load (or if explicit focus needed on init)
    if (!isInitial && onSwipeEventAppCallback && eventCardsData[currentCardIndex]) {
        onSwipeEventAppCallback(eventCardsData[currentCardIndex].id);
    } else if (isInitial && onSwipeEventAppCallback && eventCardsData[currentCardIndex]) {
        // On initial load, we also want to notify app about the focused event
        // This ensures chart highlights are set correctly based on initial focus.
        onSwipeEventAppCallback(eventCardsData[currentCardIndex].id);
    }
    if (G_CONFIG.DEBUG_MODE && !isInitial) console.log(`UIRenderer Carousel: View updated. Index: ${currentCardIndex}, ID: ${eventCardsData[currentCardIndex]?.id}, ViewportWidth: ${viewportWidth}`);
}


export async function cycleToCard(targetIndex, isPageLoadAnimation = false) {
    const carouselViewport = document.getElementById(G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID);
    if (!carouselViewport) {
        if(G_CONFIG.DEBUG_MODE) console.error("UIRenderer: Carousel viewport not found for cycleToCard.");
        return;
    }
    const cardWrapper = carouselViewport.querySelector('.event-card-wrapper');

    if (!cardWrapper || eventCardsData.length === 0) {
        if(G_CONFIG.DEBUG_MODE) console.error("UIRenderer: Carousel viewport or wrapper not found, or no cards, for cycleToCard.");
        return;
    }
    targetIndex = Math.max(0, Math.min(targetIndex, eventCardsData.length - 1));
    if(isNaN(targetIndex)) targetIndex = 0;

    if (G_CONFIG.DEBUG_MODE) console.log(`UIRenderer Carousel: Cycling to card index ${targetIndex}. PageLoadAnim: ${isPageLoadAnimation}`);

    if (isPageLoadAnimation && Math.abs(targetIndex - currentCardIndex) > 1 && currentCardIndex !== targetIndex) {
        // Quick cycle animation for page load jump
        cardWrapper.style.transition = 'none'; // Disable transition for jump
        let tempIndex = currentCardIndex;
        const direction = targetIndex > currentCardIndex ? 1 : -1;

        const cycleInterval = setInterval(() => {
            tempIndex += direction;
            const tempOffset = -tempIndex * carouselViewport.clientWidth;
            cardWrapper.style.transform = `translateX(${tempOffset}px)`;
            const cards = cardWrapper.querySelectorAll('.event-card');
            cards.forEach((card, idx) => card.classList.toggle('event-card--active', idx === tempIndex));


            if (tempIndex === targetIndex) {
                clearInterval(cycleInterval);
                currentCardIndex = targetIndex;
                cardWrapper.style.transition = 'transform 0.3s ease-in-out'; // Re-enable transition
                updateCarouselView(false); // Final update with correct styles & callback
            }
        }, 50); // Adjust speed as needed
    } else {
        currentCardIndex = targetIndex;
        updateCarouselView(true); // Treat as initial focus for app callback
    }
}

function swipeCard(direction) {
    if (direction === 'next') {
        if (currentCardIndex < eventCardsData.length - 1) {
            currentCardIndex++;
        }
    } else if (direction === 'prev') {
        if (currentCardIndex > 0) {
            currentCardIndex--;
        }
    }
    updateCarouselView(false); // isInitial = false to trigger app callback
}

// Touch handling
function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX;
    touchEndX = touchStartX; // Initialize touchEndX
}

function handleTouchMove(event) {
    touchEndX = event.touches[0].clientX;
}

function handleTouchEnd() {
    const deltaX = touchEndX - touchStartX;
    const threshold = 50; // Minimum swipe distance in pixels

    if (Math.abs(deltaX) > threshold) {
        if (deltaX < 0) swipeCard('next'); // Swipe left
        else swipeCard('prev');         // Swipe right
    }
    // Reset for next touch
    touchStartX = 0;
    touchEndX = 0;
}

function renderMigraineSelect(eventId, migraineLogs) {
    const selectMigraine = document.createElement('select');
    selectMigraine.classList.add('m3-table-select'); // Reuse table select styling
    selectMigraine.dataset.eventId = eventId;

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Log Migraine...";
    selectMigraine.appendChild(defaultOption);

    G_CONFIG.MIGRAINE_SEVERITIES.forEach(severity => {
        const option = document.createElement('option');
        option.value = severity.toLowerCase();
        option.textContent = severity;
        selectMigraine.appendChild(option);
    });

    const loggedMigraine = migraineLogs[eventId];
    if (loggedMigraine && loggedMigraine.severity) {
        selectMigraine.value = loggedMigraine.severity.toLowerCase();
    }
    return selectMigraine;
}

export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById(G_CONFIG.NOTIFICATION_AREA_ID);
    if (!notificationArea) {
        if (G_CONFIG.DEBUG_MODE) console.warn('UIRenderer: Notification area not found for message:', message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `m3-notification ${type}`;
    notification.textContent = message;

    notificationArea.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            try { if (notification.parentNode) notificationArea.removeChild(notification); } catch (e) { /* ignore */ }
        }, { once: true });
    }, duration);
}

export function updateShowAllEventsToggleState(isActive) {
    const toggleSwitchInput = document.getElementById(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID);
    if (toggleSwitchInput) {
        toggleSwitchInput.checked = isActive;
        if (G_CONFIG.DEBUG_MODE) console.log(`UIRenderer: Toggle switch ${G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID} state set to: ${isActive}`);
    } else {
        if (G_CONFIG.DEBUG_MODE) console.warn(`UIRenderer: Toggle switch ${G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID} not found when trying to update state.`);
    }
}
// filename: js/uiRenderer.js