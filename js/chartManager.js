// js/chartManager.js
import * as Config from './config.js';
import * as UIRenderer from './uiRenderer.js'; 

let pressureChartInstance = null;

export const HIGHCHARTS_EXPLICIT_DEFAULT_STYLES = {
    chart: {
        backgroundColor: 'var(--m3-surface-container-low, #FFFBFE)', 
        style: { fontFamily: 'var(--m3-font-family-plain, sans-serif)' },
        plotBorderColor: 'var(--m3-outline-variant, #C4C6C9)', 
    },
    title: {
        text: null // Remove chart title
    },
    subtitle: {
        // text: null // Also remove subtitle if not needed, or keep for other info
        style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-body-medium-font-size, 14px)' } 
    },
    xAxis: {
        labels: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-medium-font-size, 12px)' } }, 
        lineColor: 'var(--m3-outline-variant, #C4C6C9)',
        tickColor: 'var(--m3-outline-variant, #C4C6C9)',
        title: { style: { color: 'var(--m3-on-surface-variant, #49454F)' } }
    },
    yAxis: { 
        labels: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-medium-font-size, 12px)' } }, 
        gridLineColor: 'var(--m3-outline-variant, #E0E0E0)', 
        title: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-large-font-size, 14px)' } }
    },
    legend: {
        enabled: false // Remove legend
    },
    tooltip: {
        backgroundColor: 'var(--m3-inverse-surface, #313033)', 
        borderColor: 'var(--m3-outline, #79747E)',
        style: { color: 'var(--m3-inverse-on-surface, #F4EFF4)', fontSize: 'var(--m3-body-small-font-size, 12px)' } 
    },
    plotOptions: {
        series: {
            dataLabels: { style: { color: 'var(--m3-on-surface, #1C1B1F)', fontSize: '11px', fontWeight: '500', textOutline: 'none' } }, 
            marker: {
                enabled: true, 
                radius: 3,
                states: { hover: { enabled: true, radius: 5 } }
            }
        },
        spline: { marker: { enabled: false } },
        area: {
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.4)'], 
                    [1, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.05)']
                ]
            },
            marker: { enabled: false },
            lineWidth: 2,
            lineColor: 'var(--m3-primary, #6750A4)'
        }
    },
    navigation: { 
        buttonOptions: {
            symbolStroke: 'var(--m3-on-surface-variant, #49454F)',
            theme: { fill: 'transparent' } 
        },
        menuStyle: { background: 'var(--m3-surface-container-low, #F7F2FA)', border: '1px solid var(--m3-outline, #79747E)', padding: '8px 0' }, 
        menuItemStyle: { background: 'none', color: 'var(--m3-on-surface-variant, #49454F)', padding: '12px 16px', fontSize: 'var(--m3-body-medium-font-size, 14px)' }, 
        menuItemHoverStyle: { background: 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.08)', color: 'var(--m3-on-surface-variant, #49454F)' } 
    },
    credits: { enabled: false }, 
    colors: ['var(--m3-primary, #6750A4)', 'var(--m3-secondary, #625B71)', 'var(--m3-tertiary, #7D5260)', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'], 
};

export const BASE_HIGHCHARTS_OPTIONS = {
    time: {
        useUTC: false, 
    },
    xAxis: {
        type: 'datetime',
        labels: {
            formatter: function () {
                return Highcharts.dateFormat('%e %b, %H:%M', this.value);
            }
        },
        title: { text: 'Time' }
    },
    yAxis: { 
        title: { text: 'Surface Pressure (hPa)' }
    },
    tooltip: {
        xDateFormat: '%A, %b %e, %Y, %H:%M',
        pointFormatter: function () {
            return `Pressure: <b>${this.y.toFixed(1)} hPa</b>`;
        },
        shared: true, 
        split: false 
    },
    exporting: {
        buttons: { contextButton: { menuItems: [] } }
    },
    plotOptions: {
        series: {
            animation: { duration: 750 }, 
            turboThreshold: 5000 
        }
    }
};

Highcharts.setOptions(HIGHCHARTS_EXPLICIT_DEFAULT_STYLES); 
Highcharts.setOptions(BASE_HIGHCHARTS_OPTIONS); 

export function initializeChart(times, pressures, availableThemes = [], activeThemeId = '', onThemeSelectedCallback = () => {}) {
    const chartContainer = document.getElementById(Config.CHART_CONTAINER_ID);
    if (!chartContainer) {
        console.error("Chart container div not found:", Config.CHART_CONTAINER_ID);
        UIRenderer.showNotification("Chart container not found.", "error");
        return;
    }

    if (pressureChartInstance) {
        try {
            pressureChartInstance.destroy();
        } catch (e) {
            console.warn("Minor error destroying previous chart instance:", e);
        }
        pressureChartInstance = null;
    }

    const seriesData = times.map((time, index) => [time * 1000, pressures[index]]); 

    let yAxisMin = undefined;
    let yAxisMax = undefined;

    if (pressures && pressures.length > 0) {
        const minPressure = Math.min(...pressures);
        const maxPressure = Math.max(...pressures);
        const padding = Config.CHART_Y_AXIS_PADDING;

        yAxisMin = Math.floor(minPressure - padding);
        yAxisMax = Math.ceil(maxPressure + padding);

        if (yAxisMax - yAxisMin < (padding * 2) ) { 
            yAxisMin = Math.floor(minPressure - Math.max(padding, 1)); 
            yAxisMax = Math.ceil(maxPressure + Math.max(padding, 1)); 
        }
        if (yAxisMin === yAxisMax) { 
            yAxisMin -= 1;
            yAxisMax += 1;
        }
    }

    const themeMenuItems = availableThemes.map(theme => ({
        text: `${theme.id === activeThemeId ? '✓ ' : ''}${theme.name}`,
        onclick: function () { onThemeSelectedCallback(theme.id); },
        style: theme.id === activeThemeId ? { fontWeight: 'bold' } : {}
    }));
    themeMenuItems.push({ separator: true }); 

    try {
        pressureChartInstance = Highcharts.chart(Config.CHART_CONTAINER_ID, {
            // title is now null and legend enabled: false via Highcharts.setOptions above
            yAxis: {
                min: yAxisMin,
                max: yAxisMax
            },
            series: [{
                name: 'Surface Pressure', // Still useful for tooltip if shared, but legend is off
                type: 'area', 
                data: seriesData,
                color: 'var(--m3-primary, #6750A4)', 
                 fillColor: { 
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.4)'],
                        [1, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.05)']
                    ]
                },
                lineColor: 'var(--m3-primary, #6750A4)',
                lineWidth: 2,
            }],
            exporting: {
                buttons: {
                    contextButton: {
                        menuItems: themeMenuItems.concat(Highcharts.getOptions().exporting.buttons.contextButton.menuItems.slice(1)) 
                    }
                }
            },
            chart: {
                events: {
                    load: function () {
                        addCurrentTimePlotLine(this); 
                        setInterval(() => {
                            if (pressureChartInstance === this) { 
                                addCurrentTimePlotLine(this);
                            }
                        }, 60000); 
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error initializing Highcharts:", error);
        UIRenderer.showNotification("Error initializing chart.", "error");
        if (pressureChartInstance) {
            try { pressureChartInstance.destroy(); } catch (e) { /* ignore */ }
            pressureChartInstance = null;
        }
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) return;
    chartInstance.xAxis[0].removePlotLine(Config.CURRENT_TIME_PLOT_LINE_ID);
    const nowMs = new Date().getTime(); 
    const xAxisExtremes = chartInstance.xAxis[0].getExtremes();

    if (xAxisExtremes && nowMs >= xAxisExtremes.min && nowMs <= xAxisExtremes.max) {
        chartInstance.xAxis[0].addPlotLine({
            value: nowMs,
            color: 'var(--m3-error, red)', 
            width: 2,
            id: Config.CURRENT_TIME_PLOT_LINE_ID,
            zIndex: 5, 
            label: {
                text: 'Now',
                align: 'right',
                y: 12,
                x: -5,
                style: { color: 'var(--m3-error, red)', fontWeight: 'bold' }
            }
        });
    }
}

export function clearAllAutomatedEventPlotBands() {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    const xAxis = pressureChartInstance.xAxis[0];
    for (let i = xAxis.plotLinesAndBands.length - 1; i >= 0; i--) {
        const band = xAxis.plotLinesAndBands[i];
        if (band.id && band.id.startsWith(Config.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX)) {
            xAxis.removePlotBand(band.id);
        }
    }
}

export function clearSingleEventHighlight() {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    pressureChartInstance.xAxis[0].removePlotBand(Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID);
}

export function highlightSingleEventOnChart(eventData) {
    if (!pressureChartInstance) {
        console.warn("Cannot update plot band: Chart instance not available.");
        return;
    }
    clearAllAutomatedEventPlotBands(); 
    clearSingleEventHighlight(); 

    if (eventData && eventData.startTime && eventData.endTime) {
        pressureChartInstance.xAxis[0].addPlotBand({
            from: eventData.startTime * 1000, 
            to: eventData.endTime * 1000,     
            color: Config.PLOT_BAND_COLOR_PROMINENT,
            borderColor: Config.PLOT_BAND_BORDER_COLOR_PROMINENT,
            borderWidth: 1,
            id: Config.SINGLE_EVENT_HIGHLIGHT_PLOT_BAND_ID,
            zIndex: 3 
        });
    }
}

export function displayAllEventsOnChart(allEvents, prominentlyHighlightedEventId = null) {
    if (!pressureChartInstance) {
        console.warn("Cannot display all events: Chart instance not available.");
        return;
    }
    clearSingleEventHighlight(); 
    clearAllAutomatedEventPlotBands(); 

    if (allEvents && allEvents.length > 0) {
        allEvents.forEach(event => {
            const isProminent = event.id === prominentlyHighlightedEventId;
            pressureChartInstance.xAxis[0].addPlotBand({
                from: event.startTime * 1000, 
                to: event.endTime * 1000,     
                color: isProminent ? Config.PLOT_BAND_COLOR_PROMINENT : Config.PLOT_BAND_COLOR_STANDARD,
                borderColor: isProminent ? Config.PLOT_BAND_BORDER_COLOR_PROMINENT : 'transparent',
                borderWidth: isProminent ? 2 : 0,
                id: `${Config.AUTOMATED_EVENT_PLOT_BAND_ID_PREFIX}${event.id}`,
                zIndex: isProminent ? 4 : 3 
            });
        });
    }
}

export function destroyChart() {
    if (pressureChartInstance) {
        try {
            pressureChartInstance.destroy();
            pressureChartInstance = null;
        } catch (e) {
            console.error("Error destroying chart:", e);
        }
    }
}

export function getChartInstance() {
    return pressureChartInstance;
}
// filename: js/chartManager.js