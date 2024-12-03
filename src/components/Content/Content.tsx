import React, { useEffect, useState } from 'react';
import './Content.css';
import Map from './ContentComponents/Map/Map';
import Sidebar from './ContentComponents/Sidebar/Sidebar';
import SidebarGlobal from './ContentComponents/Sidebar/SidebarGlobal';
import { useFetchDataDetail } from '../../hooks/useFetchDataDetail';
import config from '../../config';
import Handlebars from 'handlebars';
import { Item } from '../../types';
import { APIProvider } from '@vis.gl/react-google-maps';

// REGISTERING HANDLEBARS HELPERS
Handlebars.registerHelper(
  'ifCond',
  function (this: any, v1: any, v2: any, options: Handlebars.HelperOptions) {
    if (v1 === v2) {
      return options.fn(true);
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
  if (measurementUnits != 'IMP') {
    if (item.value_sint != -9999) return item.value_sint.toString();
    else return '-';
  } else {
    if (item.value_simp != -9999) return item.value_simp.toString();
    else return '-';
  }
});

Handlebars.registerHelper('getUnitItem', function (item: Item, options: any) {
  const context = options.data.root;
  const measurementUnits = context.measurementUnits;
  if (measurementUnits != 'IMP') {
    return item.units_sint.toString();
  } else {
    return item.units_simp.toString();
  }
});

interface ContentProps {
  measurementUnits: string;
}

const Content: React.FC<ContentProps> = ({ measurementUnits }) => {
  const { apiUrl, apiKey, website: configWebsite } = config;

  // INITIAL STATE LOGS
  console.log(
    'CONTENT COMPONENT INITIALIZED WITH MEASUREMENT UNITS:',
    measurementUnits,
  );

  const [isActive, setIsActive] = useState(false);
  const [noData, setNoData] = useState(true);
  const [selectedId, setSelectedId] = useState('0');
  const [selectedNameBuoy, setSelectedNameBuoy] = useState('');
  const {
    dataBuoy,
    lastTimeStamp,
    lastBuoyTimeStamp,
    getRefreshTime,
    logoBuoy,
    fetchLastTimeStamp,
  } = useFetchDataDetail(apiUrl, selectedId);
  console.log('DATA BUOY:', dataBuoy);
  const [htmlDetailBouy, setHtmlDetailBouy] = useState<string>('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [bouysLoadMap, setBouysLoadMap] = useState(false);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // HANDLE TOGGLE FUNCTION LOGS
  const handleToggle = (click: string) => {
    console.log(`HANDLETOGGLE CALLED WITH CLICK VALUE: ${click}`);
    if (click == '') {
      setIsActive(!isActive);
      console.log(`ISACTIVE TOGGLED TO: ${!isActive}`);
    } else if (click == 'MAP') {
      setIsActive(false);
      console.log('ISACTIVE SET TO FALSE DUE TO CLICK ON MAP');
    } else {
      setIsActive(true);
      console.log('ISACTIVE SET TO TRUE');
    }
  };

  // CALLBUOY FUNCTION LOGS
  const callBuoy = (id: string, name: string) => {
    console.log(`CALLBUOY FUNCTION INVOKED WITH ID: ${id}, NAME: ${name}`);
    setSelectedNameBuoy(name);
    setNoData(false);
    setIsActive(true);
    setSelectedId(id);
    console.log(
      `STATE UPDATED - selectedNameBuoy: ${name}, noData: false, isActive: true, selectedId: ${id}`,
    );
  };

  // USEEFFECT FOR REFRESH TIME LOGS
  useEffect(() => {
    console.log('USEEFFECT: getRefreshTime or related state changed');
    setTimerRunning(false);
    if (getRefreshTime > 0) {
      setTimerRunning(true);
      console.log(
        `REFRESH TIME SET. TimerRunning: true, RefreshTime: ${getRefreshTime} seconds`,
      );
    } else {
      console.log('REFRESH TIME NOT SET. TimerRunning remains false');
    }
  }, [getRefreshTime]);

  // USEEFFECT FOR INTERVAL LOGS
  useEffect(() => {
    console.log('USEEFFECT: Handling interval based on timerRunning state');
    let intervalId: any;
    if (timerRunning) {
      console.log(
        'TIMER RUNNING. Setting up interval to fetchLastTimeStamp every',
        getRefreshTime,
        'seconds',
      );
      intervalId = setInterval(() => {
        console.log('INTERVAL TICK: Calling fetchLastTimeStamp');
        fetchLastTimeStamp();
      }, getRefreshTime * 1000);
    } else {
      console.log('TIMER NOT RUNNING. Clearing any existing intervals');
      clearInterval(intervalId);
    }

    return () => {
      clearInterval(intervalId);
      console.log('USEEFFECT CLEANUP: Interval cleared');
    };
  }, [timerRunning]);

  // USEEFFECT FOR WINDOW RESIZE LOGS
  useEffect(() => {
    console.log('USEEFFECT: Setting up window resize listener');

    const handleResize = () => {
      console.log('WINDOW RESIZE DETECTED. Updating window size.');
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    console.log('WINDOW RESIZE LISTENER ADDED');

    return () => {
      window.removeEventListener('resize', handleResize);
      console.log('USEEFFECT CLEANUP: Window resize listener removed');
    };
  }, []);

  // USEEFFECT FOR DATA FETCHING AND TEMPLATE GENERATION LOGS
  useEffect(() => {
    console.log('USEEFFECT: Checking if dataBuoy and timestamps are ready');
    if (
      dataBuoy != null &&
      dataBuoy.length > 0 &&
      lastTimeStamp != '' &&
      lastBuoyTimeStamp != ''
    ) {
      console.log(
        'DATA READY. Proceeding to fetch and compile Handlebars template.',
      );
      const firstItem = dataBuoy[0];
      console.log('FIRST ITEM:', firstItem);
      if (!firstItem) {
        console.log('FIRST ITEM NOT FOUND IN dataBuoy');
        return;
      }
      const fetchTemplate = async () => {
        try {
          const item: Item = firstItem;
          console.log(`FETCHING TEMPLATE FOR BUOY ID: ${item.id_buoy}`);
          let templateResponse = await fetch(
            'assets/template/template_detail_bouy_id_' + item.id_buoy + '.hbs',
          );

          // Check if the response is OK
          if (!templateResponse.ok) {
            throw new Error(`HTTP error! status: ${templateResponse.status}`);
          }

          let templateString = await templateResponse.text();
          console.log('Template fetched. Checking validity.');

          if (
            templateString.trim().length === 0 ||
            templateString.includes('404') ||
            templateString.includes('Not Found') ||
            templateString.includes('<!DOCTYPE html>')
          ) {
            console.warn(
              'SPECIFIC TEMPLATE NOT FOUND OR INVALID. FETCHING DEFAULT TEMPLATE.',
            );
            // Fetch default template
            templateResponse = await fetch(
              'assets/template/template_detail_bouy.hbs',
            );

            if (!templateResponse.ok) {
              throw new Error(
                `Default template fetch failed with status: ${templateResponse.status}`,
              );
            }

            templateString = await templateResponse.text();

            if (
              templateString.trim().length === 0 ||
              templateString.includes('404') ||
              templateString.includes('Not Found') ||
              templateString.includes('<!DOCTYPE html>')
            ) {
              console.error(
                'DEFAULT TEMPLATE NOT FOUND OR INVALID. Setting a fallback HTML content.',
              );
              // Set a fallback HTML content or a meaningful message
              setHtmlDetailBouy(
                '<div><h2>Data Not Available</h2><p>Unable to load buoy details at this time.</p></div>',
              );
              return;
            }

            console.log('Compiling DEFAULT Handlebars template.');
            const template = Handlebars.compile(templateString);
            const generatedContent = template({
              dataBuoy,
              firstItem,
              measurementUnits,
              lastTimeStamp,
              lastBuoyTimeStamp,
              selectedNameBuoy,
              logoBuoy,
              lat_str: firstItem.lat_str,
              longi_str: firstItem.longi_str,
            });
            setHtmlDetailBouy(generatedContent);
            console.log(
              'HTML Detail Bouy set successfully with DEFAULT template.',
            );
          } else {
            console.log('Compiling SPECIFIC Handlebars template.');
            const template = Handlebars.compile(templateString);
            const generatedContent = template({
              dataBuoy,
              firstItem,
              measurementUnits,
              lastTimeStamp,
              lastBuoyTimeStamp,
              selectedNameBuoy,
              logoBuoy,
            });
            setHtmlDetailBouy(generatedContent);
            console.log(
              'HTML Detail Bouy set successfully with SPECIFIC template.',
            );
          }
        } catch (error) {
          console.error('ERROR FETCHING TEMPLATE:', error);
          // Optionally, set a fallback HTML content on error
          setHtmlDetailBouy(
            '<div><h2>Error Loading Data</h2><p>There was an issue fetching buoy details.</p></div>',
          );
        }
      };

      fetchTemplate();
    } else {
      console.log('DATA NOT READY OR dataBuoy IS EMPTY.');
    }
  }, [dataBuoy, lastTimeStamp, lastBuoyTimeStamp, logoBuoy, measurementUnits]);

  // RENDER LOGS
  console.log('RENDERING CONTENT COMPONENT');
  console.log('Current window size:', windowSize);
  console.log(
    'Current state - isActive:',
    isActive,
    ', noData:',
    noData,
    ', selectedId:',
    selectedId,
    ', selectedNameBuoy:',
    selectedNameBuoy,
  );

  // Helper function to decide which Sidebar to render
  const renderSidebar = () => {
    if (configWebsite.toLowerCase() === 'rt') {
      return (
        <Sidebar
          onToggle={handleToggle}
          isActive={isActive}
          htmlDetailBouy={htmlDetailBouy}
          noData={noData}
          mobile={windowSize.width < 992}
          bouysLoadMap={bouysLoadMap}
          dataBuoy={dataBuoy}
          measurementUnits={measurementUnits}
          lastTimeStamp={lastTimeStamp}
          lastBuoyTimeStamp={lastBuoyTimeStamp}
          selectedNameBuoy={selectedNameBuoy}
          logoBuoy={logoBuoy}
          websiteType={null}
          lat_str={''}
          longi_str={''}
        />
      );
    } else if (configWebsite.toLowerCase() === 'sailors') {
      return (
        <SidebarGlobal
          onToggle={handleToggle}
          isActive={isActive}
          htmlDetailBouy={htmlDetailBouy}
          noData={noData}
          mobile={windowSize.width < 992}
          bouysLoadMap={bouysLoadMap}
          dataBuoy={dataBuoy}
          measurementUnits={measurementUnits}
          lastTimeStamp={lastTimeStamp}
          lastBuoyTimeStamp={lastBuoyTimeStamp}
          selectedNameBuoy={selectedNameBuoy}
          logoBuoy={logoBuoy}
          websiteType={null}
          lat_str={''}
          longi_str={''}
        />
      );
    } else {
      console.warn(
        `Unexpected config.website value: "${configWebsite}". No sidebar will be rendered.`,
      );
      return null;
    }
  };

  return (
    <div className="wrapper">
      {renderSidebar()} {/* Conditionally render Sidebar or SidebarGlobal */}
      <div className={`map  ${isActive ? 'map-close' : ''}`}>
        <APIProvider apiKey={apiKey}>
          <Map callBuoy={callBuoy} setBouysLoadMap={setBouysLoadMap} />
        </APIProvider>
      </div>
    </div>
  );
};

export default Content;
