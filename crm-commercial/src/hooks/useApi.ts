import { useState, useCallback } from 'react';
import { useUIStore } from '../stores';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T, Args extends unknown[]>(
  apiFunction: (...args: Args) => Promise<T>,
  options: UseApiOptions = {}
) {
  const { showSuccessToast = false, showErrorToast = true, successMessage } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { addToast } = useUIStore();

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);

        if (showSuccessToast && successMessage) {
          addToast('success', successMessage);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Une erreur est survenue');
        setError(error);

        if (showErrorToast) {
          addToast('error', error.message);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, showSuccessToast, showErrorToast, successMessage, addToast]
  );

  return { data, loading, error, execute };
}

export default useApi;
