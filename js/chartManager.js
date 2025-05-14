// js/chartManager.js
import { CHART_CONTAINER_ID, PLOT_BAND_ID, CURRENT_TIME_PLOT_LINE_ID } from './config.js';

// These are our core functional settings that should always apply or be reapplied.
export const BASE_HIGHCHARTS_OPTIONS = {
    time: {
        useUTC: false // Ensures chart displays in local time
    },
    credits: {
        enabled: false // Globally disable credits
    }
    // Add any other essential global functional overrides here
};

// Define styles that represent Highcharts' "factory default" look.
// This helps in resetting visual aspects when switching from a styled theme back to "Default".
export const HIGHCHARTS_EXPLICIT_DEFAULT_STYLES = {
    chart: {
        backgroundColor: '#FFFFFF',
        borderColor: '#335cad',
        borderWidth: 0,
        className: 'highcharts-background',
        plotBorderColor: '#cccccc',
        plotBackgroundColor: null, // Explicitly null for default
        style: { // Reset font styles that themes might change
            fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif',
            fontSize: '12px'
        }
    },
    colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'],
    title: {
        style: { color: '#333333', fontSize: '18px', fontWeight: 'bold' }
    },
    subtitle: {
        style: { color: '#666666', fontSize: '12px' }
    },
    xAxis: {
        gridLineWidth: 0,
        gridLineColor: '#e6e6e6',
        lineColor: '#ccd6eb',
        tickColor: '#ccd6eb',
        labels: { style: { color: '#666666', cursor: 'default', fontSize: '11px' } },
        title: { style: { color: '#666666', fontWeight: 'normal', fontSize: '12px' } } // fontWeight normal for default
    },
    yAxis: {
        gridLineWidth: 1,
        gridLineColor: '#e6e6e6',
        lineColor: '#ccd6eb',
        tickColor: '#ccd6eb',
        labels: { style: { color: '#666666', cursor: 'default', fontSize: '11px' } },
        title: { style: { color: '#666666', fontWeight: 'normal', fontSize: '12px' } } // fontWeight normal for default
    },
    legend: {
        enabled: true,
        backgroundColor: null,
        borderColor: '#999999',
        borderWidth: 0,
        itemStyle: { color: '#333333', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textOverflow: 'ellipsis' },
        itemHoverStyle: { color: '#000000', fontWeight: 'bold' }, // Default hover is bold
        itemHiddenStyle: { color: '#cccccc', textDecoration: 'none' } // Default hidden style
    },
    tooltip: {
        backgroundColor: 'rgba(247,247,247,0.85)',
        borderColor: null, // Themes might set this
        borderWidth: 1,
        borderRadius: 3,
        style: { color: '#333333', cursor: 'default', fontSize: '12px', pointerEvents: 'none', whiteSpace: 'nowrap' }
    },
    plotOptions: { // Reset common plotOptions
        series: {
            animation: true, // Default animation
            dataLabels: { style: { color: '#333333', fontSize: '11px', fontWeight: 'bold', textOutline: '1px contrast' } },
            marker: { enabled: null, lineColor: '#ffffff', radius: 4, states: { hover: { enabled: true, lineWidthPlus: 1, radiusPlus: 2 } } }
        },
        line: { lineWidth: 2, states: { hover: { lineWidthPlus: 1 } } },
        spline: { lineWidth: 2, states: { hover: { lineWidthPlus: 1 } } },
        area: { states: { hover: { lineWidthPlus: 1 } } },
        areaspline: { states: { hover: { lineWidthPlus: 1 } } },
        bar: { dataLabels: { align: 'right', verticalAlign: 'middle' } }, // Default specific dataLabel positions
        column: { dataLabels: { align: 'center', verticalAlign: 'middle' } }, // Default specific dataLabel positions
        pie: { dataLabels: { distance: 30, format: '{point.name}' } } // Default pie dataLabel format
    },
    navigation: { // Reset navigation/button styles
        buttonOptions: {
            symbolStroke: '#666666', // Default symbol stroke
            theme: {
                fill: '#ffffff',
                stroke: '#cccccc',
                style: { color: '#333333', fontWeight: 'normal' }, // Ensure fontWeight is reset
                states: {
                    hover: { fill: '#e6e6e6', style: { color: '#333333' } },
                    select: { fill: '#e6e6e6', style: { color: '#333333' } }
                }
            }
        },
        menuStyle: { background: '#ffffff', border: '1px solid #999999', padding: '5px 0' },
        menuItemStyle: { background: 'none', color: '#333333', padding: '0.5em 1em', fontSize: '11px' },
        menuItemHoverStyle: { background: '#335cad', color: '#ffffff' }
    },
    exporting: {
        buttons: {
            contextButton: { // Ensure context button itself isn't overly themed by residue
                symbolStroke: '#666666', // Default hamburger icon color
                // theme properties already covered by navigation.buttonOptions.theme
            }
        }
    }
};

// Apply base functional options globally when chartManager.js is first loaded.
if (Highcharts) {
    // Set explicit defaults first to ensure a clean slate before functional options
    Highcharts.setOptions(HIGHCHARTS_EXPLICIT_DEFAULT_STYLES);
    Highcharts.setOptions(BASE_HIGHCHARTS_OPTIONS);
}

let pressureChartInstance = null;

export function initializeChart(times, pressures, availableThemes, activeThemeId, onThemeSelectedCallback) {
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (!chartContainer) {
        console.error("Chart container div not found:", CHART_CONTAINER_ID);
        return null;
    }

    if (!times || !pressures || times.length === 0 || pressures.length === 0 || times.length !== pressures.length) {
        if (pressureChartInstance) pressureChartInstance.destroy();
        pressureChartInstance = null;
        chartContainer.innerHTML = '<p style="text-align:center;padding-top:20px;">No valid pressure data.</p>';
        return null;
    }

    const seriesData = times.map((time, index) => [time * 1000, pressures[index]]);

    const themeMenuItems = availableThemes.map(theme => ({
        text: (theme.id === activeThemeId ? '✓ ' : '') + theme.name,
        onclick: function () {
            onThemeSelectedCallback(theme.id);
        }
    }));

    try {
        if (pressureChartInstance) pressureChartInstance.destroy();

        pressureChartInstance = Highcharts.chart(CHART_CONTAINER_ID, {
            chart: { type: 'spline', zoomType: 'x', events: { load: function() { addCurrentTimePlotLine(this); } } },
            // time and credits are handled by global Highcharts.setOptions
            title: { text: null },
            xAxis: { type: 'datetime', labels: { formatter: function () { return Highcharts.dateFormat('%e %b, %H:%M', this.value); } }, title: { text: 'Time' } },
            yAxis: { title: { text: 'Surface Pressure (hPa)' } },
            tooltip: { formatter: function () { return `<b>${Highcharts.dateFormat('%A, %b %e, %Y, %H:%M', this.x)}</b><br/>Pressure: ${this.y.toFixed(1)} hPa`; } },
            series: [{ name: 'Surface Pressure', data: seriesData, marker: { enabled: false } }], // Series color will come from global options
            accessibility: { enabled: true },
            exporting: {
                buttons: {
                    contextButton: {
                        menuItems: [
                            'printChart', 'separator', 'downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG', 'separator',
                            ...themeMenuItems
                        ]
                    }
                }
            }
            // No need for 'credits: { enabled: false }' or 'time: { useUTC: false }' here,
            // as they are set globally and inherited.
        });
        return pressureChartInstance;
    } catch (error) {
        console.error("Error initializing Highcharts:", error);
        if (chartContainer) chartContainer.innerHTML = '<p style="text-align:center;color:red;">Error initializing chart.</p>';
        pressureChartInstance = null;
        return null;
    }
}

export function addCurrentTimePlotLine(chartInstance) {
    if (!chartInstance || !chartInstance.xAxis || !chartInstance.xAxis[0]) return;
    chartInstance.xAxis[0].removePlotLine(CURRENT_TIME_PLOT_LINE_ID);
    const nowMs = new Date().getTime();
    const xAxisExtremes = chartInstance.xAxis[0].getExtremes();
    if (nowMs >= xAxisExtremes.dataMin && nowMs <= xAxisExtremes.dataMax) {
        chartInstance.xAxis[0].addPlotLine({
            value: nowMs, color: 'red', width: 2, id: CURRENT_TIME_PLOT_LINE_ID, zIndex: 5,
            label: { text: 'Now', align: 'center', y: -5, style: { fontWeight: 'bold' } },
            dashStyle: 'ShortDash'
        });
    }
}

export function updateChartPlotBand(eventData) {
    if (!pressureChartInstance || !pressureChartInstance.xAxis || !pressureChartInstance.xAxis[0]) return;
    pressureChartInstance.xAxis[0].removePlotBand(PLOT_BAND_ID);
    if (eventData && typeof eventData.startTime === 'number' && typeof eventData.endTime === 'number') {
        pressureChartInstance.xAxis[0].addPlotBand({
            from: eventData.startTime * 1000, to: eventData.endTime * 1000,
            id: PLOT_BAND_ID, zIndex: 3
        });
    }
}

export function destroyChart() {
    if (pressureChartInstance) {
        try { pressureChartInstance.destroy(); } catch (e) { console.error("Error destroying chart:", e); }
        pressureChartInstance = null;
    }
    const chartContainer = document.getElementById(CHART_CONTAINER_ID);
    if (chartContainer) chartContainer.innerHTML = '';
}
// filename: js/chartManager.js