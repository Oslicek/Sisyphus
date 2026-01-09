/**
 * usePensionSimulation Hook
 * 
 * Manages the pension simulation WebWorker:
 * - Initializes worker and loads dataset on mount
 * - Debounces slider changes
 * - Returns loading state, error, and results
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  SliderValues,
  SliderRanges,
  ScenarioResult,
  WorkerRequest,
  WorkerResponse,
} from '../types/pension';

// Import worker as URL for Vite
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite worker import syntax
import PensionWorker from '../workers/pensionWorker?worker';

export interface UsePensionSimulationOptions {
  /** Dataset path relative to /data/ */
  datasetPath: string;
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number;
}

export interface UsePensionSimulationResult {
  /** Whether the worker is initializing */
  isLoading: boolean;
  /** Whether a projection is running */
  isRunning: boolean;
  /** Error message if any */
  error: string | null;
  /** Current projection result */
  result: ScenarioResult | null;
  /** Dataset ID after loading */
  datasetId: string | null;
  /** Default slider values from dataset */
  defaults: SliderValues | null;
  /** Slider ranges from dataset */
  sliderRanges: SliderRanges | null;
  /** Current slider values */
  sliders: SliderValues | null;
  /** Update slider values (triggers debounced projection) */
  setSliders: (sliders: SliderValues) => void;
  /** Run projection with current sliders */
  runProjection: () => void;
}

/**
 * Hook for managing pension simulation via WebWorker
 */
export function usePensionSimulation(
  options: UsePensionSimulationOptions
): UsePensionSimulationResult {
  const { datasetPath, debounceMs = 100 } = options;
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<SliderValues | null>(null);
  const [sliderRanges, setSliderRanges] = useState<SliderRanges | null>(null);
  const [sliders, setSlidersState] = useState<SliderValues | null>(null);
  
  // Refs
  const workerRef = useRef<Worker | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRunRef = useRef(false);
  
  /**
   * Send message to worker
   */
  const postMessage = useCallback((message: WorkerRequest) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);
  
  /**
   * Run projection with given sliders
   */
  const runWithSliders = useCallback((slidersToUse: SliderValues) => {
    if (!workerRef.current || isLoading) {
      pendingRunRef.current = true;
      return;
    }
    
    setIsRunning(true);
    setError(null);
    
    postMessage({
      type: 'run',
      sliders: slidersToUse,
      horizonYears: slidersToUse.horizonYears,
    });
  }, [isLoading, postMessage]);
  
  /**
   * Set sliders with debouncing
   */
  const setSliders = useCallback((newSliders: SliderValues) => {
    setSlidersState(newSliders);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new debounced run
    debounceTimerRef.current = setTimeout(() => {
      runWithSliders(newSliders);
    }, debounceMs);
  }, [debounceMs, runWithSliders]);
  
  /**
   * Run projection immediately with current sliders
   */
  const runProjection = useCallback(() => {
    if (sliders) {
      // Clear any pending debounced run
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      runWithSliders(sliders);
    }
  }, [sliders, runWithSliders]);
  
  /**
   * Handle worker messages
   */
  const handleMessage = useCallback((event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    
    switch (message.type) {
      case 'ready':
        setIsLoading(false);
        setDatasetId(message.datasetId);
        setDefaults(message.defaults);
        setSliderRanges(message.sliderRanges);
        setSlidersState(message.defaults);
        
        // Run initial projection if we have pending run
        if (pendingRunRef.current) {
          pendingRunRef.current = false;
          runWithSliders(message.defaults);
        } else {
          // Auto-run initial projection
          runWithSliders(message.defaults);
        }
        break;
        
      case 'result':
        setIsRunning(false);
        setResult(message.result);
        break;
        
      case 'error':
        setIsLoading(false);
        setIsRunning(false);
        setError(message.message);
        break;
    }
  }, [runWithSliders]);
  
  /**
   * Initialize worker on mount
   */
  useEffect(() => {
    // Create worker
    const worker = new PensionWorker();
    workerRef.current = worker;
    
    // Set up message handler
    worker.onmessage = handleMessage;
    
    // Handle errors
    worker.onerror = (event) => {
      setError(`Worker error: ${event.message}`);
      setIsLoading(false);
      setIsRunning(false);
    };
    
    // Initialize with dataset
    setIsLoading(true);
    setError(null);
    worker.postMessage({ type: 'init', datasetPath });
    
    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      worker.terminate();
      workerRef.current = null;
    };
  }, [datasetPath, handleMessage]);
  
  return useMemo(() => ({
    isLoading,
    isRunning,
    error,
    result,
    datasetId,
    defaults,
    sliderRanges,
    sliders,
    setSliders,
    runProjection,
  }), [
    isLoading,
    isRunning,
    error,
    result,
    datasetId,
    defaults,
    sliderRanges,
    sliders,
    setSliders,
    runProjection,
  ]);
}
