/**
 * Pension Simulation WebWorker
 * 
 * Handles demographic projection calculations off the main thread.
 * 
 * Message Protocol:
 * - init: Load dataset from path
 * - run: Run projection with slider values
 * 
 * Response Types:
 * - ready: Dataset loaded, includes defaults and slider ranges
 * - result: Projection complete, includes ScenarioResult
 * - error: Something went wrong
 */

import type {
  PensionDataset,
  SliderValues,
  WorkerRequest,
  WorkerResponse,
  WorkerReadyResponse,
  WorkerResultResponse,
  WorkerErrorResponse,
} from '../types/pension';

import { runProjection, loadPensionDataset } from '../utils/pensionProjection';

// Worker state
let dataset: PensionDataset | null = null;

/**
 * Send response back to main thread
 */
function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Send error response
 */
function postError(message: string): void {
  const response: WorkerErrorResponse = {
    type: 'error',
    message,
  };
  postResponse(response);
}

/**
 * Handle init message - load dataset
 */
async function handleInit(datasetPath: string): Promise<void> {
  try {
    dataset = await loadPensionDataset(datasetPath);
    
    const response: WorkerReadyResponse = {
      type: 'ready',
      datasetId: dataset.meta.datasetId,
      defaults: dataset.meta.defaults,
      sliderRanges: dataset.meta.sliderRanges,
    };
    
    postResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dataset';
    postError(message);
  }
}

/**
 * Handle run message - execute projection
 */
function handleRun(sliders: SliderValues, horizonYears: number): void {
  if (!dataset) {
    postError('Dataset not loaded. Call init first.');
    return;
  }
  
  try {
    const result = runProjection(dataset, sliders, horizonYears);
    
    const response: WorkerResultResponse = {
      type: 'result',
      result,
    };
    
    postResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Projection failed';
    postError(message);
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  
  switch (message.type) {
    case 'init':
      await handleInit(message.datasetPath);
      break;
      
    case 'run':
      handleRun(message.sliders, message.horizonYears);
      break;
      
    default:
      postError(`Unknown message type: ${(message as { type: string }).type}`);
  }
};

// Export for type checking (worker won't actually export)
export type { WorkerRequest, WorkerResponse };
