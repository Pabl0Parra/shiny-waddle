import React, { useEffect, useState, useMemo } from 'react';
import './Map.css';
import { useFetchData } from '../../../../hooks/useFetchData';
import config from '../../../../config';
import {
  AdvancedMarker,
  Map as MapGoogle,
  useMap,
} from '@vis.gl/react-google-maps';

interface MapProps {
  callBuoy: (id: string, name: string) => void;
  setBouysLoadMap: (loaded: boolean) => void;
}

interface Buoy {
  id_buoy: string;
  lat: number;
  longi: number;
  name_buoy: string;
  website: string;
}

const Map: React.FC<MapProps> = ({ callBuoy, setBouysLoadMap }) => {
  const { apiUrl, website: configWebsite } = config; // Destructure website from config

  const { data, error, loading } = useFetchData(apiUrl);
  const [buoys, setBuoys] = useState<Buoy[]>([]);
  const mapRef = useMap();
  const MAX_ZOOM_LEVEL: number = 6;
  const [zoomMap, setZoomMap] = useState<number>(2);
  const [autoZoomMap, setAutoZoomMap] = useState<boolean>(false);

  // Determine the target website based on config.website
  const targetWebsite = useMemo(() => {
    if (configWebsite.toLowerCase() === 'sailors') {
      return 'website';
    }
    return configWebsite.toLowerCase();
  }, [configWebsite]);

  // Memoize filteredBuoys to prevent unnecessary re-renders
  const filteredBuoys = useMemo(() => {
    const filtered = buoys.filter(
      (buoy) => buoy.website.toLowerCase() === targetWebsite,
    );
    console.log('FILTERED BUOYS BASED ON WEBSITE:', filtered);
    return filtered;
  }, [buoys, targetWebsite]);

  const fitBounds = () => {
    console.log('FITBOUNDS: CALLED');
    if (!mapRef || !filteredBuoys.length) {
      console.log(
        'FITBOUNDS: MAPREF IS NOT AVAILABLE OR FILTEREDBUOYS ARRAY IS EMPTY',
      );
      return;
    }
    setAutoZoomMap(true);
    const bounds = new window.google.maps.LatLngBounds();
    filteredBuoys.forEach(({ lat, longi }) => {
      bounds.extend(new window.google.maps.LatLng(lat, longi));
      console.log(
        `FITBOUNDS: EXTENDED BOUNDS WITH BUOY AT LAT: ${lat}, LNG: ${longi}`,
      );
    });
    mapRef.fitBounds(bounds);
    console.log('FITBOUNDS: MAPREF.FITBOUNDS CALLED WITH BOUNDS:', bounds);
  };

  const changeCenter = (lat: number, lng: number) => {
    console.log(`CHANGE CENTER: CALLED WITH LAT: ${lat}, LNG: ${lng}`);
    if (!mapRef) {
      console.log('CHANGE CENTER: MAPREF IS NOT AVAILABLE');
      return;
    }
    mapRef.setCenter({ lat, lng });
    console.log('CHANGE CENTER: MAPREF.SETCENTER CALLED');
  };

  useEffect(() => {
    console.log('USEEFFECT [DATA, LOADING]: CHECKING DATA AND LOADING STATE');
    if (data && !loading) {
      console.log(
        'USEEFFECT [DATA, LOADING]: DATA FETCHED SUCCESSFULLY:',
        data,
      );
      // Optionally, log each buoy's website property
      data.forEach((buoy: Buoy) => {
        console.log(`Buoy ID: ${buoy.id_buoy}, Website: "${buoy.website}"`);
      });
      setBuoys(data);
      setBouysLoadMap(true);
      console.log(
        'USEEFFECT [DATA, LOADING]: SETBUOYS CALLED AND SETBOUYSLOADMAP SET TO TRUE',
      );
    }
  }, [data, loading, setBouysLoadMap]);

  useEffect(() => {
    console.log(
      'USEEFFECT [FILTEREDBUOYS, MAPREF]: BUOYS OR MAPREF CHANGED, CALLING FITBOUNDS',
    );
    fitBounds();
  }, [filteredBuoys, mapRef]);

  useEffect(() => {
    console.log(
      'USEEFFECT [ZOOMMAP, AUTZOOMMAP, FILTEREDBUOYS.LENGTH, CONFIGWEBSITE]: ZOOMMAP OR AUTZOOMMAP CHANGED',
    );
    if (autoZoomMap) {
      console.log(
        'USEEFFECT [ZOOMMAP, AUTZOOMMAP]: AUTZOOMMAP IS TRUE, ADJUSTING ZOOM LEVEL',
      );
      setAutoZoomMap(false);
      if (filteredBuoys.length === 1) {
        console.log(
          `USEEFFECT [ZOOMMAP, AUTZOOMMAP]: ONLY ONE BUOY PRESENT, SETTING ZOOM TO MAX_ZOOM_LEVEL (${MAX_ZOOM_LEVEL})`,
        );
        mapRef?.setZoom(MAX_ZOOM_LEVEL);
      } else {
        if (zoomMap > MAX_ZOOM_LEVEL) {
          console.log(
            `USEEFFECT [ZOOMMAP, AUTZOOMMAP]: CURRENT ZOOM (${zoomMap}) IS GREATER THAN MAX_ZOOM_LEVEL (${MAX_ZOOM_LEVEL}), SETTING ZOOM TO MAX_ZOOM_LEVEL`,
          );
          mapRef?.setZoom(MAX_ZOOM_LEVEL);
        } else {
          console.log(
            `USEEFFECT [ZOOMMAP, AUTZOOMMAP]: CURRENT ZOOM (${zoomMap}) IS WITHIN ALLOWED RANGE`,
          );
        }
      }
    } else {
      console.log(
        'USEEFFECT [ZOOMMAP, AUTZOOMMAP]: AUTZOOMMAP IS FALSE, NO ZOOM ADJUSTMENT NEEDED',
      );
    }
  }, [zoomMap, autoZoomMap, filteredBuoys.length, targetWebsite, mapRef]);

  if (loading) {
    console.log('MAP: LOADING...');
    return <div className="loader"></div>;
  }

  if (error) {
    console.log('MAP: ERROR LOADING MAP:', error);
    return <div>Error loading map: {error.message}</div>;
  }

  console.log(
    'MAP: RENDERING MAPGOOGLE COMPONENT WITH FILTEREDBUOYS:',
    filteredBuoys,
  );

  return (
    <MapGoogle
      defaultZoom={8}
      // defaultCenter={
      //   filteredBuoys.length
      //     ? { lat: filteredBuoys[0].lat, lng: filteredBuoys[0].longi }
      //     : { lat: 0, lng: 0 }
      // }
      mapId="eolos_map_id"
      mapTypeId="satellite"
      streetViewControl={false}
      mapTypeControl={false}
      zoomControl={true}
      fullscreenControl={false}
      onZoomChanged={() => {
        const newZoom = mapRef?.getZoom() ?? 0;
        console.log(`MAP: ZOOM CHANGED, NEW ZOOM LEVEL: ${newZoom}`);
        setZoomMap(newZoom);
      }}
    >
      {filteredBuoys.map((buoy: Buoy) => {
        console.log(
          `MAP: RENDERING ADVANCEDMARKER FOR BUOY: ${buoy.name_buoy} (ID: ${buoy.id_buoy})`,
        );
        return (
          <AdvancedMarker
            key={`MarkerBuoy_${buoy.id_buoy}`} // Unique key
            position={{ lat: buoy.lat, lng: buoy.longi }}
            title={buoy.name_buoy}
            onClick={() => {
              console.log(
                `MAP: MARKER CLICKED FOR BUOY: ${buoy.name_buoy} (ID: ${buoy.id_buoy})`,
              );
              callBuoy(buoy.id_buoy.toString(), buoy.name_buoy);
              changeCenter(buoy.lat, buoy.longi);
            }}
          >
            <img
              src="assets/img/icon-pointer.png"
              width={46}
              height={51}
              alt={`${buoy.name_buoy} Marker`}
            />
          </AdvancedMarker>
        );
      })}
    </MapGoogle>
  );
};

export default Map;
