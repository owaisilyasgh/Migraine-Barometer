// js/chartManager.js
import * as G_CONFIG from './config.js';
import * as UIRenderer from './uiRenderer.js'; // Ensure UIRenderer is imported if used directly

let pressureChartInstance = null;
const dayNames = G_CONFIG.DAY_NAMES_SHORT;
const monthNames = G_CONFIG.MONTH_NAMES_SHORT;


function xAxisLabelFormatter() {
    // 'this' refers to the label context in Highcharts
    const tickDate = new Date(this.value);
    const hours = tickDate.getHours();
    const minutes = tickDate.getMinutes();

    // Show date for the first, last, or midnight ticks
    if (this.isFirst || this.isLast || (hours === 0 && minutes === 0 && tickDate.getTime() % (24 * 3600 * 1000) === tickDate.getTimezoneOffset() * 60 * 1000)) {
        return `${monthNames[tickDate.getMonth()]} ${tickDate.getDate()}`;
    }
    // Show hour for other ticks
    let displayHours = hours % 12;
    displayHours = displayHours ? displayHours : 12; // hour '0' should be '12'
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${displayHours}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''} ${ampm}`;
}


const defaultChartOptions = {
    chart: {
        type: 'areaspline',
        zoomType: 'x',
        backgroundColor: 'transparent', // M3 surface from CSS
        style: {
            fontFamily: 'var(--m3-font-family-plain, Roboto, sans-serif)'
        },
        height: G_CONFIG.CHART_CONTAINER_HEIGHT || 280, // Default height, can be dynamic
        events: {
            load: function () {
                if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Highcharts 'load' event fired.");
                setTimeout(() => addCurrentTimePlotLine(this), 100);
                this.customUpdateInterval = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        addCurrentTimePlotLine(this);
                    }
                }, 60000);
            },
            destroy: function() {
                if (this.customUpdateInterval) clearInterval(this.customUpdateInterval);
            },
            redraw: function () {
                if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Highcharts 'redraw' event fired.");
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
            formatter: xAxisLabelFormatter,
            style: { color: 'var(--m3-on-surface-variant)' }
        },
        lineColor: 'var(--m3-outline-variant)',
        tickColor: 'var(--m3-outline-variant)',
        crosshair: {
            width: 1,
            color: 'var(--m3-primary)',
            snap: false
        },
        plotLines: []
    },
    yAxis: {
        title: { text: null },
        labels: { formatter: function () { return this.value.toFixed(0); }, style: { color: 'var(--m3-on-surface-variant)' } },
        gridLineColor: 'var(--m3-outline-variant)',
        gridLineDashStyle: 'ShortDash',
        opposite: false,
        minPadding: 0.05,
        maxPadding: 0.05,
    },
    tooltip: {
        useHTML: true,
        headerFormat: '', // Cleared to use pointFormatter exclusively for content structure
        pointFormatter: function () {
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

            // Combined date and time into a single div, styled with CSS for inline behavior
            let s = `<div class="tooltip-datetime"><b>${dayName}, ${monthName} ${dayOfMonth}</b> ${formattedHours}:${formattedMinutes} ${ampm}</div>`;
            s += `<div class="tooltip-point-data" style="color:${this.series.color};">`;
            s += `${this.series.name}: <b class="tooltip-value">${this.y.toFixed(1)} hPa</b></div>`;
            return s;
        },
        shared: false,
        split: false,
        backgroundColor: 'rgba(48, 48, 51, 0.9)',
        borderColor: 'transparent',
        borderWidth: 0,
        shadow: false,
        padding: 0, // CSS handles padding via .highcharts-tooltip > span
        style: {
            color: '#F0F0F3', // M3 Inverse On Surface
        },
    },
    legend: { enabled: false },
    plotOptions: {
        series: {
            animation: { duration: 750 },
            marker: {
                enabled: true,
                radius: 3,
                states: { hover: { enabled: true, radius: 5 } }
            },
            lineWidth: 2,
            states: { hover: { lineWidth: 2 } },
            fillOpacity: 0.3
        },
        areaspline: {
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.color(G_CONFIG.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0.4).get('rgba')],
                    [1, Highcharts.color(G_CONFIG.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0).get('rgba')]
                ]
            },
        }
    },
    series: [{ // This is the template for the series
        name: 'Pressure', // Default name
        data: [],
        color: G_CONFIG.CHART_SERIES_LINE_COLOR, // Default color
    }]
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

    if (pressureRange < (G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA * 2 / G_CONFIG.CHART_YAXIS_PADDING_DYNAMIC_FACTOR)) {
        yAxisMin = Math.floor(minPressure - G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA);
        yAxisMax = Math.ceil(maxPressure + G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA);
    } else {
        const padding = Math.max(pressureRange * G_CONFIG.CHART_YAXIS_PADDING_DYNAMIC_FACTOR, G_CONFIG.CHART_YAXIS_PADDING_MIN_HPA);
        yAxisMin = Math.floor(minPressure - padding);
        yAxisMax = Math.ceil(maxPressure + padding);
    }

    // Create the series object for the chart, ensuring name and color are explicitly set.
    const chartSeries = {
        name: defaultChartOptions.series[0].name, // Explicitly take from default
        color: defaultChartOptions.series[0].color, // Explicitly take from default
        data: seriesData
        // Other series properties like 'type' will be inherited from plotOptions or defaultChartOptions.series[0] via merge.
    };

    const finalChartOptions = Highcharts.merge(defaultChartOptions, {
        series: [chartSeries], // Use the explicitly constructed series object
        yAxis: {
            min: yAxisMin,
            max: yAxisMax
        },
        chart: {
             height: chartContainer.clientHeight || G_CONFIG.CHART_CONTAINER_HEIGHT || 280
        }
    });
    // Highcharts.merge will correctly use the `name` and `color` from our `chartSeries` object,
    // as it's a direct property of the series object in the array.

    try {
        if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Creating Highcharts instance with height:", finalChartOptions.chart.height);
        pressureChartInstance = Highcharts.chart(G_CONFIG.CHART_CONTAINER_ID, finalChartOptions);
    } catch (error) {
        if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error initializing Highcharts instance:", error);
        if (UIRenderer && UIRenderer.showNotification) UIRenderer.showNotification("Error initializing chart.", "error");
    }
}

export function destroyChart() {
    if (pressureChartInstance) {
        try {
            if (pressureChartInstance.customUpdateInterval) {
                clearInterval(pressureChartInstance.customUpdateInterval);
            }
            pressureChartInstance.destroy();
            pressureChartInstance = null;
            if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Previous chart instance destroyed.");
        } catch (e) {
            if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error destroying chart:", e);
            pressureChartInstance = null;
        }
    }
}


export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) {
        if (G_CONFIG.DEBUG_MODE) console.warn("ChartManager: addCurrentTimePlotLine - Chart or xAxis not ready.");
        return;
    }
    try {
        chartInstance.xAxis[0].removePlotLine(G_CONFIG.CURRENT_TIME_PLOT_LINE_ID);
        const nowMs = new Date().getTime();
        const xAxisExtremes = chartInstance.xAxis[0].getExtremes();

        if (nowMs >= xAxisExtremes.min && nowMs <= xAxisExtremes.max) {
            chartInstance.xAxis[0].addPlotLine({
                value: nowMs,
                color: 'var(--m3-tertiary)',
                width: 2,
                id: G_CONFIG.CURRENT_TIME_PLOT_LINE_ID,
                zIndex: 5,
                dashStyle: 'ShortDash',
            });
        }
    } catch (e) {
        if (G_CONFIG.DEBUG_MODE) console.warn("ChartManager: Error adding/removing current time plot line:", e);
    }
}


export function clearAllAutomatedEventPlotBands() {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    const xAxis = pressureChartInstance.xAxis[0];
    const plotBandsCopy = [...(xAxis.plotLinesAndBands || [])];

    plotBandsCopy.forEach(band => {
        if (band.id && (
            band.id.startsWith(G_CONFIG.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX) ||
            band.id === G_CONFIG.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID ||
            band.id === G_CONFIG.ACTIVE_FOCUS_PLOT_BAND_ID)
        ) {
            try { xAxis.removePlotBand(band.id); } catch(e) { /*ignore*/ }
        }
    });
    if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: All automated event plot bands (multi, single, active) cleared.");
}


export function clearSingleEventHighlight() {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    try {
        pressureChartInstance.xAxis[0].removePlotBand(G_CONFIG.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID);
        pressureChartInstance.xAxis[0].removePlotBand(G_CONFIG.ACTIVE_FOCUS_PLOT_BAND_ID);
        if (G_CONFIG.DEBUG_MODE) console.log("ChartManager: Single event highlight (and active focus) plot band explicitly cleared.");
    } catch (e) { /* ignore if not found */ }
}


export function highlightSingleEventOnChart(eventData, isFocusBandOnly = false) {
    if (!pressureChartInstance || !eventData || !eventData.startTime || !eventData.endTime) return;
    if (G_CONFIG.DEBUG_MODE) console.log(`ChartManager: Highlighting event ${eventData.id}. Focus only (purple): ${isFocusBandOnly}`);

    clearSingleEventHighlight();

    const color = isFocusBandOnly ? G_CONFIG.ACTIVE_FOCUS_HIGHLIGHT_COLOR : G_CONFIG.PLOT_BAND_HIGHLIGHT_COLOR;
    const bandId = isFocusBandOnly ? G_CONFIG.ACTIVE_FOCUS_PLOT_BAND_ID : G_CONFIG.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID;

    try {
        pressureChartInstance.xAxis[0].addPlotBand({
            from: eventData.startTime * 1000,
            to: eventData.endTime * 1000,
            color: color,
            id: bandId,
            zIndex: 3
        });
    } catch (e) {
        if (G_CONFIG.DEBUG_MODE) console.error("ChartManager: Error adding single event/focus plot band:", e);
    }
}


export function displayAllEventsOnChart(allEvents, prominentlyHighlightedEventId = null) {
    if (!pressureChartInstance || !allEvents) {
      if (G_CONFIG.DEBUG_MODE && allEvents && allEvents.length > 0) console.warn("ChartManager: displayAllEventsOnChart called but no chart instance.");
      return;
    }
    if (G_CONFIG.DEBUG_MODE) console.log(`ChartManager: Displaying all BASE events on chart. Count: ${allEvents.length}.`);


    allEvents.forEach(event => {
        if (!event.isPressureEvent || !event.startTime || !event.endTime) return;

        try {
            const color = G_CONFIG.PLOT_BAND_DEFAULT_COLOR;
            const zIndex = 2;

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