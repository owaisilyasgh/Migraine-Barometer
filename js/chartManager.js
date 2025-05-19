// js/chartManager.js
import * as G_CONFIG from './config.js';
import * as UIRenderer from './uiRenderer.js';

let pressureChartInstance = null;
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function xAxisLabelFormatter() {
    const tickDate = new Date(this.value);
    const hours = tickDate.getHours();
    const minutes = tickDate.getMinutes();
    if (this.isFirst || this.isLast || (hours === 0 && minutes === 0 && tickDate.getTime() % (24 * 3600 * 1000) === tickDate.getTimezoneOffset() * 60 * 1000)) {
        return `${monthNames[tickDate.getMonth()]} ${tickDate.getDate()}`;
    }
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''} ${ampm}`;
}

const defaultChartOptions = {
    chart: {
        type: 'area',
        zoomType: 'x',
        backgroundColor: 'transparent',
        plotBorderColor: 'transparent',
        events: {
            load: function () {
                if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Highcharts 'load' event fired.");
                setTimeout(() => addCurrentTimePlotLine(this), 100);
                this.customUpdateInterval = setInterval(() => {
                    if (this && this.xAxis && this.xAxis.length > 0) {
                        addCurrentTimePlotLine(this);
                    } else if (this.customUpdateInterval) {
                        clearInterval(this.customUpdateInterval);
                    }
                }, 60000);
            },
            destroy: function() {
                if (this.customUpdateInterval) clearInterval(this.customUpdateInterval);
            },
            redraw: function() {
                if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Highcharts 'redraw' event fired.");
                setTimeout(() => addCurrentTimePlotLine(this), 50);
            }
        },
        panning: { enabled: true, type: 'x' },
        panKey: 'shift',
        resetZoomButton: {
            position: { align: 'right', verticalAlign: 'top', x: -10, y: 10 },
            relativeTo: 'chart'
        },
        height: null,
    },
    accessibility: { enabled: false },
    title: { text: null },
    subtitle: { text: null },
    credits: { enabled: false },
    xAxis: {
        type: 'datetime',
        labels: { formatter: xAxisLabelFormatter, style: { color: 'var(--m3-on-surface-variant)' } },
        lineColor: 'var(--m3-outline)',
        tickColor: 'var(--m3-outline-variant)',
        crosshair: { width: 1, color: G_CONFIG.CHART_SERIES_LINE_COLOR, dashStyle: 'shortdot' },
        plotLines: []
    },
    yAxis: {
        title: { text: null },
        labels: { formatter: function () { return this.value.toFixed(0); }, style: { color: 'var(--m3-on-surface-variant)' } },
        gridLineDashStyle: 'ShortDot',
        gridLineColor: 'var(--m3-outline-variant)',
        minPadding: 0.1, maxPadding: 0.1
    },
    tooltip: {
        useHTML: true,
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
            let s = `<div class="tooltip-date"><b>${dayName}, ${monthName} ${dayOfMonth}</b></div>`;
            s += `<div class="tooltip-time">Time: ${formattedHours}:${formattedMinutes} ${ampm}</div>`;
            this.points.forEach(point => {
                s += `<div class="tooltip-point-data"><span class="tooltip-series-name" style="color:${point.series.color};">${point.series.name}</span>: ` +
                     `<b class="tooltip-value">${point.y.toFixed(1)} hPa</b></div>`;
            });
            return s;
        },
        shared: true,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        shadow: false,
        padding: 0,
        style: { fontFamily: 'var(--m3-font-family-plain)' }
    },
    legend: { enabled: false },
    plotOptions: {
        series: {
            animation: { duration: 750 },
            marker: { enabled: false, radius: 3, states: { hover: { enabled: true, radius: 5 } } },
            lineWidth: 2.5,
            states: { hover: { lineWidth: 3 } },
            threshold: null
        },
        area: {
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.color(G_CONFIG.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0.4).get('rgba')],
                    [1, Highcharts.color(G_CONFIG.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0).get('rgba')]
                ]
            },
            marker: { radius: 2 },
            lineWidth: 2,
            states: { hover: { lineWidth: 2.5 } },
            threshold: null
        }
    },
    series: [{ name: 'Pressure', data: [], color: G_CONFIG.CHART_SERIES_LINE_COLOR, pointStart: Date.UTC(2023, 0, 1), pointInterval: 3600 * 1000 }]
};

export function initializeChart(times, pressures) {
    const chartContainer = document.getElementById(G_CONFIG.CHART_CONTAINER_ID);
    if (!chartContainer) {
        if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Chart container div not found:", G_CONFIG.CHART_CONTAINER_ID);
        return;
    }
    destroyChart();
    if (!times || !pressures || times.length === 0 || pressures.length === 0 || times.length !== pressures.length) {
        if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: initializeChart - No data or data length mismatch. Chart not created.");
        return;
    }
    const seriesData = times.map((time, index) => [time, pressures[index]]);
    const minPressure = Math.min(...pressures);
    const maxPressure = Math.max(...pressures);
    const pressureRange = maxPressure - minPressure;
    let yAxisMin, yAxisMax;
    if (pressureRange === 0) {
        yAxisMin = Math.floor(minPressure - G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA);
        yAxisMax = Math.ceil(maxPressure + G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA);
    } else {
        const padding = Math.max(pressureRange * G_CONFIG.CHART_YAXIS_PADDING_DYNAMIC_FACTOR, G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA);
        yAxisMin = Math.floor(minPressure - padding);
        yAxisMax = Math.ceil(maxPressure + padding);
    }
    const finalChartOptions = Highcharts.merge(defaultChartOptions, {
        series: [{ data: seriesData }],
        yAxis: { min: yAxisMin, max: yAxisMax },
        chart: { height: chartContainer.clientHeight || G_CONFIG.DEFAULT_CHART_HEIGHT_PX }
    });
    try {
        if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Creating Highcharts instance with height:", finalChartOptions.chart.height);
        pressureChartInstance = Highcharts.chart(G_CONFIG.CHART_CONTAINER_ID, finalChartOptions);
    } catch (error) {
        if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error initializing Highcharts instance:", error);
        UIRenderer.showNotification("Error initializing chart.", "error");
        pressureChartInstance = null;
    }
}

export function destroyChart() {
    if (pressureChartInstance) {
        try {
            if (pressureChartInstance.customUpdateInterval) {
                clearInterval(pressureChartInstance.customUpdateInterval);
                pressureChartInstance.customUpdateInterval = null;
            }
            pressureChartInstance.destroy();
            if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Previous chart instance destroyed.");
        } catch (e) {
            if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error destroying chart:", e);
        } finally {
            pressureChartInstance = null;
        }
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || chartInstance.xAxis.length === 0) {
        if (G_CONFIG.DEBUG_MODE) console.warn("ChartManager: addCurrentTimePlotLine - Chart or xAxis not ready.");
        return;
    }
    try {
        chartInstance.xAxis[0].removePlotLine(G_CONFIG.CURRENT_TIME_PLOT_LINE_ID);
        const nowMs = new Date().getTime();
        const xAxisExtremes = chartInstance.xAxis[0].getExtremes();
        if (nowMs >= xAxisExtremes.min && nowMs <= xAxisExtremes.max) {
            chartInstance.xAxis[0].addPlotLine({
                value: nowMs, color: G_CONFIG.CURRENT_TIME_LINE_COLOR, width: 2,
                id: G_CONFIG.CURRENT_TIME_PLOT_LINE_ID, dashStyle: 'ShortDash', zIndex: 5,
            });
        }
    } catch (e) {
        if (G_CONFIG.DEBUG_MODE) console.warn("ChartManager: Error adding/removing current time plot line:", e);
    }
}

export function clearAllAutomatedEventPlotBands() {
    if (pressureChartInstance && pressureChartInstance.xAxis && pressureChartInstance.xAxis.length > 0) {
        const xAxis = pressureChartInstance.xAxis[0];
        const plotBandsCopy = [...(xAxis.plotLinesAndBands || [])];
        plotBandsCopy.forEach(band => {
            if (band.id && (
                band.id.startsWith(G_CONFIG.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX) ||
                band.id === G_CONFIG.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID ||
                band.id === G_CONFIG.ACTIVE_FOCUS_PLOT_BAND_ID)) {
                try { xAxis.removePlotBand(band.id); } catch(e) { /*ignore*/ }
            }
        });
        if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: All automated event plot bands (multi, single, active) cleared.");
    }
}

export function clearSingleEventHighlight() { // This might be redundant if clearAllAutomatedEventPlotBands is always used first
    if (pressureChartInstance && pressureChartInstance.xAxis && pressureChartInstance.xAxis.length > 0) {
        try {
            pressureChartInstance.xAxis[0].removePlotBand(G_CONFIG.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID);
            pressureChartInstance.xAxis[0].removePlotBand(G_CONFIG.ACTIVE_FOCUS_PLOT_BAND_ID);
            if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Single event highlight (and active focus) plot band explicitly cleared.");
        } catch (e) { /* ignore if not found */ }
    }
}

export function highlightSingleEventOnChart(eventData, isFocusBandOnly = false) {
    if (!pressureChartInstance || !eventData) return;
    if (G_CONFIG.DEBUG_MODE) console.log(`ChartManager: Highlighting event ${eventData.id}. Focus only (purple): ${isFocusBandOnly}`);

    // Clear only previous single highlights before drawing a new one.
    // This ensures this function doesn't interfere with bands from displayAllEventsOnChart.
    clearSingleEventHighlight();

    const bandColor = isFocusBandOnly ? G_CONFIG.ACTIVE_FOCUS_HIGHLIGHT_COLOR : G_CONFIG.PLOT_BAND_HIGHLIGHT_COLOR;
    const bandId = isFocusBandOnly ? G_CONFIG.ACTIVE_FOCUS_PLOT_BAND_ID : G_CONFIG.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID;

    try {
        pressureChartInstance.xAxis[0].addPlotBand({
            from: eventData.startTime * 1000,
            to: eventData.endTime * 1000,
            color: bandColor,
            id: bandId,
            zIndex: 3 // Increased zIndex to ensure this highlight is on top
        });
    } catch(e) {
        if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error adding single event/focus plot band:", e);
    }
}

export function displayAllEventsOnChart(allEvents, prominentlyHighlightedEventId = null) {
    // Note: prominentlyHighlightedEventId is not used here anymore as per app.js changes.
    // The single prominent highlight is now handled by a separate call to highlightSingleEventOnChart.
    if (!pressureChartInstance || !allEvents || allEvents.length === 0) {
        if (G_CONFIG.DEBUG_MODE && allEvents && allEvents.length > 0) console.warn("ChartManager: displayAllEventsOnChart called but no chart instance.");
        return;
    }
    if (G_CONFIG.DEBUG_MODE) console.log(`ChartManager: Displaying all BASE events on chart. Count: ${allEvents.length}.`);

    // Do not clearAllAutomatedEventPlotBands() here; app.js's updateChartHighlights handles initial clearing.
    // This function now only ADDS the base event bands.

    allEvents.forEach(event => {
        if (!event.isPressureEvent) return;

        let color;
        // Since prominentHighlight is handled separately, all bands here are "standard"
        switch (event.type) {
            case 'rise': color = G_CONFIG.PLOT_BAND_RISE_COLOR; break;
            case 'fall': color = G_CONFIG.PLOT_BAND_FALL_COLOR; break;
            default: color = G_CONFIG.PLOT_BAND_STABLE_COLOR;
        }
        const zIndex = 2; // Standard zIndex for base event bands

        try {
            pressureChartInstance.xAxis[0].addPlotBand({
                from: event.startTime * 1000,
                to: event.endTime * 1000,
                color: color,
                id: `${G_CONFIG.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX}${event.id}`,
                zIndex: zIndex
            });
        } catch (e) {
            if (G_CONFIG.DEBUG_MODE) console.error(`ChartManager: Error adding plot band for event ${event.id}:`, e);
        }
    });
}

export function getChartInstance() { return pressureChartInstance; }

export function reflowChart() {
    if (pressureChartInstance) {
        try {
            pressureChartInstance.reflow();
            if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Chart reflowed.");
        } catch (e) {
            if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error during chart reflow:", e);
        }
    }
}
// filename: js/chartManager.js