// js/chartManager.js
// existing imports
import { CHART_CONTAINER_ID, PLOT_BAND_ID } from './config.js';

let pressureChartInstance = null; // This global instance is still useful for other functions
const CURRENT_TIME_PLOT_LINE_ID = 'currentTimePlotLine';

/**
 * Initializes the Highcharts pressure chart.
 * @param {number[]} times - Array of Unix timestamps (seconds).
 * @param {number[]} pressures - Array of pressure values.
 */
export function initializeChart(times, pressures) {
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (!chartContainer) {
        console.error("Chart container div not found for Highcharts:", CHART_CONTAINER_ID);
        return null;
    }

    if (!times || !pressures || times.length === 0 || pressures.length === 0 || times.length !== pressures.length) {
        console.error("Invalid or empty data provided for chart initialization.");
        if (pressureChartInstance) {
            pressureChartInstance.destroy(); // Destroy previous instance if any
            pressureChartInstance = null;
        }
        chartContainer.innerHTML = '<p style="text-align:center;padding-top:20px;">No valid pressure data to display.</p>';
        return null;
    }

    const seriesData = times.map((time, index) => [time * 1000, pressures[index]]);

    try {
        if (pressureChartInstance) {
            pressureChartInstance.destroy();
        }
        // Assign to the global pressureChartInstance so other functions can use it
        pressureChartInstance = Highcharts.chart(CHART_CONTAINER_ID, {
            chart: {
                type: 'spline',
                zoomType: 'x',
                events: {
                    load: function() {
                        // 'this' refers to the chart instance here
                        addCurrentTimePlotLine(this); // Pass the chart instance
                    }
                }
            },
            title: {
                text: null
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%e %b, %H:%M', this.value);
                    }
                },
                title: {
                    text: 'Time'
                }
            },
            yAxis: {
                title: {
                    text: 'Surface Pressure (hPa)'
                }
            },
            tooltip: {
                formatter: function () {
                    return `<b>${Highcharts.dateFormat('%A, %b %e, %Y, %H:%M', this.x)}</b><br/>Pressure: ${this.y.toFixed(1)} hPa`;
                }
            },
            series: [{
                name: 'Surface Pressure',
                data: seriesData,
                marker: {
                    enabled: false
                },
                color: '#007bff'
            }],
            accessibility: {
                enabled: true
            },
            credits: {
                enabled: false
            }
        });
        return pressureChartInstance; // Return the instance
    } catch (error) {
        console.error("Error initializing Highcharts:", error);
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="text-align:center;color:red;padding-top:20px;">Error initializing chart. See console for details.</p>';
        }
        pressureChartInstance = null; // Ensure it's null on error
        return null;
    }
}

/**
 * Adds a plot line to indicate the current time on the chart.
 * This function is now intended to be called with the chart instance, typically from chart.events.load.
 * @param {object} chartInstance - The Highcharts chart instance.
 */
export function addCurrentTimePlotLine(chartInstance) { // Accepts chartInstance as argument
    console.log("addCurrentTimePlotLine called via chart.load event"); // DIAGNOSTIC LOG

    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) {
        console.warn("Chart instance or xAxis not ready for current time plot line (called from chart.load).");
        return;
    }

    // Remove existing current time plot line if it exists
    chartInstance.xAxis[0].removePlotLine(CURRENT_TIME_PLOT_LINE_ID);

    const now = new Date().getTime(); // Current time in milliseconds
    console.log("Current time (ms) for plot line:", now, new Date(now).toLocaleString()); // DIAGNOSTIC LOG

    const xAxisExtremes = chartInstance.xAxis[0].getExtremes();
    console.log("Chart X-axis min (ms):", xAxisExtremes.min, new Date(xAxisExtremes.min).toLocaleString()); // DIAGNOSTIC LOG
    console.log("Chart X-axis max (ms):", xAxisExtremes.max, new Date(xAxisExtremes.max).toLocaleString()); // DIAGNOSTIC LOG
    console.log("Chart X-axis dataMin (ms):", xAxisExtremes.dataMin, new Date(xAxisExtremes.dataMin).toLocaleString()); // DIAGNOSTIC LOG
    console.log("Chart X-axis dataMax (ms):", xAxisExtremes.dataMax, new Date(xAxisExtremes.dataMax).toLocaleString()); // DIAGNOSTIC LOG

    if (now >= xAxisExtremes.dataMin && now <= xAxisExtremes.dataMax) {
        chartInstance.xAxis[0].addPlotLine({
            value: now,
            color: 'red',
            width: 2,
            id: CURRENT_TIME_PLOT_LINE_ID,
            zIndex: 5,
            label: {
                text: 'Now',
                y: 1,         // Adjusted: Lifts the label a bit more above the line
                style: {
                    color: 'red',
                    fontWeight: 'bold'
                }
            },
            dashStyle: 'ShortDash'
        });
        console.log("Plot line 'Now' should have been added."); // DIAGNOSTIC LOG
    } else {
        console.log("Current time is outside the chart's data range. 'Now' line not added."); // DIAGNOSTIC LOG
    }
}

/**
 * Updates or removes a plot band on the chart to highlight an event.
 * Relies on the global pressureChartInstance.
 * @param {object|null} eventData - Object with startTime and endTime (Unix seconds), or null to remove.
 */
export function updateChartPlotBand(eventData) {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) {
        // If called before chart is ready, this is expected.
        // console.warn("Global Highcharts instance or xAxis not ready for plot band.");
        return;
    }

    pressureChartInstance.xAxis[0].removePlotBand(PLOT_BAND_ID);

    if (eventData && typeof eventData.startTime === 'number' && typeof eventData.endTime === 'number') {
        pressureChartInstance.xAxis[0].addPlotBand({
            from: eventData.startTime * 1000,
            to: eventData.endTime * 1000,
            color: 'rgba(0, 123, 255, 0.2)',
            id: PLOT_BAND_ID,
            zIndex: 3
        });
    }
}

/**
 * Destroys the chart instance if it exists.
 * Relies on the global pressureChartInstance.
 */
export function destroyChart() {
    if (pressureChartInstance) {
        try {
            pressureChartInstance.destroy();
            pressureChartInstance = null;
            console.log("Chart destroyed.");
        } catch (error) {
            console.error("Error destroying chart:", error);
        }
    }
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (chartContainer) {
        chartContainer.innerHTML = '';
    }
}