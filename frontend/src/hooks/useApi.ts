import { useState, useCallback } from 'react';
import { AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '@/lib/http';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiResponse<T> extends ApiState<T> {
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook để xử lý các API calls
 * @param apiFunc Hàm API call cần thực hiện
 * @returns Các giá trị và hàm để quản lý API call
 */
export function useApi<T>(
  apiFunc: (...args: any[]) => Promise<AxiosResponse<ApiResponse<T>>>
): UseApiResponse<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setState({ data: null, loading: true, error: null });
        const response = await apiFunc(...args);
        setState({
          data: response.data.data,
          loading: false,
          error: null,
        });
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse<T>>;
        setState({
          data: null,
          loading: false,
          error: axiosError.response?.data?.message || 'Có lỗi xảy ra',
        });
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
} 