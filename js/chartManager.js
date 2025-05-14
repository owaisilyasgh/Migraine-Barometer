// js/chartManager.js
import * as Config from './config.js'; // Assuming config.js exports constants like CHART_CONTAINER_ID
// Module-level variable to hold the chart instance
let pressureChartInstance = null;

const CHART_CONTAINER_ID = Config.CHART_CONTAINER_ID || 'pressureChart'; // Default if not in config
const CURRENT_TIME_PLOT_LINE_ID = Config.CURRENT_TIME_PLOT_LINE_ID || 'currentTimePlotLine';
const PLOT_BAND_ID = Config.PLOT_BAND_ID || 'eventPlotBand';


// Default Highcharts styles that might not be covered by M3 variables directly
// or need explicit setting for Highcharts structure.
export const HIGHCHARTS_EXPLICIT_DEFAULT_STYLES = {
    chart: {
        backgroundColor: 'var(--m3-surface-container-low, #FFFBFE)', // Use M3 variable with fallback
        style: {
            fontFamily: 'var(--m3-font-family-plain, "Roboto", sans-serif)',
            color: 'var(--m3-on-surface, #1C1B1F)'
        },
        borderRadius: 8,
        plotBorderColor: 'var(--m3-outline-variant, #C4C6C9)', // For the plot area border
    },
    title: {
        style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-title-medium-font-size, 16px)', fontWeight: 'var(--m3-title-medium-font-weight, 500)' } // M3 Title Medium
    },
    subtitle: {
        style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-body-medium-font-size, 14px)' } // M3 Body Medium (often used for subtitles)
    },
    xAxis: {
        gridLineColor: 'var(--m3-outline-variant, #E0E0E0)',
        lineColor: 'var(--m3-outline-variant, #C0C0C0)',
        tickColor: 'var(--m3-outline-variant, #C0C0C0)',
        labels: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-medium-font-size, 12px)' } }, // M3 Label Medium
        title: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-large-font-size, 14px)', fontWeight: 'var(--m3-label-large-font-weight, 500)' } }
    },
    yAxis: {
        gridLineColor: 'var(--m3-outline-variant, #E0E0E0)',
        lineColor: 'var(--m3-outline-variant, #C0C0C0)',
        tickColor: 'var(--m3-outline-variant, #C0C0C0)',
        labels: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-medium-font-size, 12px)' } }, // M3 Label Medium
        title: { style: { color: 'var(--m3-on-surface-variant, #49454F)', fontSize: 'var(--m3-label-large-font-size, 14px)', fontWeight: 'var(--m3-label-large-font-weight, 500)' } }
    },
    legend: {
        itemStyle: { color: 'var(--m3-on-surface, #1C1B1F)', cursor: 'pointer', fontSize: 'var(--m3-label-large-font-size, 14px)', fontWeight: 'var(--m3-label-large-font-weight, 500)' }, // M3 Label Large
        itemHoverStyle: { color: 'var(--m3-primary, #6750A4)' },
        itemHiddenStyle: { color: 'var(--m3-outline, #79747E)' },
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // Slight transparency if floating
        borderColor: 'var(--m3-outline-variant, #CCC)',
        borderWidth: 1,
        borderRadius: 4,
        shadow: false // M3 tends towards flatter component design unless elevated
    },
    tooltip: {
        backgroundColor: 'var(--m3-inverse-surface, #313033)', // M3 Inverse Surface for Tooltips
        borderColor: 'var(--m3-outline, #79747E)',
        borderRadius: 4,
        style: { color: 'var(--m3-inverse-on-surface, #F4EFF4)', fontSize: 'var(--m3-body-small-font-size, 12px)' } // M3 Body Small
    },
    plotOptions: {
        series: {
            dataLabels: { style: { color: 'var(--m3-on-surface, #1C1B1F)', fontSize: '11px', fontWeight: '500', textOutline: 'none' } }, // No text outline for M3
            marker: {
                enabled: true, // Enable markers by default
                radius: 3,
                states: {
                    hover: {
                        enabled: true,
                        radius: 5,
                        lineWidth: 1,
                        lineColor: 'var(--m3-primary, #6750A4)',
                        fillColor: 'var(--m3-surface-container-lowest, #FFFFFF)'
                    }
                }
            }
        },
        spline: { // Specific to spline type if used
            lineWidth: 2,
            states: { hover: { lineWidth: 3 } },
            marker: { enabled: false } // Often markers are off for splines for cleaner look
        },
        area: { // Specific to area type if used
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.4)'], // M3 Primary with opacity
                    [1, 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.05)']
                ]
            },
            marker: { radius: 3 },
            lineWidth: 1,
            states: { hover: { lineWidth: 1 } }
        }
    },
    navigation: { // For burger menu (exporting, etc.)
        buttonOptions: {
            symbolStroke: 'var(--m3-on-surface-variant, #49454F)',
            theme: {
                fill: 'transparent', // Button background
                states: {
                    hover: { fill: 'var(--m3-surface-container-high, #ECE6F0)' },
                    select: { fill: 'var(--m3-surface-container-high, #ECE6F0)' }
                }
            }
        },
        menuStyle: { background: 'var(--m3-surface-container-low, #F7F2FA)', border: '1px solid var(--m3-outline, #79747E)', padding: '8px 0' }, // M3 Menu
        menuItemStyle: { background: 'none', color: 'var(--m3-on-surface-variant, #49454F)', padding: '12px 16px', fontSize: 'var(--m3-body-medium-font-size, 14px)' }, // M3 List Item
        menuItemHoverStyle: { background: 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.08)', color: 'var(--m3-on-surface-variant, #49454F)' } // M3 State Layer
    },
    credits: {
        enabled: false // Disable "Highcharts.com" link
    },
    colors: ['var(--m3-primary, #6750A4)', 'var(--m3-secondary, #625B71)', 'var(--m3-tertiary, #7D5260)', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'], // M3 primary, secondary, tertiary then defaults

};

export const BASE_HIGHCHARTS_OPTIONS = {
    chart: {
        type: 'spline',
        zoomType: 'x'
    },
    time: {
        // UTC-4 hours (e.g., America/Toronto during EDT)
        // timezoneOffset is in minutes. Positive values are west of UTC.
        // 4 hours * 60 minutes/hour = 240 minutes
        timezoneOffset: 240
    },
    title: { text: 'Surface Pressure Over Time' },
    xAxis: {
        type: 'datetime',
        labels: {
            formatter: function () {
                // Highcharts.dateFormat will now respect the global timezoneOffset
                return Highcharts.dateFormat('%e %b, %H:%M', this.value);
            }
        },
        title: { text: 'Time' }
    },
    yAxis: {
        title: { text: 'Surface Pressure (hPa)' }
    },
    tooltip: {
        formatter: function () {
            // Highcharts.dateFormat will now respect the global timezoneOffset
            return `<b>${Highcharts.dateFormat('%A, %b %e, %Y, %H:%M', this.x)}</b><br/>Pressure: ${this.y.toFixed(1)} hPa`;
        }
    },
    // Exporting menu configuration
    exporting: {
        buttons: {
            contextButton: {
                // Default menuItems - will be overridden in initializeChart if themes are present
                menuItems: [
                    "printChart",
                    "separator",
                    "downloadPNG",
                    "downloadJPEG",
                    "downloadPDF",
                    "downloadSVG",
                    "separator",
                    "viewFullscreen"
                ]
            }
        }
    },
    // Default plot options for the series
    plotOptions: {
        series: {
            animation: {
                duration: 750 // Smooth animation on load/update
            }
        }
    }
};

Highcharts.setOptions(HIGHCHARTS_EXPLICIT_DEFAULT_STYLES); // Apply visual defaults first
Highcharts.setOptions(BASE_HIGHCHARTS_OPTIONS); // Then apply functional base options

export function initializeChart(times, pressures, availableThemes = [], activeThemeId = '', onThemeSelectedCallback = () => {}) {
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (!chartContainer) {
        console.error("Chart container div not found:", CHART_CONTAINER_ID);
        return null;
    }

    if (pressureChartInstance) {
        try {
            pressureChartInstance.destroy();
        } catch(e) {
            console.warn("Minor error destroying previous chart instance:", e);
        }
        pressureChartInstance = null;
    }

    const seriesData = times.map((time, index) => [time * 1000, pressures[index]]);

    // Theme switcher menu items for Highcharts exporting
    const themeMenuItems = availableThemes.map(theme => ({
        text: `Theme: ${theme.name}`,
        onclick: function () { onThemeSelectedCallback(theme.id); },
    }));


    try {
        pressureChartInstance = Highcharts.chart(CHART_CONTAINER_ID, {
            // Base options are now set globally via Highcharts.setOptions(),
            // including the timezoneOffset.
            // We only need to override/add specific things here.
            chart: {
                events: {
                    load: function() {
                        addCurrentTimePlotLine(this);
                        setInterval(() => addCurrentTimePlotLine(this), 60000);
                    }
                }
            },
            legend: {
                enabled: false
            },
            series: [{
                name: 'Surface Pressure',
                data: seriesData,
                marker: { enabled: false }
            }],
            exporting: {
                buttons: {
                    contextButton: {
                        menuItems: themeMenuItems.length > 0 ? themeMenuItems : []
                    }
                }
            }
        });
        return pressureChartInstance;
    } catch (error) {
        console.error("Error initializing Highcharts:", error);
        if (pressureChartInstance) {
            try { pressureChartInstance.destroy(); } catch (e) { /* ignore */ }
            pressureChartInstance = null;
        }
        return null;
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) return;

    chartInstance.xAxis[0].removePlotLine(CURRENT_TIME_PLOT_LINE_ID);

    const nowMs = new Date().getTime();
    const xAxisExtremes = chartInstance.xAxis[0].getExtremes();

    // Note: nowMs is client's local time. If chart is in a different timezone due to timezoneOffset,
    // this "Now" line will reflect the client's actual current time projected onto the chart's
    // potentially shifted timeline. This is generally the desired behavior for a "Now" marker.
    if (nowMs >= xAxisExtremes.min && nowMs <= xAxisExtremes.max) {
        chartInstance.xAxis[0].addPlotLine({
            value: nowMs,
            color: 'var(--m3-error, red)',
            width: 1,
            id: CURRENT_TIME_PLOT_LINE_ID,
            zIndex: 5,
            dashStyle: 'ShortDash',
            label: {
                text: 'Now',
                align: 'center',
                style: { color: 'var(--m3-error, red)', fontWeight: 'bold' },
                y: -5
            }
        });
    }
}

export function updateChartPlotBand(eventData) {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) {
        console.warn("Cannot update plot band: Chart instance not available.");
        return;
    }

    pressureChartInstance.xAxis[0].removePlotBand(PLOT_BAND_ID);

    if (eventData && eventData.startTime && eventData.endTime) {
        pressureChartInstance.xAxis[0].addPlotBand({
            // Timestamps from eventData are assumed to be UTC epoch seconds,
            // consistent with chart data. Highcharts will handle display
            // according to its timezoneOffset.
            from: eventData.startTime * 1000,
            to: eventData.endTime * 1000,
            color: 'rgba(var(--m3-primary-rgb, 103, 80, 164), 0.12)',
            id: PLOT_BAND_ID,
            zIndex: 1
        });
    }
}

export function destroyChart() {
    if (pressureChartInstance) {
        try {
            pressureChartInstance.destroy();
        } catch (e) {
            console.error("Error destroying chart:", e);
        }
        pressureChartInstance = null;
    }
}

export function getChartInstance() {
    return pressureChartInstance;
}