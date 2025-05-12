// js/utils.js

/**
 * Formats a Unix timestamp (seconds) into a human-readable string.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @param {string} formatType - 'datetime' for full locale string, or any other for locale string.
 * @returns {string} The formatted date string.
 */
export function formatUnixTimestamp(unixTimestamp, formatType = 'datetime') {
    const date = new Date(unixTimestamp * 1000);
    if (formatType === 'datetime') {
        return date.toLocaleString();
    }
    // Highcharts handles its own axis formatting, this is for other UI parts.
    return date.toLocaleString();
}

/**
 * Shows a notification message to the user.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error').
 * @param {number} [duration=3000] - How long to display the notification in milliseconds.
 */
export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById('notification-area'); // Using ID from config might be an option later
    if (!notificationArea) {
        console.warn('Notification area not found in DOM.');
        return;
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationArea.appendChild(notification);

    // Trigger reflow to enable animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    setTimeout(() => {
        notification.classList.remove('show');
        // Remove the element after the animation completes
        setTimeout(() => {
            if (notification.parentNode === notificationArea) {
                notificationArea.removeChild(notification);
            }
        }, 500); // Matches CSS transition duration
    }, duration);
}