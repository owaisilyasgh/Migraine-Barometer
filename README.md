# Migraine Barometer

Migraine Barometer is a Progressive Web Application (PWA) designed to help users track local barometric pressure changes and understand their potential correlation with migraine occurrences. By logging migraine events and their intensity, the app aims to learn personalized pressure change thresholds that might indicate an increased likelihood of a migraine.

This project is hosted on GitHub Pages: [Visit Migraine Barometer](https://owaisilyasgh.github.io/Migraine-Barometer/)

## Features

*   **Barometric Pressure Forecast:** Displays current and forecasted surface pressure data for a pre-set location (Toronto, Canada).
*   **PWA:** Installable on compatible devices for an app-like experience and offline access to the basic app shell and cached data.
*   **Symptom Logging:** Allows users to log migraine events with start time, end time, and pain intensity.
*   **Personalized Migraine Forecast:**
    *   Analyzes logged migraine events against historical pressure data.
    *   Aims to identify patterns (significant pressure drops or rises) that correlate with the user's reported migraines.
    *   Highlights potential "migraine risk windows" on the forecast chart based on learned thresholds.
*   **Offline Capability:** The app shell and last fetched data are cached for offline use. Data updates every 12 hours when online.

## How It Works

1.  **Data Fetching:** The app fetches hourly surface pressure data (past 3 days, forecast 5 days) from the [Open-Meteo API](https://open-meteo.com/). Data is cached and refreshed every 12 hours.
2.  **Symptom Logging:** Users can log their migraine events, providing start/end times and pain level. This data is stored locally in the browser.
3.  **Learning Module:** When the user initiates an analysis, the app compares their logged migraine events with the pressure data around those times. It looks for correlations between high-pain events and specific pressure change patterns (e.g., rapid drops or rises within a defined window).
4.  **Personalized Forecast:** If patterns are identified, the app establishes personalized thresholds. The forecast chart will then highlight upcoming periods where similar pressure changes are predicted, indicating a potential "migraine risk window."

## Technical Details

*   **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
*   **PWA:** Service Worker for caching and offline capabilities, Web App Manifest.
*   **Charting:** Basic SVG charting (no external charting libraries used in this version).
*   **Data Storage:** LocalStorage for API data cache, symptom logs, and learned thresholds.
*   **API:** [Open-Meteo Weather API](https://open-meteo.com/) for barometric pressure data.

## Setup and Usage

**Running Locally:**

1.  Clone or download the repository.
2.  You need to serve the files through a local web server because Service Workers (essential for PWAs) require HTTPS or localhost.
    *   If you have Python 3: `python -m http.server` in the project directory.
    *   If you have Node.js and npm: `npx live-server` in the project directory.
3.  Open your browser and navigate to the local server address (e.g., `http://localhost:8000` or `http://localhost:8080`).

**Deployment:**

This app is configured for deployment on GitHub Pages. Pushing the files to the `main` (or `master`) branch of your GitHub repository and enabling Pages in the repository settings should make it live.

## Future Considerations / Potential Improvements

*   User-configurable location.
*   More sophisticated learning algorithm.
*   Enhanced UI/UX for onboarding and feedback.
*   Data export/import functionality for users.
*   Notifications for predicted risk windows.

## Attribution

*   Weather data provided by [Open-Meteo.com](https://open-meteo.com/). Please respect their terms of service.

---
*Disclaimer: This application is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*
