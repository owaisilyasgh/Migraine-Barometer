// js/utils.js
/**
 * @file utils.js
 * @description Utility functions for the application.
 */

/**
 * Formats a Unix timestamp (seconds) into an object containing date and time strings.
 * Date string: "Month Day" (e.g., "May 15")
 * Time string: "Hour:Minute AM/PM" (e.g., "1:00 AM")
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {{dateString: string, timeString: string}} An object with formatted date and time.
 */
export function formatUnixTimestamp(unixTimestamp) {
    if (typeof unixTimestamp !== 'number' || isNaN(unixTimestamp)) {
        console.warn('Invalid timestamp provided to formatUnixTimestamp:', unixTimestamp);
        return { dateString: 'N/A', timeString: 'N/A' };
    }

    const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();

    let hours = date.getHours(); // 0-23
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

    const dateString = `${month} ${day}`;
    const timeString = `${hours}:${formattedMinutes} ${ampm}`;

    return { dateString, timeString };
}

/**
 * Creates a ripple effect on a button.
 * @param {MouseEvent} event - The click event.
 */
export function createRipple(event) {
    const button = event.currentTarget;

    // Ensure button is positioned relatively or absolutely for ripple positioning
    if (getComputedStyle(button).position === 'static') {
        // This is a common issue; ideally, button itself should have relative positioning.
        // console.warn("Button for ripple effect should have position: relative or absolute.");
        // button.style.position = 'relative'; // Avoid modifying style directly if possible
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
            ripple.remove();
        } catch (e) {
            // Ignore if ripple already removed or other minor issues
        }
    });
}
// filename: js/utils.js