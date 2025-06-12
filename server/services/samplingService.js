/**
 * SamplingService provides methods for sampling large CSV data
 * to provide quick insights before full processing
 */
class SamplingService {
  /**
   * Create a representative sample of the data
   * @param {Array} data - The full CSV data array
   * @param {Object} options - Sampling options
   * @returns {Object} - Sample data and metadata
   */
  createSample(data, options = {}) {
    const {
      maxSampleSize = 5000,
      stratify = true,
      randomSeed = 42,
      preserveDistribution = true
    } = options;
    
    if (!data || data.length === 0) {
      return { sample: [], metadata: { samplingRate: 0, originalSize: 0 } };
    }
    
    // If data is smaller than max sample size, return all data
    if (data.length <= maxSampleSize) {
      return {
        sample: [...data],
        metadata: {
          samplingRate: 1,
          originalSize: data.length,
          isSampled: false
        }
      };
    }
    
    // Calculate sampling rate
    const samplingRate = maxSampleSize / data.length;
    
    let sample;
    
    if (stratify && this.canStratify(data)) {
      // Perform stratified sampling to preserve distribution
      sample = this.stratifiedSample(data, samplingRate, randomSeed);
    } else {
      // Perform random sampling
      sample = this.randomSample(data, samplingRate, randomSeed);
    }
    
    return {
      sample,
      metadata: {
        samplingRate,
        originalSize: data.length,
        isSampled: true,
        sampleSize: sample.length,
        stratified: stratify && this.canStratify(data),
        preservedDistribution: preserveDistribution
      }
    };
  }
  
  /**
   * Check if data can be stratified (contains categorical columns)
   * @param {Array} data - The CSV data array
   * @returns {Boolean} - Whether data can be stratified
   */
  canStratify(data) {
    if (!data || data.length === 0) return false;
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // Check if we have any potential categorical columns
    return keys.some(key => {
      const values = data.slice(0, 100).map(row => row[key]);
      const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
      
      // Consider a column categorical if it has few unique values relative to sample size
      return uniqueValues.size > 1 && uniqueValues.size <= 20;
    });
  }
  
  /**
   * Perform stratified sampling based on categorical columns
   * @param {Array} data - The full CSV data array
   * @param {Number} rate - Sampling rate (0-1)
   * @param {Number} seed - Random seed for reproducibility
   * @returns {Array} - Stratified sample
   */
  stratifiedSample(data, rate, seed) {
    // Find a suitable categorical column for stratification
    const stratColumn = this.findStratificationColumn(data);
    
    if (!stratColumn) {
      // Fall back to random sampling if no suitable column
      return this.randomSample(data, rate, seed);
    }
    
    // Group data by the stratification column
    const stratGroups = {};
    data.forEach(row => {
      const value = row[stratColumn] || 'null';
      if (!stratGroups[value]) {
        stratGroups[value] = [];
      }
      stratGroups[value].push(row);
    });
    
    // Sample from each group proportionally
    let sample = [];
    Object.entries(stratGroups).forEach(([value, rows]) => {
      const groupRate = rate;
      const groupSampleSize = Math.max(1, Math.round(rows.length * groupRate));
      const groupSample = this.randomSample(rows, groupSampleSize / rows.length, seed);
      sample = sample.concat(groupSample);
    });
    
    return sample;
  }
  
  /**
   * Find a suitable column for stratification
   * @param {Array} data - The CSV data array
   * @returns {String|null} - Name of column suitable for stratification
   */
  findStratificationColumn(data) {
    if (!data || data.length === 0) return null;
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // Analyze each column to find a good stratification candidate
    const columnStats = keys.map(key => {
      const values = data.map(row => row[key]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(nonNullValues);
      
      return {
        name: key,
        uniqueCount: uniqueValues.size,
        uniqueRatio: nonNullValues.length > 0 ? uniqueValues.size / nonNullValues.length : 0,
        nullRatio: (values.length - nonNullValues.length) / values.length
      };
    });
    
    // Prioritize columns with good cardinality (not too high, not too low)
    // and low null ratio
    const candidates = columnStats
      .filter(col => col.uniqueCount >= 2 && col.uniqueCount <= 20 && col.nullRatio < 0.2)
      .sort((a, b) => {
        // Optimal unique ratio is around 0.1-0.3
        const aOptimality = Math.abs(a.uniqueRatio - 0.2);
        const bOptimality = Math.abs(b.uniqueRatio - 0.2);
        return aOptimality - bOptimality;
      });
    
    return candidates.length > 0 ? candidates[0].name : null;
  }
  
  /**
   * Perform random sampling
   * @param {Array} data - The full CSV data array
   * @param {Number} rate - Sampling rate (0-1)
   * @param {Number} seed - Random seed for reproducibility
   * @returns {Array} - Random sample
   */
  randomSample(data, rate, seed) {
    // If rate is 1 or higher, return all data
    if (rate >= 1) return [...data];
    
    // If specific sample size provided instead of rate
    if (rate > 1 && Number.isInteger(rate)) {
      const sampleSize = Math.min(rate, data.length);
      rate = sampleSize / data.length;
    }
    
    // Simple random sampling
    const sample = [];
    const random = this.seededRandom(seed);
    
    for (let i = 0; i < data.length; i++) {
      if (random() < rate) {
        sample.push(data[i]);
      }
    }
    
    return sample;
  }
  
  /**
   * Create a seeded random number generator
   * @param {Number} seed - Random seed
   * @returns {Function} - Seeded random function
   */
  seededRandom(seed) {
    let s = seed || 1;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}

module.exports = SamplingService;