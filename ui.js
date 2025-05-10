const chartSvg = document.getElementById('pressure-chart');
const locationInfoEl = document.getElementById('location-info');
const lastUpdatedEl = document.getElementById('last-updated');
const healthInfoEl = document.getElementById('health-info'); // To potentially update with personalized info
const forecastMessageEl = document.getElementById('forecast-message');

const CHART_MARGIN = { top: 20, right: 30, bottom: 50, left: 50 }; // Increased bottom for labels
let CHART_WIDTH = chartSvg.clientWidth || 600; // Initial width
let CHART_HEIGHT = 300; // Fixed height

function updateChartDimensions() {
    CHART_WIDTH = chartSvg.clientWidth || 600; // Update width on resize potentially
    // CHART_HEIGHT remains fixed or could be made responsive
}

function formatTimeForAxis(dateStr) {
    const date = new Date(dateStr);
    // Show date for the first tick of a new day, otherwise just time
    if (date.getHours() === 0) {
        return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}


function renderPressureChart(hourlyData, learnedThresholds = { learned: false }) {
    updateChartDimensions();
    chartSvg.innerHTML = ''; // Clear previous chart

    if (!hourlyData || !hourlyData.time || !hourlyData.time.length) {
        chartSvg.innerHTML = '<text x="10" y="20" fill="#ccc">No pressure data available to display.</text>';
        return;
    }

    const times = hourlyData.time.map(t => new Date(t));
    const pressures = hourlyData.surface_pressure;

    const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
    const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

    // Create scales
    const xScale = (date) => {
        const domainWidth = times[times.length - 1] - times[0];
        return CHART_MARGIN.left + ((date - times[0]) / domainWidth) * innerWidth;
    };

    const minPressure = Math.min(...pressures) - 2; // Add some padding
    const maxPressure = Math.max(...pressures) + 2; // Add some padding

    const yScale = (pressure) => {
        return CHART_MARGIN.top + innerHeight - ((pressure - minPressure) / (maxPressure - minPressure)) * innerHeight;
    };
    
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    chartSvg.appendChild(g);

    // X-axis (simplified)
    const xAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    xAxisGroup.setAttribute("class", "axis x-axis");
    xAxisGroup.setAttribute("transform", `translate(0, ${CHART_MARGIN.top + innerHeight})`);
    
    const numTicksX = Math.min(times.length, Math.floor(innerWidth / 80)); // Approx 1 tick per 80px
    for (let i = 0; i < numTicksX; i++) {
        const tickIndex = Math.floor(i * (times.length -1) / (numTicksX -1));
        const tickTime = times[tickIndex];
        const x = xScale(tickTime);
        
        const tickMark = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tickMark.setAttribute("x1", x);
        tickMark.setAttribute("x2", x);
        tickMark.setAttribute("y1", 0);
        tickMark.setAttribute("y2", 6);
        tickMark.setAttribute("stroke", "#777");
        xAxisGroup.appendChild(tickMark);

        const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tickLabel.setAttribute("x", x);
        tickLabel.setAttribute("y", 20);
        tickLabel.setAttribute("text-anchor", "middle");
        tickLabel.setAttribute("fill", "#bbb");
        tickLabel.style.fontSize = "0.75em";
        tickLabel.textContent = formatTimeForAxis(tickTime);
        xAxisGroup.appendChild(tickLabel);
    }
    g.appendChild(xAxisGroup);

    // Y-axis (simplified)
    const yAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    yAxisGroup.setAttribute("class", "axis y-axis");
    yAxisGroup.setAttribute("transform", `translate(${CHART_MARGIN.left}, 0)`);

    const numTicksY = 5;
    for (let i = 0; i <= numTicksY; i++) {
        const tickValue = minPressure + (i / numTicksY) * (maxPressure - minPressure);
        const y = yScale(tickValue);

        const tickMark = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tickMark.setAttribute("x1", -6);
        tickMark.setAttribute("x2", 0);
        tickMark.setAttribute("y1", y);
        tickMark.setAttribute("y2", y);
        tickMark.setAttribute("stroke", "#777");
        yAxisGroup.appendChild(tickMark);
        
        const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tickLabel.setAttribute("x", -10);
        tickLabel.setAttribute("y", y);
        tickLabel.setAttribute("text-anchor", "end");
        tickLabel.setAttribute("dominant-baseline", "middle");
        tickLabel.setAttribute("fill", "#bbb");
        tickLabel.style.fontSize = "0.75em";
        tickLabel.textContent = tickValue.toFixed(0);
        yAxisGroup.appendChild(tickLabel);
    }
    g.appendChild(yAxisGroup);
     // Y-axis label
    const yAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yAxisLabel.setAttribute("transform", "rotate(-90)");
    yAxisLabel.setAttribute("y", 0); // Position relative to left margin
    yAxisLabel.setAttribute("x", -(CHART_MARGIN.top + innerHeight / 2));
    yAxisLabel.setAttribute("dy", "1em"); // Offset from the y-axis line
    yAxisLabel.style.textAnchor = "middle";
    yAxisLabel.setAttribute("fill", "#ccc");
    yAxisLabel.style.fontSize = "0.8em";
    yAxisLabel.textContent = "Surface Pressure (hPa)";
    g.appendChild(yAxisLabel);


    // Data line
    const pathData = times.map((time, i) => `${i === 0 ? 'M' : 'L'}${xScale(time)},${yScale(pressures[i])}`).join(' ');
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", pathData);
    line.setAttribute("class", "line");
    g.appendChild(line);

    // Data points and warning windows/dots
    const now = new Date();
    times.forEach((time, i) => {
        const cx = xScale(time);
        const cy = yScale(pressures[i]);
        let isWarning = false;

        if (learnedThresholds.learned && time > now) { // Only for forecast period
            const pressureChange = calculatePressureChangeForPoint(i, pressures, learnedThresholds.dropRate || learnedThresholds.riseRate);
            if (learnedThresholds.dropRate && pressureChange <= learnedThresholds.dropRate.hpa) {
                isWarning = true;
            }
            if (learnedThresholds.riseRate && pressureChange >= learnedThresholds.riseRate.hpa) {
                isWarning = true;
            }

            if (isWarning) {
                // Highlight a window for the warning
                const windowRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                const xPrev = (i > 0) ? xScale(times[i-1]) : cx - (innerWidth / times.length / 2);
                const xNext = (i < times.length -1) ? xScale(times[i+1]) : cx + (innerWidth / times.length / 2);
                const rectWidth = (xNext - xPrev) / 2; // approx half distance to next/prev point for window
                
                windowRect.setAttribute("x", cx - rectWidth / 2);
                windowRect.setAttribute("y", CHART_MARGIN.top);
                windowRect.setAttribute("width", rectWidth);
                windowRect.setAttribute("height", innerHeight);
                windowRect.setAttribute("class", "warning-window");
                g.appendChild(windowRect); // Add before dots so dots are on top
            }
        }

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", cx);
        dot.setAttribute("cy", cy);
        dot.setAttribute("r", isWarning ? "5" : "3"); // Larger dot for warning
        dot.setAttribute("class", isWarning ? "warning-dot" : "dot");
        g.appendChild(dot);
    });
}

// Helper for chart rendering to check against learned thresholds
function calculatePressureChangeForPoint(currentIndex, pressures, thresholdConfig) {
    if (!thresholdConfig || currentIndex < thresholdConfig.hours) return 0; // Not enough data or no threshold
    
    const currentPressure = pressures[currentIndex];
    const pastPressure = pressures[currentIndex - thresholdConfig.hours];
    return currentPressure - pastPressure; // Positive for rise, negative for drop
}


function updateLocationInfo(apiLocation, elevation) {
    locationInfoEl.textContent = `Location: ${apiLocation.latitude.toFixed(2)}°N, ${apiLocation.longitude.toFixed(2)}°E. Timezone: ${apiLocation.timezone}.`;
    if (elevation && elevation !== 'N/A') { // GEM API might not provide elevation.
        locationInfoEl.textContent += ` Elevation: ${elevation}m.`;
    }
}

function updateLastUpdated(timestamp, source, error = null) {
    let statusText = `Last updated: ${timestamp.toLocaleString()}. `;
    if (source === 'network') statusText += "(Live)";
    else if (source === 'cache') statusText += "(From Cache)";
    else if (source === 'stale-cache') statusText += "(Stale Cache - Network Error)";
    
    if (error) {
        statusText += ` Error: ${error}`;
        lastUpdatedEl.style.color = '#cf6679'; // Red for error
    } else {
        lastUpdatedEl.style.color = '#aaa'; // Default color
    }
    lastUpdatedEl.textContent = statusText;
}

function updateLearningStatus(message) {
    const learningStatusEl = document.getElementById('learning-status');
    if (learningStatusEl) learningStatusEl.textContent = message;
}

function updateSymptomForecastMessage(thresholds) {
    if (thresholds && thresholds.learned) {
        let msg = "Personalized forecast active. ";
        if (thresholds.dropRate) msg += `Watching for pressure drops of ~${Math.abs(thresholds.dropRate.hpa)} hPa in ${thresholds.dropRate.hours} hrs. `;
        if (thresholds.riseRate) msg += `Watching for pressure rises of ~${thresholds.riseRate.hpa} hPa in ${thresholds.riseRate.hours} hrs. `;
        forecastMessageEl.textContent = msg.trim();
        forecastMessageEl.style.color = '#03dac6'; // Teal for active forecast
    } else {
        forecastMessageEl.textContent = "Log symptoms and click 'Analyze My Symptoms' to enable personalized forecasts. Chart will highlight general significant changes if any are detected by default settings.";
        forecastMessageEl.style.color = '#aaa';
    }
}

// Make chart responsive (basic version)
window.addEventListener('resize', () => {
    // This is a simplified version. A full app might need to re-fetch and re-render.
    // For now, just an idea to call a function that might re-evaluate dimensions.
    // The current renderPressureChart already reads clientWidth.
    // We would need to call it again with the data if we want it to truly redraw based on new width.
    // For simplicity, the user would need to refresh data to see a resized chart.
});
