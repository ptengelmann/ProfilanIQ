/**
 * CSV Profiler Pro API Client
 * Provides a clean interface for interacting with the backend API
 */
class ApiClient {
  constructor(baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.requestConfig = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 1 minute timeout
    };
  }

  /**
   * Check API health status
   * @returns {Promise<Object>} Health status information
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      
      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Profile CSV data
   * @param {String} csvText - CSV data as a string
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Analysis results
   */
  async profileCsv(csvText, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/profile`, {
        method: 'POST',
        headers: this.requestConfig.headers,
        body: JSON.stringify({
          csv: csvText,
          options
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Profile error:', error);
      throw error;
    }
  }

  /**
   * Compare two datasets
   * @param {Array} dataset1 - First dataset
   * @param {Array} dataset2 - Second dataset
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Comparison results
   */
  async compareDatasets(dataset1, dataset2, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/compare`, {
        method: 'POST',
        headers: this.requestConfig.headers,
        body: JSON.stringify({
          dataset1,
          dataset2,
          options
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Comparison error:', error);
      throw error;
    }
  }

  /**
   * Parse CSV text to JavaScript array
   * @param {String} csvText - CSV text to parse
   * @param {Object} options - Parse options
   * @returns {Promise<Array>} Parsed data
   */
  async parseCsv(csvText, options = {}) {
    // Client-side parsing for small files
    if (csvText.length < 1000000) { // 1MB threshold
      // Use PapaParse in the browser
      const Papa = await import('papaparse');
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          ...options,
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parse warnings:', results.errors);
            }
            resolve(results.data);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    }
    
    // For larger files, use the server-side parsing
    try {
      const response = await this.profileCsv(csvText, {
        ...options,
        parseOnly: true
      });
      
      return response.data.parsed;
    } catch (error) {
      console.error('Server-side parsing error:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;