import { useState, useEffect } from 'react';
import { fetchDataFromApi } from '../services/apiService';

type ApiError = Error & { message: string };

export const useFetchData = (url: string) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await fetchDataFromApi(url);
        setData(result);
      } catch (error) {
        if (error instanceof Error) {
          setError(error as ApiError);
        } else {
          setError(new Error('An unknown error occurred') as ApiError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, setData, error, loading };
};
