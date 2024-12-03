// src/hooks/useFetchChartsData.ts

import { useState, useEffect } from 'react';
import axios from 'axios';

export interface TimeSeriesDataItem {
  id_buoy: number;
  id_vargen: number;
  timestamp: string;
  value_sint: number | null;
  value_simp: number | null;
  cardinal_direction: string | null;
  units_sint: string;
  units_simp: string;
}

interface FetchChartsDataParams {
  id_buoy: string;
  id_vargen: string[];
  start_time: string;
  end_time: string;
}

const useFetchChartsData = (apiUrl: string, params: FetchChartsDataParams) => {
  const [data, setData] = useState<TimeSeriesDataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartsData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post(`${apiUrl}/timeSeriesData`, params, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 200) {
          const responseData = response.data as TimeSeriesDataItem[];
          setData(responseData);
        } else {
          setError('Failed to fetch data.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchChartsData();
  }, [apiUrl, params]);

  return { data, loading, error };
};

export default useFetchChartsData;
