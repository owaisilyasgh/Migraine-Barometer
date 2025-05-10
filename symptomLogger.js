const SYMPTOM_LOGS_KEY = 'symptom_logs';

function getSymptomLogs() {
    const logsJson = localStorage.getItem(SYMPTOM_LOGS_KEY);
    return logsJson ? JSON.parse(logsJson) : [];
}

function addSymptomLog(startTime, endTime, painLevel) {
    if (!startTime || !endTime || !painLevel) {
        console.error("Invalid symptom log data provided.");
        return false;
    }
    if (new Date(startTime) >= new Date(endTime)) {
        alert("Symptom start time must be before end time.");
        return false;
    }

    const logs = getSymptomLogs();
    const newLog = {
        id: Date.now().toString(), // Simple unique ID
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        painLevel: parseInt(painLevel)
    };
    logs.push(newLog);
    logs.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)); // Keep sorted
    localStorage.setItem(SYMPTOM_LOGS_KEY, JSON.stringify(logs));
    console.log('Symptom logged:', newLog);
    return true;
}

// Optional: function to clear logs for testing
function clearSymptomLogs() {
    localStorage.removeItem(SYMPTOM_LOGS_KEY);
    console.log('All symptom logs cleared.');
}
