import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Item } from '../../../../types';
import Handlebars from 'handlebars';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import useFetchChartsData from '../../../../hooks/useFetchChartsData';
import useWindowSize from '../../../../hooks/useWindowsSize';
import config from '../../../../config';
import DOMPurify from 'dompurify';
import LoaderSpinner from '../../../LoaderSpinner/LoaderSpinner';
import noVarImg from '../../../../assets/charts_loading_bg.webp';
import { colorPalette } from '../../../../../src/colorConfig';
import './ChartsContent.css';
import { format, parseISO } from 'date-fns';

// Handlebars Helpers
Handlebars.registerHelper(
  'ifCond',
  function (this: any, v1: any, v2: any, options: Handlebars.HelperOptions) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  },
);

Handlebars.registerHelper(
  'getItem',
  function (data: Item[], propertyName: keyof Item, propertyValue: string) {
    const item: Item | undefined = data.find(
      (item) => item[propertyName] === propertyValue,
    );
    return item;
  },
);

Handlebars.registerHelper('getValueItem', function (item: Item, options: any) {
  const context = options.data.root;
  const measurementUnits = context.measurementUnits;
  if (measurementUnits !== 'IMP') {
    return item.value_sint !== -9999 ? item.value_sint.toString() : '-';
  } else {
    return item.value_simp !== -9999 ? item.value_simp.toString() : '-';
  }
});

Handlebars.registerHelper('getUnitItem', function (item: Item, options: any) {
  const context = options.data.root;
  const measurementUnits = context.measurementUnits;
  return measurementUnits !== 'IMP'
    ? item.units_sint.toString()
    : item.units_simp.toString();
});

Handlebars.registerHelper(
  'formatFirstTimestamp',
  function (timestamp: string, isFirst: boolean) {
    if (isFirst) {
      // Ensure the first timestamp ends with " UTC"
      return timestamp.replace('Z', ' UTC');
    }
    return timestamp;
  },
);

// **New Helper to Adjust Wind Direction to show where is going instead of where is coming from**
Handlebars.registerHelper('adjustWindDir', function (deg: string | number) {
  const degree = parseFloat(deg as string); // Ensure it's a string for parseFloat
  if (isNaN(degree)) {
    // Handle invalid degree values as needed
    return 0;
  }
  return (degree + 180) % 360;
});

interface ChartsContentProps {
  dataBuoy: Item[];
  measurementUnits: string;
  lastTimeStamp: string;
  lastBuoyTimeStamp: string;
  selectedNameBuoy: string;
  logoBuoy: { logopath: string; name_buoy: string }[];
}

const yaxisLabelFormatter = (val: number | undefined): string => {
  if (val === undefined || val === null || isNaN(val)) {
    return '';
  }
  return val.toFixed(2);
};

const MemoizedChart = memo(Chart);

const adjustWindDirection = (deg: number): number => (deg + 180) % 360;

/**
 * Helper function to ensure date strings conform to ISO 8601 format.
 * If the date string lacks a 'T' separator or contains 'UTC', it adjusts accordingly.
 * Example: '2024-11-22 12:34:56 UTC' -> '2024-11-22T12:34:56Z'
 */
const ensureISO8601 = (dateString: string): string => {
  // Replace space with 'T' to conform to ISO 8601
  let isoString = dateString.replace(' ', 'T');
  // Replace ' UTC' with 'Z' to indicate UTC time
  isoString = isoString.replace(' UTC', 'Z');
  return isoString;
};

/**
 * Computes indices in the timeSeries array that are at specified hourly intervals.
 *
 * @param timeSeries - Array of timestamp strings in ISO 8601 format.
 * @param intervalInHours - The interval in hours at which to place arrows.
 * @returns An array of indices corresponding to the desired intervals.
 */
const getArrowIndices = (
  timeSeries: string[],
  intervalInHours: number,
): number[] => {
  if (timeSeries.length === 0) return [];

  const arrowIndices: number[] = [];
  const baseDate = parseISO(ensureISO8601(timeSeries[0]));

  timeSeries.forEach((timestamp, index) => {
    const currentDate = parseISO(ensureISO8601(timestamp));
    if (isNaN(currentDate.getTime())) return;

    const diffInMs = currentDate.getTime() - baseDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60)); // Use Math.floor

    if (diffInHours % intervalInHours === 0) {
      arrowIndices.push(index);
    }
  });

  // Ensure the first and last data points are always included
  if (!arrowIndices.includes(0)) arrowIndices.unshift(0);
  if (!arrowIndices.includes(timeSeries.length - 1))
    arrowIndices.push(timeSeries.length - 1);

  return arrowIndices;
};

const ChartsContent: React.FC<ChartsContentProps> = ({
  dataBuoy,
  measurementUnits,
  lastTimeStamp,
  lastBuoyTimeStamp,
  selectedNameBuoy,
  logoBuoy,
}) => {
  // Initialize 'visibleCharts' with all variables to prevent uncontrolled input warning
  const [visibleCharts, setVisibleCharts] = useState<{
    [key: string]: boolean;
  }>({
    '40': true,
    '9': true,
    '10': true,
  });

  const [htmlDetailBuoy, setHtmlDetailBuoy] = useState<string>('');

  const toggleChartVisibility = useCallback((chartName: string) => {
    setVisibleCharts((prev) => ({
      ...prev,
      [chartName]: !prev[chartName],
    }));
  }, []);

  const { apiUrl } = config;

  /**
   * Format Date to ISO 8601 with 'T' separator
   */
  const formatDate = (date: Date): string => {
    return date.toISOString();
  };

  // Custom Hook to get Window Size
  const windowSize = useWindowSize();
  const isMobile = windowSize.width !== undefined && windowSize.width <= 768;

  // Memoize fetchParams to avoid infinite loops
  const fetchParams = useMemo(() => {
    const idBuoy = dataBuoy.length > 0 ? dataBuoy[0].id_buoy.toString() : '8';

    // Use lastTimeStamp if available; otherwise, use the current time in ISO 8601
    const endTime = lastTimeStamp || new Date().toISOString();
    let endDate: Date;
    try {
      const sanitizedEndTime = ensureISO8601(endTime);
      endDate = parseISO(sanitizedEndTime);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid endTime');
      }
    } catch (error) {
      console.error('Creating new date bc Invalid endTime:', endTime, error);
      endDate = new Date();
    }

    const startDate = new Date(endDate.getTime() - 48 * 60 * 60 * 1000);

    const startTime = formatDate(startDate);
    const formattedEndTime = formatDate(endDate);

    return {
      id_buoy: idBuoy,
      id_vargen: ['40', '9', '10'],
      start_time: startTime,
      end_time: formattedEndTime,
    };
  }, [dataBuoy, lastTimeStamp]);

  const { data, loading, error } = useFetchChartsData(apiUrl, fetchParams);

  /**
   * Converts UTC timestamp string to Japan time in epoch milliseconds
   */
  const convertToJapanTime = (utcTimestamp: string): number => {
    try {
      const sanitizedTimestamp = ensureISO8601(utcTimestamp);
      const date = parseISO(sanitizedTimestamp);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid UTC timestamp');
      }
      return date.getTime() + 9 * 60 * 60 * 1000;
    } catch (error) {
      console.error('Invalid UTC timestamp:', utcTimestamp, error);
      return NaN;
    }
  };

  const processedData = useMemo(() => {
    if (!Array.isArray(data)) {
      console.error('Data fetched is not an array:', data);
      return { timeSeries: [], variableData: {}, windDirections: [] };
    }

    // Collect and sort unique timestamps
    const timestampsSet = new Set<string>();
    data.forEach((item) => {
      if (item.timestamp) {
        const sanitizedTimestamp = ensureISO8601(item.timestamp);
        timestampsSet.add(sanitizedTimestamp);
      }
    });
    const timeSeries = Array.from(timestampsSet).sort();

    // Initialize timestamp index map
    const timestampIndexMap: { [timestamp: string]: number } = {};
    timeSeries.forEach((timestamp, index) => {
      timestampIndexMap[timestamp] = index;
    });

    // Initialize variable data arrays
    const variableData: { [vargenId: string]: { x: number; y: number }[] } = {};
    const windDirections: number[] = new Array(timeSeries.length).fill(NaN);

    // Populate variable data arrays with correctly aligned values
    data.forEach((item) => {
      if (!item.timestamp || !item.id_vargen) return;

      const sanitizedTimestampStr = ensureISO8601(item.timestamp);
      const timestamp = convertToJapanTime(sanitizedTimestampStr);
      const index = timestampIndexMap[sanitizedTimestampStr];
      if (isNaN(timestamp) || index === undefined) {
        console.warn(
          'Skipping invalid or unmatched timestamp:',
          item.timestamp,
        );
        return;
      }

      const vargenId = item.id_vargen.toString();
      const value =
        measurementUnits !== 'IMP' ? item.value_sint : item.value_simp;

      if (!variableData[vargenId]) {
        variableData[vargenId] = [];
      }

      // Push data as { x, y } objects
      variableData[vargenId].push({
        x: timestamp,
        y: value !== null && value !== -9999 ? value : NaN,
      });

      if (item.id_vargen === 10 && value !== null && value !== -9999) {
        windDirections[index] = value;
      }
    });

    // Uncomment for debugging
    // console.log('Processed Time Series:', timeSeries);
    // console.log('Processed Variable Data:', variableData);
    // console.log('Processed Wind Directions:', windDirections);

    return { timeSeries, variableData, windDirections };
  }, [data, measurementUnits]);

  const variables = [
    {
      name: '40',
      desc: '波の最大値',
      unit: 'm',
    },
    {
      name: '9',
      desc: '風速',
      unit: 'm/s',
    },
    {
      name: '10',
      desc: '風向',
      unit: 'degrees',
    },
  ];

  const variableColors: { [key: string]: string } = {};
  variables.forEach((variable, index) => {
    variableColors[variable.name] = colorPalette[index % colorPalette.length];
  });

  const hmaxSeries = useMemo(() => {
    const varData = processedData.variableData['40'];
    if (!varData) return [];
    return [
      {
        name: '波の最大値',
        data: varData,
        color: variableColors['40'] || '#000000',
      },
    ];
  }, [processedData.variableData, variableColors]);

  const windSpeedSeries = useMemo(() => {
    const varData = processedData.variableData['9'];
    if (!varData) return [];
    return [
      {
        name: '風速',
        data: varData,
        color: variableColors['9'] || '#000000',
      },
    ];
  }, [processedData.variableData, variableColors]);

  const windDirections = processedData.windDirections;

  // Compute arrow indices based on device type
  const arrowIndices = useMemo(() => {
    if (!processedData.timeSeries || processedData.timeSeries.length === 0) {
      return [];
    }

    if (isMobile) {
      // Render one arrow every 6 hours on mobile
      return getArrowIndices(processedData.timeSeries, 6);
    } else {
      // Render one arrow every 2 hours on desktop
      return getArrowIndices(processedData.timeSeries, 2);
    }
  }, [isMobile, processedData.timeSeries]);

  // Uncomment for debugging
  // useEffect(() => {
  //   console.log('Arrow Indices:', arrowIndices);
  // }, [arrowIndices]);

  // Custom Tooltip for Wind Speed
  const customWindTooltip = useCallback(
    (tooltip: any): string => {
      const { series, seriesIndex, dataPointIndex, w } = tooltip;
      const val = series[seriesIndex][dataPointIndex];
      const timestamp = processedData.timeSeries[dataPointIndex];
      let dateWithAddedHour: Date;
      try {
        dateWithAddedHour = parseISO(timestamp);
        dateWithAddedHour = new Date(
          dateWithAddedHour.getTime() + 9 * 60 * 60 * 1000,
        );
        if (isNaN(dateWithAddedHour.getTime())) {
          throw new Error('Invalid Date after adding hour');
        }
      } catch (error) {
        console.error('Error parsing timestamp for tooltip:', timestamp, error);
        return '';
      }

      const formattedTime = format(dateWithAddedHour, 'yyyy/MM/dd HH:mm');
      const unit = 'm/s';

      let windDirInfo = '';
      const windDir = windDirections[dataPointIndex];
      const adjustedWindDir = adjustWindDirection(windDir);
      if (windDir !== undefined && !isNaN(windDir)) {
        windDirInfo = `
          <div style="display: flex; align-items: center; margin-top: 5px;">
            <strong>風向:</strong>
            <div style="transform: rotate(${adjustedWindDir}deg); display: inline-block; margin-left: 10px;">
              <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <line x1="10" y1="20" x2="10" y2="0" stroke="black" stroke-width="2" />
                <polygon points="5,5 10,0 15,5" fill="black" />
              </svg>
            </div>
            <span style="margin-left: 5px;">${windDir}°</span>
          </div>
        `;
      }

      return `
        <div style="padding: 10px;">
          <div style="margin-bottom: 5px;"><strong>時刻:</strong> ${formattedTime}</div>
          <strong>${w.globals.seriesNames[seriesIndex]}</strong>: ${val} ${unit}<br/>
          ${windDirInfo}
        </div>
      `;
    },
    [windDirections, processedData.timeSeries],
  );

  // Custom Tooltip for Hmax
  const customHmaxTooltip = useCallback(
    (tooltip: any): string => {
      const { series, seriesIndex, dataPointIndex, w } = tooltip;
      const val = series[seriesIndex][dataPointIndex];
      const timestamp = processedData.timeSeries[dataPointIndex];
      let dateWithAddedHour: Date;
      try {
        dateWithAddedHour = parseISO(timestamp);
        dateWithAddedHour = new Date(
          dateWithAddedHour.getTime() + 9 * 60 * 60 * 1000,
        );
        if (isNaN(dateWithAddedHour.getTime())) {
          throw new Error('Invalid Date after adding hour');
        }
      } catch (error) {
        console.error('Error parsing timestamp for tooltip:', timestamp, error);
        return '';
      }

      const formattedTime = format(dateWithAddedHour, 'yyyy/MM/dd HH:mm');
      const unit = 'm';

      return `
        <div style="padding: 10px;">
          <div style="margin-bottom: 5px;"><strong>時刻:</strong> ${formattedTime}</div>
          <strong>${w.globals.seriesNames[seriesIndex]}</strong>: ${val} ${unit}
        </div>
      `;
    },
    [processedData.timeSeries],
  );

  // Dynamic Chart Options based on isMobile
  const commonChartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: !isMobile, // Disable zoom tools on mobile
            zoomin: !isMobile, // Disable zoomin on mobile
            zoomout: !isMobile, // Disable zoomout on mobile
            pan: !isMobile, // Disable pan on mobile
            reset: !isMobile, // Disable reset on mobile
          },
        },
        zoom: {
          enabled: !isMobile, // Disable zoom functionality on mobile
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
      },
      stroke: {
        curve: 'straight',
        width: 4,
      },
      fill: {
        type: 'solid',
        opacity: 0.8,
      },
      dataLabels: {
        enabled: false,
      },
      markers: {
        size: 0,
        colors: undefined,
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: {
          size: 7,
        },
      },
      xaxis: {
        type: 'datetime',
        min:
          processedData.timeSeries.length > 0
            ? new Date(
                parseISO(processedData.timeSeries[0]).getTime() +
                  9 * 60 * 60 * 1000,
              ).getTime()
            : undefined,
        max:
          processedData.timeSeries.length > 0
            ? new Date(
                parseISO(
                  processedData.timeSeries[processedData.timeSeries.length - 1],
                ).getTime() +
                  9 * 60 * 60 * 1000,
              ).getTime()
            : undefined,
        labels: {
          datetimeUTC: false,
          rotate: -45,
          hideOverlappingLabels: true,
          style: {
            fontSize: '12px',
          },
        },
        tickAmount: isMobile
          ? Math.floor(processedData.timeSeries.length / 6)
          : 10, // Adjusted tickAmount
      },
      yaxis: {
        labels: {
          formatter: yaxisLabelFormatter,
          style: {
            fontSize: '12px',
          },
        },
        axisTicks: {
          show: true,
          color: '#78909C',
          width: 10,
          offsetX: 0,
          offsetY: 0,
        },
      },
      tooltip: {
        enabled: true,
        theme: 'light',
        custom: undefined,
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        onItemClick: {
          toggleDataSeries: false,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      responsive: [
        {
          breakpoint: 1200,
          options: {
            stroke: {
              width: 3,
            },
            markers: {
              size: 0,
            },
            tooltip: {
              enabled: true,
            },
          },
        },
        {
          breakpoint: 992,
          options: {
            stroke: {
              width: 3,
            },
            markers: {
              size: 0,
            },
            tooltip: {
              enabled: true,
            },
          },
        },
        {
          breakpoint: 768,
          options: {
            stroke: {
              width: 3,
            },
            markers: {
              size: 0,
            },
            tooltip: {
              enabled: true,
            },
          },
        },
        {
          breakpoint: 576,
          options: {
            stroke: {
              width: 4,
            },
            markers: {
              size: 0,
            },
            tooltip: {
              enabled: true,
            },
          },
        },
      ],
    }),
    [isMobile, processedData.timeSeries],
  );

  const hmaxChartOptions: ApexOptions = useMemo(
    () => ({
      ...commonChartOptions,
      tooltip: {
        ...commonChartOptions.tooltip,
        custom: customHmaxTooltip,
      },
      yaxis: {
        ...commonChartOptions.yaxis,
        title: {
          text: '波の最大値 (m)',
          style: {
            fontSize: '16px',
          },
        },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            yaxis: {
              title: {
                text: '波の最大値 (m)',
                style: {
                  fontSize: '16px',
                },
              },
            },
          },
        },
      ],
    }),
    [commonChartOptions, customHmaxTooltip],
  );

  const windSpeedChartOptions: ApexOptions = useMemo(
    () => ({
      ...commonChartOptions,
      tooltip: {
        ...commonChartOptions.tooltip,
        custom: customWindTooltip,
      },
      yaxis: {
        ...commonChartOptions.yaxis,
        title: {
          text: '風速 (m/s)',
          style: {
            fontSize: '16px',
          },
        },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            yaxis: {
              title: {
                text: '風速 (m/s)',
                style: {
                  fontSize: '16px',
                },
              },
            },
          },
        },
      ],
    }),
    [commonChartOptions, customWindTooltip],
  );

  /**
   * Renders wind direction arrows with timestamps.
   */
  const renderWindDirections = () => {
    return (
      <div className="wind-directions-section">
        <span className="wind-direction-label">風向</span>
        <div className="wind-directions-row">
          {arrowIndices.map((index) => {
            const dir = windDirections[index];
            const timestamp = processedData.timeSeries[index];
            let dateWithAddedHour: Date;
            try {
              dateWithAddedHour = parseISO(timestamp);
              dateWithAddedHour = new Date(
                dateWithAddedHour.getTime() + 9 * 60 * 60 * 1000,
              );
              if (isNaN(dateWithAddedHour.getTime())) {
                throw new Error('Invalid Date after adding hour');
              }
            } catch (error) {
              console.error(
                'Error parsing timestamp for wind direction:',
                timestamp,
                error,
              );
              return null;
            }

            const formattedTime = format(dateWithAddedHour, 'HH:mm');

            // Uncomment for debugging
            console.log(
              `Rendering arrow at index ${index}: Direction = ${dir}`,
            );

            // Skip rendering if direction is NaN
            if (isNaN(dir)) {
              return null;
            }

            return (
              <div key={index} className="wind-direction">
                <div className="wind-direction-container">
                  <svg
                    style={{
                      transform: `rotate(${adjustWindDirection(dir)}deg)`,
                      width: '26px',
                      height: '20px',
                      marginBottom: '8px',
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="13"
                      y1="20"
                      x2="13"
                      y2="0"
                      stroke="black"
                      strokeWidth="2"
                    />
                    <polygon points="9,6 13,0 17,6" fill="black" />
                  </svg>
                  <span className="arrow-timestamp">{formattedTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * Fetches and extracts specific sections from Handlebars templates.
   */
  useEffect(() => {
    const fetchAndExtractSection = async () => {
      if (
        dataBuoy.length > 0 &&
        dataBuoy[0].id_buoy &&
        lastTimeStamp &&
        lastBuoyTimeStamp
      ) {
        const buoyId = dataBuoy[0].id_buoy;
        try {
          const templatePath =
            buoyId === 8
              ? '/assets/template/template_detail_bouy_id_8.hbs'
              : '/assets/template/template_detail_bouy.hbs';

          const templateResponse = await fetch(templatePath);
          if (!templateResponse.ok) {
            throw new Error(`HTTP error! status: ${templateResponse.status}`);
          }
          const templateString = await templateResponse.text();

          const template = Handlebars.compile(templateString);

          const firstItem = dataBuoy[0];

          console.log('FIRST ITEM IN CHARTSCONTENT:', firstItem);

          const preprocessTimestamps = (
            timestamp: string,
            isFirst: boolean,
          ): string => {
            if (!timestamp) return '';

            if (isFirst) {
              // Ensure the first timestamp ends with " UTC"
              return timestamp.replace('Z', ' UTC');
            }
            return timestamp;
          };

          const context = {
            dataBuoy,
            firstItem,
            measurementUnits,
            lastTimeStamp: preprocessTimestamps(lastTimeStamp, true),
            lastBuoyTimeStamp,
            selectedNameBuoy,
            logoBuoy,
            isFirst: true,
          };

          const generatedContent = template(context);

          const parser = new DOMParser();
          const doc = parser.parseFromString(generatedContent, 'text/html');

          const desiredElements = doc.querySelectorAll(
            '.section-brand, h1, .ubication, .date',
          );

          let extractedHTML = '';
          desiredElements.forEach((element) => {
            // If the element contains date strings, ensure they use 'T' separators
            if (element.classList.contains('date')) {
              // Reformat date strings within the element
              const dateElements = element.querySelectorAll(
                'span, div, p, h1, h2, h3, h4, h5, h6',
              );
              dateElements.forEach((dateElem) => {
                const originalText = dateElem.textContent || '';
                const reformattedText = originalText;
                dateElem.textContent = reformattedText;
              });
            }
            extractedHTML += element.outerHTML;
          });

          // Sanitize extracted HTML to remove any scripts or other malicious content
          const sanitizedHTML = DOMPurify.sanitize(extractedHTML);

          setHtmlDetailBuoy((prev) =>
            prev !== sanitizedHTML ? sanitizedHTML : prev,
          );
        } catch (error) {
          console.error('Error fetching and extracting section:', error); // Log error
          const sanitizedErrorHTML = DOMPurify.sanitize(
            '<p>Error loading buoy details.</p>',
          );
          setHtmlDetailBuoy(sanitizedErrorHTML);
        }
      } else {
        console.warn('dataBuoy is empty or missing required fields');
      }
    };

    fetchAndExtractSection();
  }, [
    dataBuoy,
    lastTimeStamp,
    lastBuoyTimeStamp,
    measurementUnits,
    selectedNameBuoy,
    logoBuoy,
  ]);

  if (loading) {
    return <LoaderSpinner visible />;
  }

  if (error) {
    return <div>Error loading charts: {error}</div>;
  }

  return (
    <div className="charts-content">
      <div className="handlebars-and-variables">
        <div
          className="handlebars-content"
          dangerouslySetInnerHTML={{ __html: htmlDetailBuoy }}
        />
        <div className="variable-selection">
          {variables
            .filter((variable) => variable.name !== '10')
            .map((variable) => (
              <label key={variable.name} className="variable-checkbox">
                <input
                  type="checkbox"
                  checked={visibleCharts[variable.name]}
                  onChange={() => toggleChartVisibility(variable.name)}
                  className="variable-checkbox-input"
                />
                {variable.desc}
              </label>
            ))}
        </div>
      </div>
      <div className="charts-wrapper">
        {visibleCharts['40'] && hmaxSeries.length > 0 && (
          <div className="chart-container">
            <MemoizedChart
              options={hmaxChartOptions}
              series={hmaxSeries}
              type="line"
              height="100%"
              width="100%"
            />
          </div>
        )}
        {visibleCharts['9'] && windSpeedSeries.length > 0 && (
          <>
            <div className="chart-container">
              <MemoizedChart
                options={windSpeedChartOptions}
                series={windSpeedSeries}
                type="line"
                height="100%"
                width="100%"
              />
            </div>
            {renderWindDirections()}
          </>
        )}
        {!visibleCharts['40'] && !visibleCharts['9'] && (
          // Render the "No Variable Selected" message
          <div className="no-var-container">
            <p className="no-var-message">
              チャートを表示するには、少なくとも1つの変数を選択してください。
            </p>
            <img
              src={noVarImg}
              alt="No Variable Selected"
              className="no-var-image"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartsContent;
