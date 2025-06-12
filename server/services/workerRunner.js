const { parentPort, workerData } = require('worker_threads');

// Extract worker data
const { chunk, taskFnString, options } = workerData;

// Convert the function string back to a function
const taskFn = new Function('return ' + taskFnString)();

// Execute the task function
try {
  const result = taskFn(chunk, options);
  
  // Handle both synchronous and promise-based results
  if (result instanceof Promise) {
    result.then(
      (resolvedResult) => parentPort.postMessage(resolvedResult),
      (error) => {
        console.error('Worker error:', error);
        parentPort.postMessage({ error: error.message });
      }
    );
  } else {
    parentPort.postMessage(result);
  }
} catch (error) {
  console.error('Worker execution error:', error);
  parentPort.postMessage({ error: error.message });
}