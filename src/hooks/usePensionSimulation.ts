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
  PensionDataset,
} from '../types/pension';
import { loadPensionDataset } from '../utils/pensionProjection';

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
  /** Loaded dataset (for distribution charts) */
  dataset: PensionDataset | null;
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
  const [dataset, setDataset] = useState<PensionDataset | null>(null);
  
  // Refs
  const workerRef = useRef<Worker | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  
  /**
   * Send message to worker
   */
  const postMessage = useCallback((message: WorkerRequest) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);
  
  /**
   * Run projection with given sliders (internal, no deps on state)
   */
  const runProjectionInternal = useCallback((slidersToUse: SliderValues) => {
    if (!workerRef.current) {
      return;
    }
    
    setIsRunning(true);
    setError(null);
    
    postMessage({
      type: 'run',
      sliders: slidersToUse,
      horizonYears: slidersToUse.horizonYears,
    });
  }, [postMessage]);
  
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
      runProjectionInternal(newSliders);
    }, debounceMs);
  }, [debounceMs, runProjectionInternal]);
  
  /**
   * Run projection immediately with current sliders
   */
  const runProjection = useCallback(() => {
    if (sliders) {
      // Clear any pending debounced run
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      runProjectionInternal(sliders);
    }
  }, [sliders, runProjectionInternal]);
  
  /**
   * Initialize worker on mount - only runs once per datasetPath
   */
  useEffect(() => {
    // Prevent re-initialization
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;
    
    // Create worker
    const worker = new PensionWorker();
    workerRef.current = worker;
    
    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      
      switch (message.type) {
        case 'ready':
          setIsLoading(false);
          setDatasetId(message.datasetId);
          setDefaults(message.defaults);
          setSliderRanges(message.sliderRanges);
          setSlidersState(message.defaults);
          
          // Load dataset in main thread for distribution charts
          loadPensionDataset(datasetPath)
            .then(setDataset)
            .catch(err => console.warn('Failed to load dataset for charts:', err));
          
          // Auto-run initial projection
          setIsRunning(true);
          worker.postMessage({
            type: 'run',
            sliders: message.defaults,
            horizonYears: message.defaults.horizonYears,
          });
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
    };
    
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
      isInitializedRef.current = false;
    };
  }, [datasetPath]);
  
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
    dataset,
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
    dataset,
  ]);
}
