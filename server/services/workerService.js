const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const os = require('os');

/**
 * WorkerService provides parallel processing capabilities
 * for handling large CSV datasets efficiently
 */
class WorkerService {
  constructor(logger) {
    this.logger = logger;
    this.maxWorkers = Math.max(1, os.cpus().length - 1); // Leave one CPU for main thread
    this.activeWorkers = 0;
    this.workerPool = [];
    this.taskQueue = [];
  }
  
  /**
   * Process data in parallel across worker threads
   * @param {Array} data - The CSV data array
   * @param {Function} taskFn - The processing function
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Combined results
   */
  async processInParallel(data, taskFn, options = {}) {
    if (!data || data.length === 0) {
      return { error: 'No data to process' };
    }
    
    const {
      maxWorkers = this.maxWorkers,
      chunkSize = Math.ceil(data.length / maxWorkers),
      timeout = 60000, // 1 minute timeout
      taskName = 'process'
    } = options;
    
    // Create data chunks
    const chunks = this.chunkArray(data, chunkSize);
    
    this.logger.info(`Starting parallel processing with ${chunks.length} chunks`, {
      taskName,
      totalRows: data.length,
      chunkSize,
      workers: Math.min(chunks.length, maxWorkers)
    });
    
    // Convert task function to string for worker execution
    const taskFnString = taskFn.toString();
    
    // Create a promise for the overall result
    return new Promise((resolve, reject) => {
      const results = [];
      let completedWorkers = 0;
      let hasError = false;
      
      // Set a timeout for the entire operation
      const timeoutId = setTimeout(() => {
        if (completedWorkers < chunks.length) {
          hasError = true;
          reject(new Error(`Parallel processing timed out after ${timeout}ms`));
          
          // Terminate any active workers
          this.workerPool.forEach(worker => {
            if (worker.active) {
              worker.terminate();
            }
          });
        }
      }, timeout);
      
      // Process each chunk in a worker
      chunks.forEach((chunk, index) => {
        this.queueTask({
          chunk,
          index,
          taskFnString,
          taskName,
          options
        }, (error, result) => {
          if (hasError) return; // Skip if already errored
          
          if (error) {
            hasError = true;
            clearTimeout(timeoutId);
            reject(error);
            return;
          }
          
          // Store this chunk's result
          results[index] = result;
          completedWorkers++;
          
          // Check if all workers have completed
          if (completedWorkers === chunks.length) {
            clearTimeout(timeoutId);
            
            // Combine results
            try {
              const combinedResult = this.combineResults(results, taskName);
              resolve(combinedResult);
            } catch (err) {
              reject(err);
            }
          }
        });
      });
    });
  }
  
  /**
   * Split array into chunks
   * @param {Array} array - The array to chunk
   * @param {Number} size - Chunk size
   * @returns {Array} - Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Queue a task for processing
   * @param {Object} task - Task data
   * @param {Function} callback - Completion callback
   */
  queueTask(task, callback) {
    this.taskQueue.push({ task, callback });
    this.processQueue();
  }
  
  /**
   * Process queued tasks
   */
  processQueue() {
    if (this.taskQueue.length === 0) return;
    
    // Check if we can start a new worker
    if (this.activeWorkers < this.maxWorkers) {
      const { task, callback } = this.taskQueue.shift();
      this.runWorker(task, callback);
    }
  }
  
  /**
   * Run a worker thread
   * @param {Object} task - Task data
   * @param {Function} callback - Completion callback
   */
  runWorker(task, callback) {
    this.activeWorkers++;
    
    // Create a new worker
    const worker = new Worker(path.join(__dirname, 'workerRunner.js'), {
      workerData: task
    });
    
    let workerCompleted = false;
    
    // Handle worker messages
    worker.on('message', (result) => {
      workerCompleted = true;
      this.activeWorkers--;
      callback(null, result);
      
      // Process next task
      this.processQueue();
    });
    
    // Handle worker errors
    worker.on('error', (error) => {
      if (!workerCompleted) {
        workerCompleted = true;
        this.activeWorkers--;
        callback(error);
        
        // Process next task
        this.processQueue();
      }
    });
    
    // Handle worker exit
    worker.on('exit', (code) => {
      if (!workerCompleted && code !== 0) {
        workerCompleted = true;
        this.activeWorkers--;
        callback(new Error(`Worker stopped with exit code ${code}`));
        
        // Process next task
        this.processQueue();
      }
    });
  }
  
  /**
   * Combine results from worker threads
   * @param {Array} results - Results from each worker
   * @param {String} taskName - Task name for specific combining logic
   * @returns {Object} - Combined result
   */
  combineResults(results, taskName) {
    if (!results || results.length === 0) {
      return {};
    }
    
    switch (taskName) {
      case 'profileColumns':
        // Combine column statistics
        return results.reduce((combined, result) => {
          return { ...combined, ...result };
        }, {});
        
      case 'calculateCorrelations':
        // Combine correlation arrays
        return {
          all: results.flatMap(result => result.all || [])
        };
        
      default:
        // Default combining logic
        return results.reduce((combined, result) => {
          if (Array.isArray(result)) {
            return combined.concat(result);
          } else if (typeof result === 'object') {
            return { ...combined, ...result };
          }
          return result;
        }, Array.isArray(results[0]) ? [] : {});
    }
  }
}

module.exports = WorkerService;