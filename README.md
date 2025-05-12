# Migraine Barometer

Migraine Barometer is a Progressive Web Application (PWA) designed to help users track local barometric pressure changes and understand their potential correlation with migraine occurrences. The app automatically detects significant pressure events, which can be visualized on a chart. Users can log their migraine events to observe potential correlations.

This project is hosted on GitHub Pages: [Visit Migraine Barometer](https://owaisilyasgh.github.io/Migraine-Barometer/) <!-- Update this link if it's your fork/deployment -->

## Features

*   **Barometric Pressure Display:** Shows current and historical surface pressure data using the Highcharts library for a pre-set location (mock data used in this version).
*   **Automated Pressure Event Detection:** Identifies significant pressure changes (rises, falls, ongoing trends) from the data and lists them in a table.
    *   **Event Highlighting:** Clicking on a detected event in the table highlights the corresponding time range on the pressure chart for easier visual correlation.
    *   **Merge/Unmerge Events:** Users can select two detected automated events and merge them into a single, combined event. Merged events can also be unmerged back into their original components. This is useful for custom grouping.
*   **PWA:** Installable on compatible devices for an app-like experience and offline access to the basic app shell and cached data (though data updates require an internet connection).
*   **Migraine Logging:** Allows users to log migraine events with start and end times.

## How It Works

1.  **Data Loading:** The app loads hourly surface pressure data (from `mock_pressure_data.json` in this version).
2.  **Charting:** Pressure data is visualized using the Highcharts library.
3.  **Automated Event Detection:** The system analyzes the pressure data to find periods of significant rise or fall. These are displayed in a table.
4.  **Event Interaction:**
    *   Clicking an event row in the table highlights the event's duration on the chart using a plot band.
    *   Users can select two events from the "Detected Pressure Events (Automated)" table and merge them. The system calculates the combined duration and overall pressure change. A merged event can be selected and unmerged to revert to its original constituent events.
5.  **Migraine Logging:** Users can log their migraine events, providing start/end times. This data is stored locally in the browser's `localStorage`.
6.  **Correlation (Manual):** Users can visually compare their logged migraines with the charted pressure data and the list of automatically detected (and potentially merged/unmerged) pressure events.

## Technical Details

*   **Frontend:** HTML, CSS, JavaScript.
*   **JavaScript Structure:** Organized into ES6 modules located in the `js/` directory, promoting better code organization and maintainability.
*   **PWA:** Service Worker for basic caching and offline capabilities, Web App Manifest.
*   **Charting:** [Highcharts](https://www.highcharts.com/) library for displaying pressure data and highlighting event ranges.
*   **Data Storage:**
    *   `localStorage` for migraine logs.
    *   Automated pressure events (including their merged/unmerged states) are managed in JavaScript memory and are session-specific (not persisted between page loads).
*   **Mock Data:** Uses `mock_pressure_data.json` for barometric pressure data. In a real application, this would typically come from a weather API.

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
*   `style.css`: Styles for the application.
*   `manifest.json`: Web App Manifest for PWA properties.
*   `sw.js`: Service Worker file (ensure this is present in your root if you intend for PWA offline capabilities to function beyond basic app shell caching).
*   `mock_pressure_data.json`: Sample pressure data.
*   `js/`: Directory containing the JavaScript modules:
    *   `app.js`: Main application logic and coordinator.
    *   `chartManager.js`: Manages Highcharts interactions.
    *   `pressureEventManager.js`: Handles detection and manipulation of pressure events.
    *   `uiRenderer.js`: Manages DOM updates and UI rendering.
    *   `db.js`: localStorage interaction for migraines.
    *   `config.js`: Application constants.
    *   `utils.js`: Utility functions.
*   `icons/`: (You may need to create this folder and add PWA icons as specified in `manifest.json`).

**Deployment:**

This app can be deployed on platforms like GitHub Pages or any static site hosting service. Ensure the server serves files correctly, especially for ES6 module loading.

## Future Considerations / Potential Improvements

*   User-configurable location and live API data fetching for pressure data.
*   Persistence for merged/unmerged states of automated events (e.g., using `localStorage` or a backend).
*   More sophisticated algorithm for automated event detection.
*   Data export/import functionality for migraine logs.
*   Notifications for specific pressure patterns (if desired).
*   Enhanced PWA features, including more robust offline data access for pressure events.

## Attribution

*   Charting library: [Highcharts](https://www.highcharts.com/)
*   Mock weather data format based on [Open-Meteo.com](https://open-meteo.com/). If using their live API, please respect their terms of service.

---
*Disclaimer: This application is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*