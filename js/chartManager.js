// js/chartManager.js
import { CHART_CONTAINER_ID, PLOT_BAND_ID, CURRENT_TIME_PLOT_LINE_ID } from './config.js';

// Set Highcharts global options to use local time
Highcharts.setOptions({
    time: {
        useUTC: false
    }
});

let pressureChartInstance = null;

export function initializeChart(times, pressures) {
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (!chartContainer) {
        console.error("Chart container div not found for Highcharts:", CHART_CONTAINER_ID);
        return null;
    }

    if (!times || !pressures || times.length === 0 || pressures.length === 0 || times.length !== pressures.length) {
        console.error("Invalid or empty data provided for chart initialization.");
        if (pressureChartInstance) {
            pressureChartInstance.destroy();
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
        pressureChartInstance = Highcharts.chart(CHART_CONTAINER_ID, {
            chart: {
                type: 'spline',
                zoomType: 'x',
                events: {
                    load: function() {
                        addCurrentTimePlotLine(this);
                        // Minimal log to confirm chart options if needed in future
                        // console.log(`Chart Loaded. Configured useUTC: ${this.options.time.useUTC}, Global useUTC: ${Highcharts.getOptions().time.useUTC}`);
                    }
                }
            },
            time: { // Explicitly set for this chart instance as well
                useUTC: false
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
        return pressureChartInstance;
    } catch (error) {
        console.error("Error initializing Highcharts:", error);
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="text-align:center;color:red;padding-top:20px;">Error initializing chart. See console for details.</p>';
        }
        pressureChartInstance = null;
        return null;
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) {
        // console.warn("Chart instance or xAxis not ready for current time plot line."); // Keep if still useful
        return;
    }
    chartInstance.xAxis[0].removePlotLine(CURRENT_TIME_PLOT_LINE_ID);

    const nowMs = new Date().getTime();
    const xAxisExtremes = chartInstance.xAxis[0].getExtremes();

    if (nowMs >= xAxisExtremes.dataMin && nowMs <= xAxisExtremes.dataMax) {
        chartInstance.xAxis[0].addPlotLine({
            value: nowMs,
            color: 'red',
            width: 2,
            id: CURRENT_TIME_PLOT_LINE_ID,
            zIndex: 5,
            label: {
                text: 'Now',
                align: 'center',
                y: -5,
                style: {
                    color: 'red',
                    fontWeight: 'bold'
                }
            },
            dashStyle: 'ShortDash'
        });
    } else {
        // console.log("Current time is outside the chart's data range. 'Now' line not added."); // Keep if useful
    }
}

export function updateChartPlotBand(eventData) {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) {
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

export function destroyChart() {
    if (pressureChartInstance) {
        try {
            pressureChartInstance.destroy();
            pressureChartInstance = null;
            // console.log("Chart destroyed."); // Keep if useful
        } catch (error) {
            console.error("Error destroying chart:", error);
        }
    }
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (chartContainer) {
        chartContainer.innerHTML = '';
    }
}
// filename: js/chartManager.js