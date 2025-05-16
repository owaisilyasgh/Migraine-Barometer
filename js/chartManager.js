// js/chartManager.js
import * as Config from './config.js';
import * as UIRenderer from './uiRenderer.js';

let pressureChartInstance = null;

export const HIGHCHARTS_EXPLICIT_DEFAULT_STYLES = {
    // Typically empty
};

export const BASE_HIGHCHARTS_OPTIONS = {
    accessibility: { enabled: true },
    credits: { enabled: false },
    time: { useUTC: false },
    chart: {
        type: 'areaspline',
        zooming: { mouseWheel: { enabled: true }, type: 'x' },
        panning: { enabled: true, type: 'x' },
        panKey: 'shift',
        backgroundColor: 'transparent',
        style: { fontFamily: 'var(--m3-font-family-plain, sans-serif)' },
        events: {
            load: function () {
                setTimeout(() => addCurrentTimePlotLine(this), 100);
                this.customUpdateInterval = setInterval(() => {
                    if (this.series && this.series.length > 0) {
                        addCurrentTimePlotLine(this);
                    }
                }, 60 * 1000);
            },
            redraw: function() {
                setTimeout(() => addCurrentTimePlotLine(this), 50);
            }
        }
    },
    title: { text: null },
    xAxis: {
        type: 'datetime',
        labels: {
            formatter: function () {
                const tickDate = new Date(this.value);
                const hours = tickDate.getHours();
                const minutes = tickDate.getMinutes();
                if (hours === 0 && minutes === 0) {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = monthNames[tickDate.getMonth()];
                    const day = tickDate.getDate();
                    return `${month} ${day}`;
                } else {
                    let h = hours;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12;
                    h = h ? h : 12;
                    return `${h} ${ampm}`;
                }
            },
            style: {
                color: 'var(--m3-on-surface-variant)',
                fontSize: '10px' // << MODIFIED FONT SIZE
            }
        },
        tickPositioner: function (min, max) {
            if (!this.series || !this.series[0] || typeof this.series[0].dataMin !== 'number' || typeof this.series[0].dataMax !== 'number') {
                return this.hcPos;
            }
            const dataMin = this.series[0].dataMin;
            const dataMax = this.series[0].dataMax;
            const threeHoursInMillis = 3 * 3600 * 1000;
            const positions = [];
            if ((dataMax - dataMin) < 1.5 * threeHoursInMillis) {
                 return this.hcPos;
            }
            let currentTickTime = new Date(dataMin);
            currentTickTime.setMinutes(0, 0, 0);
            currentTickTime.setHours(Math.floor(currentTickTime.getHours() / 3) * 3);
            while (currentTickTime.getTime() <= dataMax + threeHoursInMillis) {
                if (currentTickTime.getTime() >= dataMin - threeHoursInMillis) {
                    positions.push(currentTickTime.getTime());
                }
                currentTickTime.setTime(currentTickTime.getTime() + threeHoursInMillis);
            }
            const filteredPositions = positions.filter(p => p >= min && p <= max);
            if (filteredPositions.length < 2 && positions.length >=2) {
                 const reasonablySpacedOriginal = positions.filter(p => p >= dataMin && p <= dataMax);
                 if (reasonablySpacedOriginal.length >= 2) return reasonablySpacedOriginal;
                 return this.hcPos;
            }
            if (filteredPositions.length < 2) {
                 return this.hcPos;
            }
            return filteredPositions;
        },
        lineColor: 'var(--m3-outline-variant)',
        tickColor: 'var(--m3-outline-variant)'
    },
    yAxis: {
        title: { text: 'Surface Pressure (hPa)', style: { color: 'var(--m3-on-surface-variant)'} },
        labels: {
            style: {
                color: 'var(--m3-on-surface-variant)',
                fontSize: '10px' // << MODIFIED FONT SIZE
            }
        },
        gridLineColor: 'var(--m3-outline-variant)',
        gridLineDashStyle: 'longdash',
        opposite: false
    },
    tooltip: {
        shared: true,
        useHTML: true,
        formatter: function() {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
            let s = `<div>${dayName}, ${monthName} ${dayOfMonth}    ${formattedHours}:${formattedMinutes} ${ampm}</div>`;
            s += '<table>';
            this.points.forEach(point => {
                s += `<tr><td class="tooltip-series-name">${point.series.name}:</td>` +
                     `<td style="text-align: right"><b>${point.y.toFixed(1)} hPa</b></td></tr>`;
            });
            s += '</table>';
            return s;
        }
    },
    legend: { enabled: false },
    plotOptions: {
        series: {
            animation: { duration: 750 },
            marker: {
                enabled: true,
                radius: 2.5,
                states: { hover: { enabled: true, radius: 4.5 } }
            },
            states: { hover: { lineWidthPlus: 0 } },
            lineWidth: 2,
        },
        areaspline: {
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.color(Config.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0.4).get('rgba')],
                    [1, Highcharts.color(Config.CHART_AREA_FILL_GRADIENT_START_COLOR).setOpacity(0).get('rgba')]
                ]
            },
            lineWidth: 2,
            states: { hover: { lineWidth: 2 } },
            threshold: null
        }
    },
    exporting: { enabled: false }
};


export function initializeChart(times, pressures) {
    const chartContainer = document.getElementById(Config.CHART_CONTAINER_ID);
    if (!chartContainer) {
        console.error("Chart container div not found:", Config.CHART_CONTAINER_ID);
        UIRenderer.showNotification("Chart container not found.", "error");
        return;
    }

    if (pressureChartInstance) {
        destroyChart();
    }

    if (!times || !pressures || times.length === 0 || pressures.length === 0) {
        console.log("initializeChart: No data provided. Chart will not be created.");
        return;
    }

    const seriesData = times.map((time, index) => [time * 1000, pressures[index]]);
    let yAxisMin, yAxisMax;

    if (pressures.length > 0) {
        const minPressure = Math.min(...pressures);
        const maxPressure = Math.max(...pressures);
        const padding = Config.CHART_Y_AXIS_PADDING;
        if (maxPressure - minPressure < padding * 2 && pressures.length > 1) {
            yAxisMin = Math.floor(minPressure - Math.max(padding / 2, 0.5));
            yAxisMax = Math.ceil(maxPressure + Math.max(padding / 2, 0.5));
        } else if (pressures.length === 1) {
            yAxisMin = Math.floor(minPressure - padding);
            yAxisMax = Math.ceil(maxPressure + padding);
        } else {
            yAxisMin = Math.floor(minPressure - padding);
            yAxisMax = Math.ceil(maxPressure + padding);
        }
    }

    const finalChartOptions = Highcharts.merge(
        {},
        HIGHCHARTS_EXPLICIT_DEFAULT_STYLES,
        BASE_HIGHCHARTS_OPTIONS,
        {
            xAxis: {
                min: seriesData.length > 0 ? seriesData[0][0] : null,
                max: seriesData.length > 0 ? seriesData[seriesData.length - 1][0] : null,
            },
            yAxis: {
                min: yAxisMin,
                max: yAxisMax,
            },
            series: [{
                type: 'areaspline',
                name: 'Surface Pressure',
                data: seriesData,
                color: Config.PRIMARY_CHART_LINE_COLOR,
            }]
        }
    );

    try {
        console.log("Creating Highcharts instance with merged options (font size updated).");
        pressureChartInstance = Highcharts.chart(Config.CHART_CONTAINER_ID, finalChartOptions);
    } catch (error) {
        console.error("Error initializing Highcharts instance:", error);
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
            console.log("Previous chart instance destroyed.");
        } catch (e) {
            console.error("Error destroying chart:", e);
        }
        pressureChartInstance = null;
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) return;

    chartInstance.xAxis[0].removePlotLine(Config.CURRENT_TIME_PLOT_LINE_ID);
    const nowMs = new Date().getTime();
    const xAxisExtremes = chartInstance.xAxis[0].getExtremes();

    if (typeof xAxisExtremes.min === 'number' && typeof xAxisExtremes.max === 'number' &&
        nowMs >= xAxisExtremes.min && nowMs <= xAxisExtremes.max) {
        chartInstance.xAxis[0].addPlotLine({
            value: nowMs,
            color: Config.CURRENT_TIME_PLOT_LINE_COLOR,
            width: 1.5,
            id: Config.CURRENT_TIME_PLOT_LINE_ID,
            zIndex: 5,
        });
    }
}

export function clearAllAutomatedEventPlotBands() {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    const xAxis = pressureChartInstance.xAxis[0];
    if (xAxis.plotLinesAndBands && xAxis.plotLinesAndBands.length > 0) {
        for (let i = xAxis.plotLinesAndBands.length - 1; i >= 0; i--) {
            const band = xAxis.plotLinesAndBands[i];
            if (band.id && (band.id.startsWith(Config.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX) || band.id === Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID)) {
                try { xAxis.removePlotBand(band.id); } catch(e) {/*ignore*/}
            }
        }
    }
}

export function clearSingleEventHighlight() {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    try {
        pressureChartInstance.xAxis[0].removePlotBand(Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID);
    } catch (e) { /* ignore */ }
}

export function highlightSingleEventOnChart(eventData) {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    if (!eventData) {
        clearSingleEventHighlight();
        return;
    }
    clearAllAutomatedEventPlotBands();
    pressureChartInstance.xAxis[0].addPlotBand({
        from: eventData.startTime * 1000,
        to: eventData.endTime * 1000,
        color: Config.EVENT_HIGHLIGHT_COLOR,
        id: Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID,
        zIndex: 3,
    });
}

export function displayAllEventsOnChart(allEvents, prominentlyHighlightedEventId = null) {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    clearAllAutomatedEventPlotBands();
    if (!allEvents || allEvents.length === 0) return;

    allEvents.forEach(event => {
        let bandColor;
        if (event.type === 'rise') {
            bandColor = Config.EVENT_PLOT_BAND_RISE_COLOR;
        } else if (event.type === 'fall') {
            bandColor = Config.EVENT_PLOT_BAND_FALL_COLOR;
        } else {
            bandColor = Config.EVENT_PLOT_BAND_BASE_COLOR;
        }
        const isProminent = event.id === prominentlyHighlightedEventId;
        pressureChartInstance.xAxis[0].addPlotBand({
            from: event.startTime * 1000,
            to: event.endTime * 1000,
            color: bandColor,
            id: `${Config.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX}${event.id}`,
            zIndex: isProminent ? 3 : 2,
        });
    });
}

export function getChartInstance() {
    return pressureChartInstance;
}
// filename: js/chartManager.js