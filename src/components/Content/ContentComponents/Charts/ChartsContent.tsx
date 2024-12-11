import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import Handlebars from 'handlebars';
import Chart from 'react-apexcharts';
import DOMPurify from 'dompurify';
import { format, parseISO } from 'date-fns';
import { Item } from '../../../../types';
import useFetchChartsData from '../../../../hooks/useFetchChartsData';
import useWindowSize from '../../../../hooks/useWindowsSize';
import config from '../../../../config';
import LoaderSpinner from '../../../LoaderSpinner/LoaderSpinner';
import noVarImg from '../../../../assets/charts_loading_bg.webp';
import { colorPalette } from '../../../../../src/colorConfig';
import {
  ensureISO8601,
  getArrowIndices,
  adjustWindDirection,
  formatDateToISO,
  yaxisLabelFormatter,
} from '../../../../utils/utils';
import '../../../../utils/handlebarsHelpers';
import { ApexOptions } from 'apexcharts';
import './ChartsContent.css';

interface ChartsContentProps {
  dataBuoy: Item[];
  measurementUnits: string;
  lastTimeStamp: string;
  lastBuoyTimeStamp: string;
  selectedNameBuoy: string;
  logoBuoy: { logopath: string; name_buoy: string }[];
}

const MemoizedChart = memo(Chart);

const ChartsContent: React.FC<ChartsContentProps> = ({
  dataBuoy,
  measurementUnits,
  lastTimeStamp,
  lastBuoyTimeStamp,
  selectedNameBuoy,
  logoBuoy,
}) => {
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
  const windowSize = useWindowSize();
  const isMobile = windowSize.width !== undefined && windowSize.width <= 768;

  const fetchParams = useMemo(() => {
    const idBuoy = dataBuoy.length > 0 ? dataBuoy[0].id_buoy.toString() : '8';
    const endTime = lastTimeStamp || new Date().toISOString();
    let endDate: Date;

    try {
      endDate = parseISO(ensureISO8601(endTime));
      if (isNaN(endDate.getTime())) throw new Error('Invalid endTime');
    } catch (error) {
      console.error('Invalid endTime, using current time:', error);
      endDate = new Date();
    }

    const startDate = new Date(endDate.getTime() - 48 * 60 * 60 * 1000);
    const startTime = formatDateToISO(startDate);
    const formattedEndTime = formatDateToISO(endDate);

    return {
      id_buoy: idBuoy,
      id_vargen: ['40', '9', '10'],
      start_time: startTime,
      end_time: formattedEndTime,
    };
  }, [dataBuoy, lastTimeStamp]);

  const { data, loading, error } = useFetchChartsData(apiUrl, fetchParams);

  const processedData = useMemo(() => {
    if (!Array.isArray(data)) {
      console.error('Data is not an array:', data);
      return {
        timeSeries: [] as string[],
        variableData: {} as { [vargenId: string]: { x: number; y: number }[] },
        windDirections: [] as number[],
      };
    }

    const timestampsSet = new Set<string>();
    data.forEach((item) => {
      if (item.timestamp) {
        const sanitized = ensureISO8601(item.timestamp);
        timestampsSet.add(sanitized);
      }
    });

    const timeSeries = Array.from(timestampsSet).sort((a, b) =>
      a.localeCompare(b),
    );
    const timestampIndexMap: { [timestamp: string]: number } = {};
    timeSeries.forEach((ts, idx) => {
      timestampIndexMap[ts] = idx;
    });

    const variableData: { [vargenId: string]: { x: number; y: number }[] } = {};
    const windDirections = new Array(timeSeries.length).fill(NaN);

    data.forEach((item) => {
      if (!item.timestamp || !item.id_vargen) return;
      const sanitizedTs = ensureISO8601(item.timestamp);
      const index = timestampIndexMap[sanitizedTs];
      const timestampMs = parseISO(sanitizedTs).getTime();
      if (isNaN(timestampMs) || index === undefined) return;

      const vargenId = item.id_vargen.toString();
      const value =
        measurementUnits !== 'IMP' ? item.value_sint : item.value_simp;

      if (!variableData[vargenId]) variableData[vargenId] = [];
      variableData[vargenId].push({
        x: timestampMs + 9 * 3600000,
        y: value !== null && value !== -9999 ? value : NaN,
      });

      if (vargenId === '10' && value !== null && value !== -9999) {
        windDirections[index] = value;
      }
    });

    return { timeSeries, variableData, windDirections };
  }, [data, measurementUnits]);

  const variables = [
    { name: '40', desc: '波の最大値', unit: 'm' },
    { name: '9', desc: '風速', unit: 'm/s' },
    { name: '10', desc: '風向', unit: 'degrees' },
  ];

  const variableColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    variables.forEach((variable, i) => {
      colors[variable.name] = colorPalette[i % colorPalette.length];
    });
    return colors;
  }, [variables]);

  const hmaxSeries = useMemo(() => {
    const varData = processedData.variableData['40'];
    if (!varData) return [];
    return [{ name: '波の最大値', data: varData, color: variableColors['40'] }];
  }, [processedData.variableData, variableColors]);

  const windSpeedSeries = useMemo(() => {
    const varData = processedData.variableData['9'];
    if (!varData) return [];
    return [{ name: '風速', data: varData, color: variableColors['9'] }];
  }, [processedData.variableData, variableColors]);

  const windDirections = processedData.windDirections;

  const arrowIndices = useMemo(() => {
    if (!processedData.timeSeries.length) return [];
    const intervalHours = isMobile ? 6 : 2;
    return getArrowIndices(processedData.timeSeries, intervalHours);
  }, [isMobile, processedData.timeSeries]);

  const customWindTooltip = useCallback(
    (tooltip: any): string => {
      const { series, seriesIndex, dataPointIndex, w } = tooltip;
      const val = series[seriesIndex][dataPointIndex];
      const timestamp = processedData.timeSeries[dataPointIndex];
      let dateWithAddedHour: Date;
      try {
        dateWithAddedHour = parseISO(timestamp);
        dateWithAddedHour = new Date(dateWithAddedHour.getTime() + 9 * 3600000);
      } catch {
        return '';
      }

      const formattedTime = format(dateWithAddedHour, 'yyyy/MM/dd HH:mm');
      const windDir = windDirections[dataPointIndex];
      const adjustedWindDir = adjustWindDirection(windDir);
      const windDirInfo = !isNaN(windDir)
        ? `
          <div style="display: flex; align-items: center; margin-top: 5px;">
            <strong>風向:</strong>
            <div style="transform: rotate(${adjustedWindDir}deg); margin-left: 10px; display:inline-block;">
              <svg width="20" height="20"><line x1="10" y1="20" x2="10" y2="0" stroke="black" stroke-width="2"/><polygon points="5,5 10,0 15,5" fill="black"/></svg>
            </div>
            <span style="margin-left: 5px;">${windDir}°</span>
          </div>
        `
        : '';

      return `
        <div style="padding: 10px;">
          <div style="margin-bottom: 5px;"><strong>時刻:</strong> ${formattedTime}</div>
          <strong>${w.globals.seriesNames[seriesIndex]}</strong>: ${val} m/s<br/>
          ${windDirInfo}
        </div>
      `;
    },
    [windDirections, processedData.timeSeries],
  );

  const customHmaxTooltip = useCallback(
    (tooltip: any): string => {
      const { series, seriesIndex, dataPointIndex, w } = tooltip;
      const val = series[seriesIndex][dataPointIndex];
      const timestamp = processedData.timeSeries[dataPointIndex];
      let dateWithAddedHour: Date;
      try {
        dateWithAddedHour = parseISO(timestamp);
        dateWithAddedHour = new Date(dateWithAddedHour.getTime() + 9 * 3600000);
      } catch {
        return '';
      }

      const formattedTime = format(dateWithAddedHour, 'yyyy/MM/dd HH:mm');
      return `
        <div style="padding: 10px;">
          <div style="margin-bottom: 5px;"><strong>時刻:</strong> ${formattedTime}</div>
          <strong>${w.globals.seriesNames[seriesIndex]}</strong>: ${val} m
        </div>
      `;
    },
    [processedData.timeSeries],
  );

  const commonChartOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: !isMobile,
            zoomin: !isMobile,
            zoomout: !isMobile,
            pan: !isMobile,
            reset: !isMobile,
          },
        },
        zoom: { enabled: !isMobile },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
      },
      stroke: { curve: 'straight', width: 4 },
      fill: { type: 'solid', opacity: 0.8 },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        colors: undefined,
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: { size: 7 },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          rotate: -45,
          hideOverlappingLabels: true,
          style: { fontSize: '12px' },
        },
        tickAmount: isMobile
          ? Math.floor(processedData.timeSeries.length / 6)
          : 10,
      },
      yaxis: {
        labels: {
          formatter: yaxisLabelFormatter,
          style: { fontSize: '12px' },
        },
        axisTicks: { show: true, color: '#78909C', width: 10 },
      },
      tooltip: { enabled: true, theme: 'light' },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        onItemClick: { toggleDataSeries: false },
        onItemHover: { highlightDataSeries: true },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            stroke: { width: 4 },
            markers: { size: 0 },
            tooltip: { enabled: true },
          },
        },
      ],
    }),
    [isMobile, processedData.timeSeries],
  );

  const hmaxChartOptions: ApexOptions = useMemo(
    () => ({
      ...commonChartOptions,
      tooltip: { ...commonChartOptions.tooltip, custom: customHmaxTooltip },
      yaxis: {
        ...commonChartOptions.yaxis,
        title: {
          text: '波の最大値 (m)',
          style: { fontSize: '16px' },
        },
      },
    }),
    [commonChartOptions, customHmaxTooltip],
  );

  const windSpeedChartOptions: ApexOptions = useMemo(
    () => ({
      ...commonChartOptions,
      tooltip: { ...commonChartOptions.tooltip, custom: customWindTooltip },
      yaxis: {
        ...commonChartOptions.yaxis,
        title: {
          text: '風速 (m/s)',
          style: { fontSize: '16px' },
        },
      },
    }),
    [commonChartOptions, customWindTooltip],
  );

  const renderWindDirections = useCallback(() => {
    return (
      <div className="wind-directions-section">
        <span className="wind-direction-label">風向</span>
        <div className="wind-directions-row">
          {arrowIndices.map((index) => {
            const dir = windDirections[index];
            if (isNaN(dir)) return null;

            const timestamp = processedData.timeSeries[index];
            let dateWithAddedHour = parseISO(timestamp);
            dateWithAddedHour = new Date(
              dateWithAddedHour.getTime() + 9 * 3600000,
            );
            const formattedTime = format(dateWithAddedHour, 'HH:mm');

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
  }, [arrowIndices, windDirections, processedData.timeSeries]);

  useEffect(() => {
    const fetchAndExtractSection = async () => {
      if (
        dataBuoy.length > 0 &&
        dataBuoy[0].id_buoy &&
        lastTimeStamp &&
        lastBuoyTimeStamp
      ) {
        const buoyId = dataBuoy[0].id_buoy;
        const templatePath =
          buoyId === 8
            ? '/assets/template/template_detail_bouy_id_8.hbs'
            : '/assets/template/template_detail_bouy.hbs';

        try {
          const templateResponse = await fetch(templatePath);
          if (!templateResponse.ok) {
            throw new Error(`HTTP error! status: ${templateResponse.status}`);
          }
          const templateString = await templateResponse.text();
          const template = Handlebars.compile(templateString);

          const firstItem = dataBuoy[0];
          const context = {
            dataBuoy,
            firstItem,
            measurementUnits,
            lastTimeStamp: lastTimeStamp.replace('Z', ' UTC'),
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
            extractedHTML += element.outerHTML;
          });

          const sanitizedHTML = DOMPurify.sanitize(extractedHTML);
          setHtmlDetailBuoy((prev) =>
            prev !== sanitizedHTML ? sanitizedHTML : prev,
          );
        } catch (error) {
          console.error('Error fetching and extracting section:', error);
          setHtmlDetailBuoy(
            DOMPurify.sanitize('<p>Error loading buoy details.</p>'),
          );
        }
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

  if (loading) return <LoaderSpinner visible />;
  if (error) return <div>Error loading charts: {error}</div>;

  return (
    <div className="charts-content">
      <div className="handlebars-and-variables">
        <div
          className="handlebars-content"
          dangerouslySetInnerHTML={{ __html: htmlDetailBuoy }}
        />
        <div className="variable-selection">
          {variables
            .filter((v) => v.name !== '10')
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
