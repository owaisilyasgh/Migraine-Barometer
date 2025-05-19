// js/utils.js
/**
 * @file utils.js
 * @description Utility functions for the application.
 */

export const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Formats a Unix timestamp (seconds) into an object containing date and time strings.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {{dateString: string, timeString: string, fullDateTime: string}} An object with formatted date and time.
 */
export function formatUnixTimestamp(unixTimestamp) {
    if (typeof unixTimestamp !== 'number' || isNaN(unixTimestamp)) {
        console.warn('Invalid timestamp provided to formatUnixTimestamp:', unixTimestamp);
        return { dateString: 'N/A', timeString: 'N/A', fullDateTime: 'N/A' };
    }

    const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds

    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours(); // 0-23
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    const formattedMinutes = String(minutes).padStart(2, '0');
    const timeString = `${hours}:${formattedMinutes} ${ampm}`;
    const dateString = `${month} ${day}`;
    const fullDateTime = `${dateString}, ${year} ${timeString}`;

    return { dateString, timeString, fullDateTime };
}

/**
 * Creates a ripple effect on a button.
 * @param {MouseEvent} event - The click event.
 */
export function createRipple(event) {
    const button = event.currentTarget;
    if (!button) return;

    // Ensure button is positioned relatively or absolutely for ripple positioning
    const buttonStyle = getComputedStyle(button);
    if (buttonStyle.position === 'static') {
        // This check is useful for debugging, but avoid changing style directly here.
        // Components should manage their own positioning.
        // console.warn("Button for ripple effect ideally should have position: relative or absolute.", button);
    }

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - (size / 2);
    const y = event.clientY - rect.top - (size / 2);

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

    ripple.addEventListener('animationend', () => {
        try {
            if (ripple.parentNode) { // Check if ripple is still attached
                ripple.remove();
            }
        } catch(e) {
            // Ignore if ripple already removed or other minor issues
            console.warn("Minor issue removing ripple:", e);
        }
    }, { once: true }); // Use {once: true} for automatic cleanup
}
// filename: js/utils.js