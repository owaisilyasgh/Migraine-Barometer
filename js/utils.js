// js/utils.js
import * as Config from './config.js';

/**
 * Formats a Unix timestamp (seconds) into "Month Day, Hour AM/PM" string.
 * e.g., "May 12, 12 AM" or "May 12, 3 PM"
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {string} The formatted date string.
 */
export function formatUnixTimestamp(unixTimestamp) {
    if (typeof unixTimestamp !== 'number' || isNaN(unixTimestamp)) {
        return 'Invalid Date';
    }
    const date = new Date(unixTimestamp * 1000);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;

    return `${month} ${day}, ${hours}:${minutesStr} ${ampm}`;
}

/**
 * Creates a ripple effect on a button.
 * @param {MouseEvent} event - The click event.
 */
export function createRipple(event) {
    const button = event.currentTarget;
    if (!button || typeof button.getBoundingClientRect !== 'function') return;

    // Ensure button is positioned relatively or absolutely for ripple positioning
    if (getComputedStyle(button).position === 'static') {
        // This is a common issue; ideally, button itself should have relative positioning.
        // console.warn("Button for ripple effect should have position: relative or absolute.");
        // button.style.position = 'relative'; // Avoid modifying style directly if possible
    }

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('m3-ripple');

    // Remove any existing ripple to prevent multiple animations on fast clicks
    const existingRipple = button.querySelector('.m3-ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    button.appendChild(ripple);

    // Ripple will be removed by CSS animation end if `animation-fill-mode: forwards;` is not used,
    // or manually after animation duration if it is.
    // Simpler approach: just let multiple ripples exist and get cleaned up if any issue
    // or rely on CSS animation to fade it out.
    // For this setup, m3-ripple-animation has 'to { opacity: 0; }'
    // so we might want to remove it after animation
    ripple.addEventListener('animationend', () => {
        if (ripple.parentElement) {
            ripple.remove();
        }
    });
}

// Note: showNotification function is now primarily in UIRenderer.js for better modularity
// as it directly manipulates specific DOM elements UIRenderer is aware of.
// If a truly generic utility notification is needed, it could be here,
// but it's often better to have UI components manage their own notifications.

// filename: js/utils.js