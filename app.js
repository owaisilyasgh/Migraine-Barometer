document.addEventListener('DOMContentLoaded', () => {
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    }

    const symptomForm = document.getElementById('symptom-form');
    const analyzeButton = document.getElementById('analyze-symptoms');

    let currentPressureData = null; // To store the fetched API data

    async function initializeApp() {
        const { data, source, error, lastUpdated } = await getPressureData();
        const apiLocation = getApiLocationInfo();
        
        updateLocationInfo(apiLocation, data ? data.elevation : 'N/A');
        updateLastUpdated(lastUpdated, source, error);

        if (data && data.hourly) {
            currentPressureData = data.hourly; // Store for learning module
            const thresholds = getLearnedThresholds();
            renderPressureChart(data.hourly, thresholds);
            updateSymptomForecastMessage(thresholds);
        } else {
            renderPressureChart(null); // Show "no data" message
            updateSymptomForecastMessage(null);
            if (error) {
                 alert(`Failed to load pressure data: ${error}. Displaying cached data if available.`);
            }
        }
    }

    symptomForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const startTime = document.getElementById('symptom-start').value;
        const endTime = document.getElementById('symptom-end').value;
        const painLevel = document.getElementById('pain-level').value;

        if (addSymptomLog(startTime, endTime, painLevel)) {
            alert('Symptom logged successfully!');
            symptomForm.reset();
             // Optionally, re-analyze or prompt user to re-analyze
            updateLearningStatus("New symptom logged. Consider re-analyzing if you've logged enough data.");
        } else {
            // Error already handled in addSymptomLog with an alert
        }
    });

    analyzeButton.addEventListener('click', () => {
        if (!currentPressureData) {
            alert('Pressure data not loaded. Cannot analyze symptoms.');
            return;
        }
        const symptoms = getSymptomLogs();
        if (symptoms.length === 0) {
            alert('No symptoms logged. Please log symptoms before analyzing.');
            return;
        }

        updateLearningStatus('Analyzing symptoms...');
        // Simulate a short delay for UX, as analysis might be quick
        setTimeout(() => {
            const { message, thresholds } = analyzeSymptomsWithPressureData(symptoms, currentPressureData);
            updateLearningStatus(message);
            updateSymptomForecastMessage(thresholds);
            // Re-render chart with new thresholds
            if (currentPressureData) {
                renderPressureChart(currentPressureData, thresholds);
            }
            alert(message); // Also alert the user
        }, 500);
    });

    // Initial load
    initializeApp();
});
