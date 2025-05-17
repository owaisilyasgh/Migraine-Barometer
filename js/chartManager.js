// filename: js/chartManager.js
import * as Config from './config.js';
import * as UIRenderer from './uiRenderer.js'; // For notifications if needed
import { formatUnixTimestamp, dayNames, monthNames } from './utils.js'; // For formatting

let pressureChartInstance = null;

// Helper for X-Axis tick label formatting
function xAxisLabelFormatter() {
    const tickDate = new Date(this.value);
    const hours = tickDate.getHours();
    const minutes = tickDate.getMinutes();

    if (this.isFirst || this.isLast || (hours === 0 && minutes === 0 && tickDate.getTime() % (24 * 3600 * 1000) === tickDate.getTimezoneOffset() * 60 * 1000)) {
        return `${monthNames[tickDate.getMonth()]} ${tickDate.getDate()}`;
    }

    let H = hours;
    const ampm = H >= 12 ? 'PM' : 'AM';
    H = H % 12;
    H = H ? H : 12;

    return `${H}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''} ${ampm}`;
}

const baseChartOptions = {
    chart: {
        type: 'areaspline',
        backgroundColor: 'transparent',
        plotBorderWidth: 0,
        style: {
            fontFamily: 'var(--m3-font-family-plain, Roboto, sans-serif)'
        },
        height: 275, // MODIFIED: Explicitly set chart height to fit within the 280px CSS container height
        events: {
            load: function () {
                if (Config.DEBUG_MODE) console.log("ChartManager: Highcharts 'load' event fired.");
                setTimeout(() => addCurrentTimePlotLine(this), 100);
                this.customUpdateInterval = setInterval(() => {
                    if (this && this.axes) {
                        addCurrentTimePlotLine(this);
                    } else {
                        if (this.customUpdateInterval) clearInterval(this.customUpdateInterval);
                    }
                }, 60 * 1000);
            },
            redraw: function() {
                if (Config.DEBUG_MODE) console.log("ChartManager: Highcharts 'redraw' event fired.");
                setTimeout(() => addCurrentTimePlotLine(this), 50);
            }
        }
    },
    title: { text: null },
    subtitle: { text: null },
    credits: { enabled: false },
    xAxis: {
        type: 'datetime',
        labels: {
            enabled: true,
            formatter: xAxisLabelFormatter,
            style: {
                color: 'var(--m3-on-surface-variant)',
                fontSize: '10px',
            },
            autoRotation: [-10, -20, -30, -45],
            padding: 8,
        },
        tickAmount: 5,
        gridLineWidth: 0,
        lineColor: 'var(--m3-outline-variant)',
        tickColor: 'var(--m3-outline-variant)',
        tickWidth: 1,
        plotLines: [],
        plotBands: []
    },
    yAxis: {
        title: {
            text: null,
            align: 'high',
            offset: 0,
            rotation: 0,
            y: -15,
            style: {
                color: 'var(--m3-on-surface-variant)',
                fontSize: '10px'
            }
        },
        labels: {
            enabled: true,
            formatter: function () { return this.value.toFixed(0); },
            style: {
                color: 'var(--m3-on-surface-variant)',
                fontSize: '9px',
            },
            x: -5
        },
        gridLineColor: 'var(--m3-outline-variant)',
        gridLineDashStyle: 'Dash',
    },
    legend: { enabled: false },
    tooltip: {
        formatter: function () {
            const localDate = new Date(this.x);
            const dayName = dayNames[localDate.getDay()];
            const dayOfMonth = localDate.getDate();
            const monthName = monthNames[localDate.getMonth()];
            let hours = localDate.getHours();
            const minutes = localDate.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;

            const formattedHours = String(hours);
            const formattedMinutes = String(minutes).padStart(2, '0');

            let tooltipHtml = `<div style="padding: 5px;">`;
            tooltipHtml += `<div style="font-size: 0.9em; margin-bottom: 4px;"><b>${dayName}, ${monthName} ${dayOfMonth}, ${formattedHours}:${formattedMinutes} ${ampm}</b></div>`;
            tooltipHtml += '<table>';
            this.points.forEach(point => {
                tooltipHtml += `<tr><td style="color:${point.series.color};padding-right:5px;" class="tooltip-series-name">${point.series.name}:</td>
                                <td style="text-align: right"><b>${point.y.toFixed(1)} hPa</b></td></tr>`;
            });
            tooltipHtml += '</table></div>';
            return tooltipHtml;
        },
        useHTML: true,
        padding: 0,
        shared: true,
        crosshairs: [{
            width: 1,
            color: 'var(--m3-primary)',
            dashStyle: 'Solid'
        }, false],
        positioner: function (labelWidth, labelHeight, point) {
            const chart = this.chart;
            const { plotLeft, plotWidth, plotTop, plotHeight } = chart;
            const tooltipX = point.plotX + plotLeft;
            const tooltipY = point.plotY + plotTop - labelHeight - 10;

            let x = tooltipX - labelWidth / 2;
            if (x < plotLeft) {
                x = plotLeft;
            } else if (x + labelWidth > plotLeft + plotWidth) {
                x = plotLeft + plotWidth - labelWidth;
            }

            let y = tooltipY;
            if (y < plotTop) {
                y = point.plotY + plotTop + 15;
            }
            if (y + labelHeight > plotTop + plotHeight) {
                 y = plotTop + plotHeight - labelHeight;
            }

            return { x, y };
        }
    },
    plotOptions: {
        series: {
            animation: {
                duration: 750
            },
            marker: {
                enabled: false,
                states: {
                    hover: {
                        enabled: true,
                        lineWidth: 0,
                        lineWidthPlus: 0,
                        radiusPlus: 0,
                        radius: 4,
                        fillColor: 'var(--m3-primary)',
                        lineColor: 'var(--m3-primary)'
                    }
                }
            },
            states: {
                hover: {
                    lineWidthPlus: 0
                }
            },
            pointStart: Date.UTC(2023, 0, 1),
            pointInterval: 3600 * 1000
        },
        areaspline: {
            fillOpacity: 0.3,
            threshold: null
        }
    },
    series: [{
        type: 'areaspline',
        name: 'Pressure',
        data: [],
        color: Config.CHART_LINE_COLOR,
        lineColor: Config.CHART_LINE_COLOR,
        fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
                [0, Highcharts.color(Config.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0.4).get('rgba')],
                [1, Highcharts.color(Config.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0).get('rgba')]
            ]
        },
    }],
    responsive: {
        rules: [{
            condition: {
                maxWidth: Config.MOBILE_BREAKPOINT_PX
            },
            chartOptions: {
            }
        }]
    },
    exporting: { enabled: false },
    accessibility: { enabled: false }
};


export function initializeChart(times, pressures) {
    const chartContainer = document.getElementById(Config.CHART_CONTAINER_ID);
    if (!chartContainer) {
        if (Config.DEBUG_MODE) console.error("ChartManager: Chart container div not found:", Config.CHART_CONTAINER_ID);
        return;
    }

    destroyChart();

    if (!times || !pressures || times.length === 0 || times.length !== pressures.length) {
        if (Config.DEBUG_MODE) console.log("ChartManager: initializeChart - No data provided or data length mismatch. Chart will not be created.");
        chartContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--m3-on-surface-variant);">No pressure data available to display chart.</p>';
        return;
    }
    chartContainer.innerHTML = '';

    try {
        const seriesData = times.map((time, index) => [time, pressures[index]]);

        const minPressure = Math.min(...pressures);
        const maxPressure = Math.max(...pressures);
        let yAxisMin, yAxisMax;

        const pressureRange = maxPressure - minPressure;
        if (pressureRange < Config.CHART_YAXIS_MIN_RANGE_FOR_DYNAMIC_PADDING_HPA) {
            yAxisMin = Math.floor(minPressure - Config.CHART_YAXIS_PADDING_MIN_HPA);
            yAxisMax = Math.ceil(maxPressure + Config.CHART_YAXIS_PADDING_MIN_HPA);
        } else {
            const padding = Math.max(pressureRange * Config.CHART_YAXIS_PADDING_DYNAMIC_FACTOR, Config.CHART_YAXIS_PADDING_MIN_HPA);
            yAxisMin = Math.floor(minPressure - padding);
            yAxisMax = Math.ceil(maxPressure + padding);
        }

        const finalChartOptions = Highcharts.merge(
            baseChartOptions,
            {
                series: [{ data: seriesData }],
                yAxis: {
                    min: yAxisMin,
                    max: yAxisMax
                }
            }
        );
        // Override height if container has a specific height set via CSS, and it's smaller than our default.
        // This makes the explicit chart.height in baseChartOptions a default that can be overridden by CSS.
        // However, for this specific request, we are enforcing the chart.height from baseChartOptions.
        // If dynamic height based on CSS container was preferred, we would do something like:
        // if (chartContainer.clientHeight && chartContainer.clientHeight < (finalChartOptions.chart.height || Infinity)) {
        //     finalChartOptions.chart.height = chartContainer.clientHeight;
        // }


        if (Config.DEBUG_MODE) console.log("ChartManager: Creating Highcharts instance with height:", finalChartOptions.chart.height);
        pressureChartInstance = Highcharts.chart(Config.CHART_CONTAINER_ID, finalChartOptions);

    } catch (error) {
        if (Config.DEBUG_MODE) console.error("ChartManager: Error initializing Highcharts instance:", error);
        UIRenderer.showNotification("Error initializing chart.", "error");
        chartContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--m3-error);">Error displaying chart.</p>';
    }
}

export function destroyChart() {
    if (pressureChartInstance) {
        try {
            if (pressureChartInstance.customUpdateInterval) {
                clearInterval(pressureChartInstance.customUpdateInterval);
            }
            pressureChartInstance.destroy();
            if (Config.DEBUG_MODE) console.log("ChartManager: Previous chart instance destroyed.");
        } catch (e) {
            if (Config.DEBUG_MODE) console.error("ChartManager: Error destroying chart:", e);
        } finally {
            pressureChartInstance = null;
        }
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) {
        if (Config.DEBUG_MODE) console.warn("ChartManager: addCurrentTimePlotLine - Chart or xAxis not ready.");
        return;
    }
    try {
        chartInstance.xAxis[0].removePlotLine(Config.CURRENT_TIME_PLOT_LINE_ID);
        const nowMs = new Date().getTime();
        const xAxisExtremes = chartInstance.xAxis[0].getExtremes();

        if (nowMs >= xAxisExtremes.min && nowMs <= xAxisExtremes.max) {
            chartInstance.xAxis[0].addPlotLine({
                value: nowMs,
                color: 'var(--m3-error)',
                width: 2,
                id: Config.CURRENT_TIME_PLOT_LINE_ID,
                zIndex: 5,
            });
        }
    } catch (e) {
        if (Config.DEBUG_MODE) console.warn("ChartManager: Error adding/removing current time plot line:", e);
    }
}

export function clearAllAutomatedEventPlotBands() {
    if (pressureChartInstance && pressureChartInstance.xAxis && pressureChartInstance.xAxis[0]) {
        const xAxis = pressureChartInstance.xAxis[0];
        const plotBandsCopy = [...(xAxis.plotLinesAndBands || [])];

        plotBandsCopy.forEach(band => {
            if (band.id && (
                band.id.startsWith(Config.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX) ||
                band.id === Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID ||
                band.id === Config.ACTIVE_FOCUS_PLOT_BAND_ID
            )) {
                try { xAxis.removePlotBand(band.id); } catch(e) { /*ignore*/ }
            }
        });
        if (Config.DEBUG_MODE) console.log("ChartManager: All automated event plot bands cleared.");
    }
}

export function clearSingleEventHighlight() {
    if (pressureChartInstance && pressureChartInstance.xAxis && pressureChartInstance.xAxis[0]) {
        try {
            pressureChartInstance.xAxis[0].removePlotBand(Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID);
            pressureChartInstance.xAxis[0].removePlotBand(Config.ACTIVE_FOCUS_PLOT_BAND_ID);
            if (Config.DEBUG_MODE) console.log("ChartManager: Single event highlight (and active focus) plot band cleared.");
        } catch (e) { /* ignore */ }
    }
}

export function highlightSingleEventOnChart(eventData) {
    if (!pressureChartInstance || !eventData) return;
    if (Config.DEBUG_MODE) console.log("ChartManager: Highlighting single event on chart:", eventData.id);

    clearSingleEventHighlight();

    try {
        pressureChartInstance.xAxis[0].addPlotBand({
            from: eventData.startTime * 1000,
            to: eventData.endTime * 1000,
            color: Config.FOCUSED_EVENT_PLOT_BAND_COLOR,
            id: Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID,
            zIndex: 3
        });
    } catch (e) {
        if (Config.DEBUG_MODE) console.error("ChartManager: Error adding single event plot band:", e);
    }
}

export function displayAllEventsOnChart(allEvents, prominentlyHighlightedEventId = null) {
    if (!pressureChartInstance || !allEvents) return;
    if (Config.DEBUG_MODE) console.log(`ChartManager: Displaying all events on chart. Count: ${allEvents.length}. Prominent: ${prominentlyHighlightedEventId}`);

    clearAllAutomatedEventPlotBands();

    allEvents.forEach(event => {
        if (!event.isPressureEvent) return;

        let bandColor = Config.AUTOMATED_EVENT_PLOT_BAND_DEFAULT_COLOR;
        let bandId = `${Config.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX}${event.id}`;
        let zIndex = 2;

        if (event.id === prominentlyHighlightedEventId) {
            bandColor = Config.FOCUSED_EVENT_PLOT_BAND_COLOR;
            bandId = Config.ACTIVE_FOCUS_PLOT_BAND_ID;
            zIndex = 4;
        }

        try {
            pressureChartInstance.xAxis[0].addPlotBand({
                from: event.startTime * 1000,
                to: event.endTime * 1000,
                color: bandColor,
                id: bandId,
                zIndex: zIndex
            });
        } catch (e) {
            if (Config.DEBUG_MODE) console.error(`ChartManager: Error adding plot band for event ${event.id}:`, e);
        }
    });
}

export function getChartInstance() {
    return pressureChartInstance;
}

export function reflowChart() {
    if (pressureChartInstance) {
        pressureChartInstance.reflow();
        if (Config.DEBUG_MODE) console.log("ChartManager: Chart reflowed.");
    }
}
// filename: js/chartManager.js