// js/uiRenderer.js
import * as _G_CONFIG from './config.js'; 
const G_CONFIG = _G_CONFIG;
import { formatUnixTimestamp, createRipple } from './utils.js';

// Callbacks to app.js
let onEventMigraineChangeAppCallback = null;
let onShowAllEventsToggleAppCallback = null;
let onReturnToCurrentAppCallback = null;
let onSwipeEventAppCallback = null;
let onRefreshDataAppCallback = null;

// Carousel State
let eventCardsData = [];
let currentCardIndex = 0;
let touchStartX = 0;
let touchEndX = 0;
let isSwiping = false;


export function setAppCallbacks(callbacks) {
    onEventMigraineChangeAppCallback = callbacks.onEventMigraineChange;
    onShowAllEventsToggleAppCallback = callbacks.onShowAllEventsToggle;
    onReturnToCurrentAppCallback = callbacks.onReturnToCurrent;
    onSwipeEventAppCallback = callbacks.onSwipeEvent;
    onRefreshDataAppCallback = callbacks.onRefreshData;
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

    eventsSectionCardContent.innerHTML = '';
    chartControlsSectionCardContent.innerHTML = '';
    renderChartInteractionControls(chartControlsSectionCardContent, isShowAllEventsActive);

    if (appStatus && appStatus.status === 'loading') {
        renderLoadingState(eventsSectionCardContent);
        return;
    }

    if (appStatus && (appStatus.status.startsWith('error_') || appStatus.status === 'stale_api_cooldown')) {
        // Show special card if errors prevent data or API is on cooldown with no cache.
        // Also show if stale data is presented without any actual events.
        if ((appStatus.status.startsWith('error_') && (!processedEvents || processedEvents.length === 0)) || 
            appStatus.status === 'error_api_cooldown_no_cache' ||
            ((appStatus.status === 'stale_ui_only' || appStatus.status === 'stale_api_cooldown') && (!processedEvents || processedEvents.length === 0))) {
            renderSpecialStateCard(eventsSectionCardContent, appStatus.status, appStatus.message);
            if (G_CONFIG.DEBUG_MODE) console.log("UIRenderer: Displaying special state card instead of event carousel.");
            return;
        }
        // If stale but we have events, we'll show a notification via app.js, and render carousel.
    }

    if (processedEvents && processedEvents.length > 0) {
        renderFocusedEventCarousel(eventsSectionCardContent, processedEvents, migraineLogs, currentlyFocusedEventId);
    } else {
        const noEventsMsg = document.createElement('p');
        noEventsMsg.textContent = 'No significant pressure events detected for the available period.';
        noEventsMsg.style.textAlign = 'center';
        noEventsMsg.style.padding = '20px';
        eventsSectionCardContent.appendChild(noEventsMsg);
        if (G_CONFIG.DEBUG_MODE) console.log("UIRenderer: No events, rendering 'no events' message.");
    }
}

function renderChartInteractionControls(container, isShowAllEventsActive) {
    const controlsGroupDiv = document.createElement('div');
    controlsGroupDiv.className = 'automated-events-controls';

    renderShowAllEventsToggle(controlsGroupDiv, isShowAllEventsActive);
    renderReturnToCurrentButton(controlsGroupDiv);
    
    container.appendChild(controlsGroupDiv);
}

function renderShowAllEventsToggle(container, isShowAllEventsActive) {
    const toggleContainer = document.createElement('label');
    toggleContainer.className = 'm3-toggle-switch-container';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'm3-toggle-switch-input';
    input.id = G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID;
    input.checked = isShowAllEventsActive;
    if (onShowAllEventsToggleAppCallback) {
        input.addEventListener('change', onShowAllEventsToggleAppCallback);
    }

    const switchLabel = document.createElement('span');
    switchLabel.className = 'm3-toggle-switch-label';
    switchLabel.innerHTML = '<span class="m3-toggle-switch-track"><span class="m3-toggle-switch-thumb-container"><span class="m3-toggle-switch-thumb"></span></span></span>';
    
    const textLabel = document.createElement('span');
    textLabel.className = 'm3-toggle-switch-text-label';
    textLabel.textContent = 'Show all on chart';

    toggleContainer.append(input, switchLabel, textLabel);
    container.appendChild(toggleContainer);
}

function renderReturnToCurrentButton(container) {
    const button = document.createElement('button');
    button.id = G_CONFIG.RETURN_TO_CURRENT_BTN_ID;
    button.className = 'm3-button m3-button-text return-to-current-btn';
    button.innerHTML = '<span class="material-icons">history_toggle_off</span>Return to Current';
    button.setAttribute('aria-label', 'Return to current event');
    
    if (onReturnToCurrentAppCallback) {
        button.addEventListener('click', (event) => {
            createRipple(event);
            onReturnToCurrentAppCallback();
        });
    }
    container.appendChild(button);
}

function renderLoadingState(container) {
    container.innerHTML = '';
    const loadingP = document.createElement('p');
    loadingP.textContent = 'Loading pressure data and events...';
    loadingP.style.textAlign = 'center';
    loadingP.style.padding = '20px';
    container.appendChild(loadingP);
}

function renderSpecialStateCard(container, status, message) {
    container.innerHTML = '';
    const cardElement = document.createElement('div');
    // Note: .event-card provides the slot structure, .special-state-card for specific styling, 
    // .m3-card provides elevation and base card appearance.
    cardElement.className = 'event-card special-state-card'; 
    
    const innerCard = document.createElement('div'); // This gets m3-card styles
    innerCard.className = 'm3-card'; // Base elevated card styles
    if (status.includes('stale')) {
        innerCard.classList.add('warning'); // CSS uses .m3-card.warning for background
    } else if (status.includes('error')) {
        innerCard.classList.add('error'); // CSS uses .m3-card.error for background
    }
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'm3-card__title';
    if (status.includes('stale')) titleElement.textContent = "Cached Data Notice";
    else if (status.includes('error')) titleElement.textContent = "Data Load Issue";
    else titleElement.textContent = "Status Update";
    innerCard.appendChild(titleElement);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'm3-card__content';

    const messageP = document.createElement('p');
    messageP.textContent = message || "An update regarding data loading.";
    contentWrapper.appendChild(messageP);

    if ((status.includes('stale') || status.startsWith('error_')) && onRefreshDataAppCallback) {
        const refreshButton = document.createElement('button');
        refreshButton.id = "refreshDataButton";
        refreshButton.className = 'm3-button m3-button-filled';
        refreshButton.textContent = 'Try Refreshing Data';
        refreshButton.addEventListener('click', (event) => {
            createRipple(event);
            onRefreshDataAppCallback();
        });
        contentWrapper.appendChild(refreshButton);
    }
    innerCard.appendChild(contentWrapper);
    cardElement.appendChild(innerCard); // Append styled inner card to the slot
    container.appendChild(cardElement);
}


function renderFocusedEventCarousel(container, processedEvents, migraineLogs, focusedEventId) {
    container.innerHTML = '';

    const carouselViewport = document.createElement('div');
    carouselViewport.id = G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID;
    carouselViewport.className = 'focused-event-carousel-container';
    container.appendChild(carouselViewport);

    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'event-card-wrapper';
    carouselViewport.appendChild(cardWrapper);

    eventCardsData = processedEvents;
    if (!eventCardsData || eventCardsData.length === 0) return;

    let initialIndex = eventCardsData.findIndex(event => event.id === focusedEventId);
    if (initialIndex === -1 || !focusedEventId) initialIndex = 0;
    currentCardIndex = initialIndex;

    eventCardsData.forEach(eventData => {
        const cardSlot = createEventCardDOM(eventData, migraineLogs); // Returns the outer .event-card slot
        cardWrapper.appendChild(cardSlot);
    });

    const bottomControls = document.createElement('div');
    bottomControls.className = 'carousel-bottom-controls';
    
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots-container';
    eventCardsData.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'dot';
        dot.setAttribute('aria-label', `Go to event ${index + 1}`);
        dot.dataset.index = index;
        dot.addEventListener('click', () => {
            isSwiping = false;
            cycleToCard(index);
        });
        dotsContainer.appendChild(dot);
    });
    bottomControls.appendChild(dotsContainer);
    carouselViewport.appendChild(bottomControls);

    cardWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    cardWrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
    cardWrapper.addEventListener('touchend', handleTouchEnd, false);

    requestAnimationFrame(() => updateCarouselView(true));
}


function createEventCardDOM(eventData, migraineLogs) {
    const cardSlotElement = document.createElement('div'); // This is the 100% wide slide slot
    cardSlotElement.className = 'event-card'; // Base class for the slot
    cardSlotElement.dataset.eventId = eventData.id;

    // Apply type-specific and severity classes to the outer cardSlotElement for CSS targeting
    if (!eventData.isPressureEvent) {
        cardSlotElement.classList.add('calm-period-card');
    } else {
        cardSlotElement.classList.add(`severity-${eventData.severity ? eventData.severity.toLowerCase() : 'unknown'}`);
    }

    // Create the inner container that will hold the actual card styling and content
    const innerContainer = document.createElement('div');
    innerContainer.className = 'event-card-inner-container m3-card'; // Gets .m3-card styles + specific class

    const title = document.createElement('h3');
    title.className = 'm3-card__title';
    title.textContent = eventData.isPressureEvent ?
        `${eventData.type.charAt(0).toUpperCase() + eventData.type.slice(1)} (${eventData.severity || 'N/A'})` :
        'Calm Period';
    innerContainer.appendChild(title);

    const cardInnerContent = document.createElement('div'); // Scrollable part
    cardInnerContent.className = 'm3-card__content';

    const startTimeFormatted = formatUnixTimestamp(eventData.startTime);
    const endTimeFormatted = formatUnixTimestamp(eventData.endTime);

    let detailsHTML = `<p><strong>Time:</strong> ${startTimeFormatted.timeString} to ${endTimeFormatted.timeString} (${startTimeFormatted.dateString})</p>`;
    detailsHTML += `<p><strong>Duration:</strong> ${eventData.durationHours.toFixed(1)} hrs</p>`;

    if (eventData.isPressureEvent) {
        detailsHTML += `<p><strong>Pressure Change:</strong> ${eventData.pressureChange.toFixed(1)} hPa (${eventData.startPressure.toFixed(0)} to ${eventData.endPressure.toFixed(0)} hPa)</p>`;
        detailsHTML += `<p><strong>Rate:</strong> ${eventData.rateOfChange.toFixed(2)} hPa/hr</p>`;
        cardInnerContent.innerHTML = detailsHTML;
        cardInnerContent.appendChild(renderMigraineSelect(eventData.id, migraineLogs, eventData.type));
    } else { // Calm period
        cardInnerContent.innerHTML = detailsHTML;
        if (eventData.nextEventInfo && eventData.nextEventInfo.type) {
            const nextEventTime = formatUnixTimestamp(eventData.nextEventInfo.startTime);
            const nextEventP = document.createElement('p');
            nextEventP.className = 'next-event-info';
            nextEventP.innerHTML = `<strong>Next Event:</strong> ${eventData.nextEventInfo.type} (${eventData.nextEventInfo.severity}) starts at ${nextEventTime.timeString}`;
            cardInnerContent.appendChild(nextEventP);
        }
    }
    innerContainer.appendChild(cardInnerContent);
    cardSlotElement.appendChild(innerContainer); // Append styled inner container to the slide slot
    return cardSlotElement;
}

export function updateCarouselCardContent(eventId, newEventData, migraineLogs) {
    const carouselViewport = document.getElementById(G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID);
    if (!carouselViewport) return;
    const cardWrapper = carouselViewport.querySelector('.event-card-wrapper');
    if (!cardWrapper) return;

    const cardSlotToUpdate = cardWrapper.querySelector(`.event-card[data-event-id="${eventId}"]`);
    if (!cardSlotToUpdate) {
        if (G_CONFIG.DEBUG_MODE) console.warn(`UIRenderer Carousel: Could not find card slot ${eventId} to update content.`);
        return;
    }

    // Create a new card slot (which includes its inner container) with the new data
    const tempCardSlot = createEventCardDOM(newEventData, migraineLogs);
    const newInnerContainer = tempCardSlot.querySelector('.event-card-inner-container');

    // Update classes on the outer cardSlotToUpdate
    cardSlotToUpdate.className = 'event-card'; // Reset base class for the slot
    if (!newEventData.isPressureEvent) {
        cardSlotToUpdate.classList.add('calm-period-card');
    } else {
        cardSlotToUpdate.classList.add(`severity-${newEventData.severity ? newEventData.severity.toLowerCase() : 'unknown'}`);
    }

    // Replace the old inner container with the new one
    const currentInnerContainer = cardSlotToUpdate.querySelector('.event-card-inner-container');
    if (currentInnerContainer && newInnerContainer) {
        currentInnerContainer.replaceWith(newInnerContainer);
    } else if (newInnerContainer) { // If for some reason old inner container wasn't there
        cardSlotToUpdate.innerHTML = ''; // Clear existing content of the slot
        cardSlotToUpdate.appendChild(newInnerContainer);
    }
    
    // Update active state visual - .event-card--active class is on the outer .event-card (the slot)
    const isActive = currentCardIndex >= 0 && eventCardsData[currentCardIndex] && eventCardsData[currentCardIndex].id === eventId;
    cardSlotToUpdate.classList.toggle('event-card--active', isActive);
    // CSS will handle styling of inner container based on parent's active state.
}

function updateCarouselView(isInitial = false) {
    const carouselViewport = document.getElementById(G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID);
    if (!carouselViewport) return;
    
    const cardWrapper = carouselViewport.querySelector('.event-card-wrapper');
    const dotsContainer = carouselViewport.querySelector('.carousel-dots-container');

    if (!cardWrapper || !dotsContainer || eventCardsData.length === 0) {
        if(dotsContainer) dotsContainer.innerHTML = ''; // Clear dots if no cards
        return;
    }

    currentCardIndex = Math.max(0, Math.min(currentCardIndex, eventCardsData.length - 1));
    if (isNaN(currentCardIndex)) currentCardIndex = 0;

    const viewportWidth = carouselViewport.clientWidth;
    const offset = -currentCardIndex * viewportWidth;

    requestAnimationFrame(() => {
        cardWrapper.style.transform = `translateX(${offset}px)`;

        const cardSlots = cardWrapper.querySelectorAll('.event-card');
        cardSlots.forEach((slot, index) => {
            slot.classList.toggle('event-card--active', index === currentCardIndex);
        });

        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentCardIndex);
        });
    });
    
    if (onSwipeEventAppCallback && eventCardsData[currentCardIndex]) {
        onSwipeEventAppCallback(eventCardsData[currentCardIndex].id);
    }
}


export async function cycleToCard(targetIndex, isPageLoadAnimation = false) {
    const carouselViewport = document.getElementById(G_CONFIG.FOCUSED_EVENT_CAROUSEL_ID);
    if (!carouselViewport) return;

    const cardWrapper = carouselViewport.querySelector('.event-card-wrapper');
    if (!cardWrapper || !eventCardsData || eventCardsData.length === 0) return;
    
    targetIndex = Math.max(0, Math.min(targetIndex, eventCardsData.length - 1));
    if(isNaN(targetIndex)) targetIndex = 0;
    
    const oldIndex = currentCardIndex;
    currentCardIndex = targetIndex;

    if (isPageLoadAnimation && Math.abs(targetIndex - oldIndex) > 1 && oldIndex !== targetIndex) {
        cardWrapper.style.transition = 'none';
        let tempIndex = oldIndex;
        const direction = (targetIndex > oldIndex) ? 1 : -1;
        
        const cycleInterval = setInterval(() => {
            tempIndex += direction;
            const intermediateOffset = -tempIndex * carouselViewport.clientWidth;
            cardWrapper.style.transform = `translateX(${intermediateOffset}px)`;

            if (tempIndex === targetIndex) {
                clearInterval(cycleInterval);
                cardWrapper.style.transition = 'transform 0.3s ease-in-out';
                updateCarouselView(false); // false -> implies user action for callback context
            }
        }, 30);
    } else {
        updateCarouselView(isPageLoadAnimation);
    }
}

function swipeCard(direction) {
    if (direction === 'next' && currentCardIndex < eventCardsData.length - 1) {
        currentCardIndex++;
    } else if (direction === 'prev' && currentCardIndex > 0) {
        currentCardIndex--;
    }
    updateCarouselView(false);
}

function handleTouchStart(event) {
    isSwiping = false;
    touchStartX = event.touches[0].clientX;
    touchEndX = touchStartX;
}

function handleTouchMove(event) {
    isSwiping = true;
    touchEndX = event.touches[0].clientX;
}

function handleTouchEnd() {
    if (!isSwiping || eventCardsData.length <= 1) {
        isSwiping = false;
        return;
    }
    const deltaX = touchEndX - touchStartX;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold) {
        if (deltaX < 0) swipeCard('next');
        else swipeCard('prev');
    }
    isSwiping = false;
    touchStartX = 0;
    touchEndX = 0;
}

function renderMigraineSelect(eventId, migraineLogs, eventType) {
    const selectContainer = document.createElement('div');
    selectContainer.style.marginTop = '10px';

    const selectMigraine = document.createElement('select');
    selectMigraine.classList.add('m3-table-select');
    selectMigraine.dataset.eventId = eventId;

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = `Log Migraine for ${eventType || 'Event'}`;
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

    selectMigraine.addEventListener('change', (e) => {
        if (onEventMigraineChangeAppCallback) {
            onEventMigraineChangeAppCallback(eventId, e.target.value);
        }
    });
    selectContainer.appendChild(selectMigraine);
    return selectContainer;
}

export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById(G_CONFIG.NOTIFICATION_AREA_ID);
    if (!notificationArea) return;

    const notification = document.createElement('div');
    notification.className = `m3-notification ${type}`;
    notification.textContent = message;
    notificationArea.prepend(notification); 

    requestAnimationFrame(() => notification.classList.add('show'));

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            try { if (notification.parentNode) notificationArea.removeChild(notification); } catch (e) {}
        }, { once: true });
    }, duration);
}

export function updateShowAllEventsToggleState(isActive) {
    const toggleSwitchInput = document.getElementById(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_ID);
    if (toggleSwitchInput) {
        toggleSwitchInput.checked = isActive;
    }
}
// filename: js/uiRenderer.js