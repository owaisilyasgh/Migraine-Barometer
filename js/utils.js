// js/utils.js
import { NOTIFICATION_AREA_ID } from './config.js';

/**
 * Formats a Unix timestamp (seconds) into "Month Day, Hour AM/PM" string.
 * e.g., "May 12, 12 AM" or "May 12, 3 PM"
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {string} The formatted date string.
 */
export function formatUnixTimestamp(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${month} ${day}, ${hours} ${ampm}`;
}

export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById(NOTIFICATION_AREA_ID);
    if (!notificationArea) {
        console.warn('Notification area not found in DOM.');
        return;
    }
    const notification = document.createElement('div');
    notification.classList.add('m3-notification', type);
    notification.textContent = message;
    notificationArea.appendChild(notification);
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode === notificationArea) {
                notificationArea.removeChild(notification);
            }
        }, 300);
    }, duration);
}

export function createRipple(event) {
    const button = event.currentTarget;
    if (getComputedStyle(button).position === 'static') {
        button.style.position = 'relative';
    }
    button.style.overflow = 'hidden';
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('m3-ripple');
    const existingRipple = button.querySelector('.m3-ripple');
    if (existingRipple) existingRipple.remove();
    button.appendChild(ripple);
}
// filename: js/utils.js