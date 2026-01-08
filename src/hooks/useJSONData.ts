import { useState, useEffect, useCallback } from 'react';
import { jsonClient } from '@/lib/json-client';

// Custom hook for JSON data operations
export function useJSONData<T = any>(fileName: string, options?: {
  autoLoad?: boolean;
  refreshInterval?: number;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await jsonClient.readFile(fileName);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fileName]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // Auto-load data on mount
  useEffect(() => {
    if (options?.autoLoad !== false) {
      loadData();
    }
  }, [loadData, options?.autoLoad]);

  // Auto-refresh interval
  useEffect(() => {
    if (options?.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(loadData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadData, options?.refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh,
    loadData
  };
}

// Specialized hooks for common data types
export function usePricing() {
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await jsonClient.getPricing();
      setPricing(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePricing = useCallback(async (newPricing: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await jsonClient.updatePricing(newPricing);
      setPricing(result.pricing);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pricing');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  return {
    pricing,
    loading,
    error,
    loadPricing,
    updatePricing
  };
}

export function useCounters() {
  const [counters, setCounters] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCounters = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await jsonClient.getCounters();
      setCounters(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounters();
  }, [loadCounters]);

  return {
    counters,
    loading,
    error,
    loadCounters
  };
}

export function useAIMemory(type?: string) {
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await jsonClient.getAIMemory(type);
      setMemory(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI memory');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  return {
    memory,
    loading,
    error,
    loadMemory
  };
}
