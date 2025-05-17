# Migraine Barometer

Migraine Barometer is a Progressive Web Application (PWA) designed to help users track local barometric pressure changes and understand their potential correlation with migraine occurrences. The app automatically detects significant pressure events, which can be visualized on a chart. Users can log their migraine events to observe potential correlations.

This project is hosted on GitHub Pages: [Visit Migraine Barometer](https://owaisilyasgh.github.io/Migraine-Barometer/) <!-- Update this link if it's your fork/deployment -->

## Features

*   **Barometric Pressure Display:** Shows current and historical surface pressure data fetched from a live weather API, visualized using the Highcharts library. The app uses device geolocation if available, otherwise default coordinates.
*   **Automated Pressure Event Detection:** Identifies significant pressure changes (rises, falls, ongoing trends) from the data and lists them. This list transforms into a touch-friendly card carousel on mobile devices.
    *   **Event Highlighting:** Clicking on a detected event highlights the corresponding time range on the pressure chart for easier visual correlation.
*   **PWA:** Installable on compatible devices for an app-like experience and offline access to the basic app shell and cached data (though fresh data updates require an internet connection).
*   **Migraine Logging:** Allows users to log their migraine events with start and end times and associate severity with detected pressure events.

## How It Works

1.  **Data Loading:** The app loads hourly surface pressure data from the Open-Meteo weather API. It attempts to use the device's geolocation for precise data; if unavailable or denied, it uses default coordinates. Data is cached to minimize API calls and improve performance.
2.  **Charting:** Pressure data is visualized using the Highcharts library.
3.  **Automated Event Detection:** The system analyzes the pressure data to find periods of significant rise or fall. These are displayed in a table or mobile-friendly cards.
4.  **Event Interaction:**
    *   Clicking an event row/card highlights the event's duration on the chart using a plot band.
    *   Users can toggle the display of all detected events on the chart.
5.  **Migraine Logging:** Users can log their migraine severity directly against detected pressure events. This data is stored locally in the browser's `localStorage`.
6.  **Correlation (Manual):** Users can visually compare their logged migraines with the charted pressure data and the list of automatically detected pressure events.

## Technical Details

*   **Frontend:** HTML, CSS, JavaScript.
*   **JavaScript Structure:** Organized into ES6 modules located in the `js/` directory, promoting better code organization and maintainability.
*   **PWA:** Service Worker for basic caching and offline capabilities, Web App Manifest.
*   **Charting:** [Highcharts](https://www.highcharts.com/) library for displaying pressure data and highlighting event ranges.
*   **Data Source:** [Open-Meteo API](https://open-meteo.com/) for surface pressure data.
*   **Data Storage:**
    *   `localStorage` for migraine logs and user preferences.
    *   Pressure data from the API is cached in `localStorage` to reduce API calls and for faster loading.
    *   Automated pressure events are managed in JavaScript memory and re-calculated when data updates.

## Setup and Usage

**Running Locally (Crucial):**

1.  Clone or download the repository.
2.  **You MUST serve the files through a local web server.** Due to the use of ES6 JavaScript modules, directly opening the `index.html` file from your local file system (e.g., `file:///...`) **will not work**.
    *   **Recommended Servers:**
        *   If you have Node.js and npm: `npx live-server` in the project's root directory.
        *   If you have Python 3: `python -m http.server` in the project's root directory.
3.  Open your browser and navigate to the local server address (e.g., `http://localhost:8080`, `http://localhost:3000`, or `http://localhost:8000` depending on the server).

**Project Structure Overview:**
*   `index.html`: The main HTML file.
*   `css/`: Directory with CSS files (`m3-core.css`, `layout.css`, `components.css`, `chart.css`).
*   `manifest.json`: Web App Manifest for PWA properties.
*   `sw.js`: Service Worker file for caching and offline capabilities.
*   `js/`: Directory containing the JavaScript modules:
    *   `app.js`: Main application logic and coordinator.
    *   `chartManager.js`: Manages Highcharts interactions.
    *   `pressureEventManager.js`: Handles detection and manipulation of pressure events.
    *   `uiRenderer.js`: Manages DOM updates and UI rendering.
    *   `db.js`: localStorage interaction.
    *   `dataService.js`: Fetches and caches data from the API.
    *   `config.js`: Application constants.
    *   `utils.js`: Utility functions.
*   `icons/`: PWA icons as specified in `manifest.json`.

**Deployment:**

This app can be deployed on platforms like GitHub Pages or any static site hosting service. Ensure the server serves files correctly, especially for ES6 module loading.

## Future Considerations / Potential Improvements

*   User-configurable API settings or choice of weather providers.
*   Persistence for custom user-defined events (if this feature were added).
*   More sophisticated algorithm for automated event detection, potentially user-tunable.
*   Data export/import functionality for migraine logs.
*   Notifications for specific pressure patterns (if desired).
*   Enhanced PWA features, including more robust offline data access for pressure events if API allows.

## Attribution

*   Charting library: [Highcharts](https://www.highcharts.com/)
*   Weather data from [Open-Meteo.com](https://open-meteo.com/). Please respect their terms of service.

---
*Disclaimer: This application is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*
<!-- filename: README.md -->