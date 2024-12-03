import { useState, useEffect } from 'react';
import { Item } from '../types';

export const useFetchDataDetail = (apiUrl: string, id: string) => {
  const [dataBuoy, setDataBuoy] = useState<Item[]>([]); // Initialize as empty array
  const [loadingBuoy, setLoadingBuoy] = useState(false);
  const [errorBuoy, setErrorBuoy] = useState<Error | null>(null);
  const [lastTimeStamp, setLastTimeStamp] = useState('');
  const [lastBuoyTimeStamp, setLastBuoyTimeStamp] = useState('');
  const [getRefreshTime, setGetRefreshTime] = useState(0);
  const [logoBuoy, setLogoBuoy] = useState<
    { logopath: string; name_buoy: string }[]
  >([]); // Initialize as empty array

  const fetchData = async () => {
    setLoadingBuoy(true);
    setErrorBuoy(null);
    try {
      const response = await fetch(`${apiUrl}/buoyVars/${id}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result: Item[] = await response.json();
      console.log('Im your result', result);
      setDataBuoy(result);
    } catch (err) {
      setErrorBuoy(err as Error);
      setDataBuoy([]); // Set to empty array on error
    } finally {
      setLoadingBuoy(false);
    }
  };

  const formatDate = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');

    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const fetchLastTimeStamp = async () => {
    try {
      const response = await fetch(`${apiUrl}/lastTimeStamp/${id}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setLastTimeStamp(formatDate(new Date(result)) + ' UTC');
    } catch (err) {
      setLastTimeStamp(''); // Set to empty string on error
    }
  };

  const fetchLastBuoyTimeStamp = async () => {
    try {
      const response = await fetch(`${apiUrl}/lastBuoyTimeStamp/${id}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setLastBuoyTimeStamp(formatDate(new Date(result)));
    } catch (err) {
      setLastBuoyTimeStamp(''); // Set to empty string on error
    }
  };

  const fetchGetRefreshTime = async () => {
    try {
      const response = await fetch(`${apiUrl}/getRefreshTime`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setGetRefreshTime(result);
    } catch (err) {
      setGetRefreshTime(0); // Set to 0 on error
    }
  };

  const fetchLogoBuoy = async () => {
    try {
      const response = await fetch(`${apiUrl}/buoyLogos/${id}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result: { logopath: string; name_buoy: string }[] =
        await response.json();
      setLogoBuoy(result);
    } catch (err) {
      setLogoBuoy([]); // Set to empty array on error
    }
  };

  useEffect(() => {
    if (!id || id === '0') {
      setDataBuoy([]); // Set to empty array
      setLoadingBuoy(false);
      setErrorBuoy(null);
      return;
    }
    setLastTimeStamp('');
    fetchGetRefreshTime();
    fetchLastTimeStamp();
  }, [apiUrl, id]);

  useEffect(() => {
    if (lastTimeStamp !== '') {
      fetchLastTimeStamp();
      fetchLastBuoyTimeStamp();
      fetchLogoBuoy();
      fetchData();
    }
  }, [lastTimeStamp]);

  return {
    dataBuoy,
    loadingBuoy,
    errorBuoy,
    lastTimeStamp,
    lastBuoyTimeStamp,
    getRefreshTime,
    logoBuoy,
    fetchLastTimeStamp,
  };
};
