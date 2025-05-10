const LEARNED_THRESHOLDS_KEY = 'learned_thresholds';
// --- CONFIGURATION FOR LEARNING ---
const MIN_PAIN_FOR_ANALYSIS = 7; // Only analyze symptoms with pain level >= this
const HOURS_BEFORE_SYMPTOM_TO_ANALYZE = 24; // Look at pressure data X hours before symptom start
const SIGNIFICANT_DROP_HPA = -2.0; // e.g., a drop of 2 hPa or more
const SIGNIFICANT_RISE_HPA = 2.0;  // e.g., a rise of 2 hPa or more
const CHANGE_WINDOW_HOURS = 6;     // ...within a 6-hour window
// --- END CONFIGURATION ---

function getLearnedThresholds() {
    const thresholdsJson = localStorage.getItem(LEARNED_THRESHOLDS_KEY);
    return thresholdsJson ? JSON.parse(thresholdsJson) : { dropRate: null, riseRate: null, learned: false };
}

function saveLearnedThresholds(thresholds) {
    localStorage.setItem(LEARNED_THRESHOLDS_KEY, JSON.stringify(thresholds));
}

function analyzeSymptomsWithPressureData(symptoms, pressureDataHourly) {
    if (!symptoms || symptoms.length === 0 || !pressureDataHourly || !pressureDataHourly.time || !pressureDataHourly.surface_pressure) {
        return { message: "Not enough data to analyze.", thresholds: getLearnedThresholds() };
    }

    const pressureMap = new Map();
    pressureDataHourly.time.forEach((t, i) => {
        pressureMap.set(new Date(t).toISOString(), pressureDataHourly.surface_pressure[i]);
    });

    let significantDropEvents = 0;
    let significantRiseEvents = 0;
    let highPainSymptomsCount = 0;

    symptoms.forEach(log => {
        if (log.painLevel < MIN_PAIN_FOR_ANALYSIS) return;
        highPainSymptomsCount++;

        const symptomStartTime = new Date(log.startTime);
        
        // Find pressure changes in the window before the symptom
        let maxPressureInWindow = -Infinity;
        let minPressureInWindow = Infinity;
        let pressureAtStartOfWindow = null;
        let pressureNearSymptomStart = null;

        // Iterate hourly from HOURS_BEFORE_SYMPTOM_TO_ANALYZE up to symptom start
        for (let h = HOURS_BEFORE_SYMPTOM_TO_ANALYZE; h >= 0; h--) {
            const checkTime = new Date(symptomStartTime);
            checkTime.setHours(symptomStartTime.getHours() - h);
            
            const pressureVal = findClosestPressure(checkTime, pressureDataHourly.time, pressureDataHourly.surface_pressure);

            if (pressureVal === null) continue;

            if (h === HOURS_BEFORE_SYMPTOM_TO_ANALYZE) {
                pressureAtStartOfWindow = pressureVal;
            }
            if (h <= CHANGE_WINDOW_HOURS) { // Only consider changes within the smaller CHANGE_WINDOW_HOURS leading up to event
                 minPressureInWindow = Math.min(minPressureInWindow, pressureVal);
                 maxPressureInWindow = Math.max(maxPressureInWindow, pressureVal);
            }
            if (h === 0) { // Closest to symptom start
                pressureNearSymptomStart = pressureVal;
            }
        }
        
        if (pressureNearSymptomStart !== null) {
            // Check for drop: if pressure at symptom start is lower than max in preceding window
            if (minPressureInWindow !== Infinity && (pressureNearSymptomStart - minPressureInWindow) < SIGNIFICANT_DROP_HPA) { // Heuristic: looking for a drop from a recent peak
                 // More robust: pressureNearSymptomStart compared to pressure X hours before
                const pressureXHoursBefore = findClosestPressure(new Date(symptomStartTime.getTime() - CHANGE_WINDOW_HOURS * 60 * 60 * 1000), pressureDataHourly.time, pressureDataHourly.surface_pressure);
                if (pressureXHoursBefore !== null && (pressureNearSymptomStart - pressureXHoursBefore) <= SIGNIFICANT_DROP_HPA) {
                    significantDropEvents++;
                }
            }
            // Check for rise: if pressure at symptom start is higher than min in preceding window
            if (maxPressureInWindow !== -Infinity && (pressureNearSymptomStart - maxPressureInWindow) > SIGNIFICANT_RISE_HPA) {
                const pressureXHoursBefore = findClosestPressure(new Date(symptomStartTime.getTime() - CHANGE_WINDOW_HOURS * 60 * 60 * 1000), pressureDataHourly.time, pressureDataHourly.surface_pressure);
                if (pressureXHoursBefore !== null && (pressureNearSymptomStart - pressureXHoursBefore) >= SIGNIFICANT_RISE_HPA) {
                    significantRiseEvents++;
                }
            }
        }
    });

    if (highPainSymptomsCount < 3) { // Need at least a few high-pain events
        return { message: `Need at least 3 high-pain (>=${MIN_PAIN_FOR_ANALYSIS}) symptom logs. Found ${highPainSymptomsCount}.`, thresholds: getLearnedThresholds() };
    }

    // Basic "learning": if a type of change is predominant
    let learnedDropRate = null;
    let learnedRiseRate = null;
    let learned = false;

    // This is a very simplified heuristic.
    // If, say, >50% of high pain symptoms are preceded by a significant drop, set that as a threshold.
    if (significantDropEvents / highPainSymptomsCount > 0.5) {
        learnedDropRate = { hpa: SIGNIFICANT_DROP_HPA, hours: CHANGE_WINDOW_HOURS };
        learned = true;
    }
    if (significantRiseEvents / highPainSymptomsCount > 0.5) {
        learnedRiseRate = { hpa: SIGNIFICANT_RISE_HPA, hours: CHANGE_WINDOW_HOURS };
        learned = true;
    }
    
    const newThresholds = { dropRate: learnedDropRate, riseRate: learnedRiseRate, learned: learned };
    saveLearnedThresholds(newThresholds);

    if (learned) {
        return { message: "Personalized thresholds updated based on your logs.", thresholds: newThresholds };
    } else {
        return { message: "Could not establish clear personalized thresholds from current logs. More data might help.", thresholds: newThresholds };
    }
}

// Helper to find pressure at a specific time (or closest if not exact match)
function findClosestPressure(targetTime, timeArray, pressureArray) {
    const targetTimestamp = targetTime.getTime();
    let closestPressure = null;
    let minDiff = Infinity;

    for (let i = 0; i < timeArray.length; i++) {
        const currentTime = new Date(timeArray[i]).getTime();
        const diff = Math.abs(currentTime - targetTimestamp);
        if (diff < minDiff) {
            minDiff = diff;
            closestPressure = pressureArray[i];
        }
        // If we passed the target time and times are sorted, we can optimize,
        // but hourly data is sparse enough that a full scan is okay.
    }
    // Allow a match if within ~30 minutes for hourly data
    if (minDiff <= 30 * 60 * 1000) {
        return closestPressure;
    }
    return null; 
}
