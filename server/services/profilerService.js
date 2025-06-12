const Papa = require('papaparse');

class ProfilerService {
  constructor(logger, requestId) {
    this.logger = logger;
    this.requestId = requestId;
  }

  async profileData(data, options = {}) {
    this.logger.info('Starting data profiling', { 
      requestId: this.requestId,
      rowCount: data.length 
    });

    if (!data || data.length === 0) {
      throw new Error('No data to profile');
    }

    const columnStats = {};
    const keys = Object.keys(data[0]);
    
    this.logger.info('Analyzing columns', { 
      requestId: this.requestId,
      columns: keys,
      columnCount: keys.length 
    });

// Profile each column
for (const key of keys) {
  try {
    console.log(`Profiling column: ${key}`);
    columnStats[key] = await this.profileColumn(data, key);
    console.log(`Column ${key} stats:`, columnStats[key]);
  } catch (error) {
    console.log(`ERROR profiling column ${key}:`, error);
    this.logger.warn('Failed to profile column', {
      requestId: this.requestId,
      column: key,
      error: error.message
    });
    
    columnStats[key] = {
      type: 'unknown',
      count: 0,
      unique: 0,
      error: error.message
    };
  }
}

console.log('Final columnStats before return:', columnStats);

    // Calculate correlations for numeric columns
    const numericColumns = Object.keys(columnStats).filter(
      key => columnStats[key].type === 'numeric'
    );
    
    this.logger.info('Calculating correlations', {
      requestId: this.requestId,
      numericColumnCount: numericColumns.length
    });

    const correlations = this.calculateCorrelations(data, numericColumns);
    const insights = this.generateInsights(columnStats, correlations);

    const summary = {
      totalRows: data.length,
      totalColumns: keys.length,
      numericColumns: numericColumns.length,
      categoricalColumns: keys.length - numericColumns.length,
      totalMissingValues: Object.values(columnStats).reduce(
        (sum, col) => sum + (col.missingCount || 0), 0
      )
    };

    this.logger.info('Profiling completed', {
      requestId: this.requestId,
      summary
    });

console.log('=== PROFILER SERVICE FINAL RESULT ===');
console.log('columnStats keys:', Object.keys(columnStats));
console.log('columnStats:', columnStats);

return {
  columnStats,
  correlations,
  insights,
  summary
};
  }

  async profileColumn(data, columnName) {
    const allValues = data.map(row => row[columnName]);
    const nonNullValues = allValues.filter(v => 
      v !== null && v !== undefined && v !== ''
    );
    const numericValues = nonNullValues.filter(v => 
      typeof v === 'number' && !isNaN(v)
    );
    
    const isNumeric = numericValues.length > 0 && 
                     numericValues.length / nonNullValues.length > 0.5;
    
    const missingCount = allValues.length - nonNullValues.length;
    const missingPercent = (missingCount / allValues.length) * 100;
    const uniqueValues = new Set(nonNullValues);

    const baseStats = {
      type: isNumeric ? 'numeric' : 'categorical',
      totalCount: allValues.length,
      validCount: nonNullValues.length,
      missingCount,
      missingPercent,
      unique: uniqueValues.size,
      uniquePercent: nonNullValues.length > 0 ? (uniqueValues.size / nonNullValues.length) * 100 : 0
    };

    if (isNumeric && numericValues.length > 0) {
      return {
        ...baseStats,
        ...this.calculateNumericStats(numericValues)
      };
    } else {
      return {
        ...baseStats,
        ...this.calculateCategoricalStats(nonNullValues)
      };
    }
  }

  calculateNumericStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    // Calculate variance and standard deviation
    const variance = values.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0
    ) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentiles
    const getPercentile = (arr, p) => {
      const index = (p / 100) * (arr.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      
      if (upper >= arr.length) return arr[arr.length - 1];
      return arr[lower] * (1 - weight) + arr[upper] * weight;
    };

    // Detect outliers using IQR method
    const q1 = getPercentile(sorted, 25);
    const q3 = getPercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound).length;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean,
      median: getPercentile(sorted, 50),
      mode: this.calculateMode(values),
     stdDev,
     variance,
     q1,
     q3,
     iqr,
     outliers,
     skewness: this.calculateSkewness(values, mean, stdDev),
     kurtosis: this.calculateKurtosis(values, mean, stdDev)
   };
 }

 calculateCategoricalStats(values) {
   const valueCounts = {};
   values.forEach(v => {
     const key = String(v);
     valueCounts[key] = (valueCounts[key] || 0) + 1;
   });
   
   const sortedValues = Object.entries(valueCounts)
     .sort(([,a], [,b]) => b - a);
   
   const entropy = this.calculateEntropy(Object.values(valueCounts));
   
   return {
     topValues: sortedValues.slice(0, 10),
     entropy,
     mode: sortedValues[0]?.[0],
     modeCount: sortedValues[0]?.[1] || 0,
     modePercent: sortedValues[0] && values.length > 0 ? 
       (sortedValues[0][1] / values.length) * 100 : 0
   };
 }

 calculateMode(values) {
   const counts = {};
   values.forEach(v => counts[v] = (counts[v] || 0) + 1);
   
   let maxCount = 0;
   let mode = null;
   
   Object.entries(counts).forEach(([value, count]) => {
     if (count > maxCount) {
       maxCount = count;
       mode = parseFloat(value);
     }
   });
   
   return mode;
 }

 calculateSkewness(values, mean, stdDev) {
   if (stdDev === 0) return 0;
   
   const n = values.length;
   const skewness = values.reduce((sum, val) => {
     return sum + Math.pow((val - mean) / stdDev, 3);
   }, 0) / n;
   
   return skewness;
 }

 calculateKurtosis(values, mean, stdDev) {
   if (stdDev === 0) return 0;
   
   const n = values.length;
   const kurtosis = values.reduce((sum, val) => {
     return sum + Math.pow((val - mean) / stdDev, 4);
   }, 0) / n;
   
   return kurtosis - 3; // Excess kurtosis
 }

 calculateEntropy(counts) {
   const total = counts.reduce((a, b) => a + b, 0);
   if (total === 0) return 0;
   
   return -counts.reduce((entropy, count) => {
     if (count === 0) return entropy;
     const p = count / total;
     return entropy + p * Math.log2(p);
   }, 0);
 }

 calculateCorrelations(data, numericColumns) {
   const correlations = [];
   
   const pearsonCorrelation = (x, y) => {
     const n = x.length;
     if (n === 0) return 0;
     
     const avgX = x.reduce((a, b) => a + b, 0) / n;
     const avgY = y.reduce((a, b) => a + b, 0) / n;
     
     const numerator = x.reduce((sum, xi, i) => 
       sum + (xi - avgX) * (y[i] - avgY), 0
     );
     const denomX = Math.sqrt(x.reduce((sum, xi) => 
       sum + Math.pow(xi - avgX, 2), 0
     ));
     const denomY = Math.sqrt(y.reduce((sum, yi) => 
       sum + Math.pow(yi - avgY, 2), 0
     ));
     
     return denomX && denomY ? numerator / (denomX * denomY) : 0;
   };

   // Calculate all pairwise correlations
   for (let i = 0; i < numericColumns.length; i++) {
     for (let j = i + 1; j < numericColumns.length; j++) {
       const colA = numericColumns[i];
       const colB = numericColumns[j];
       
       const valuesA = data.map(row => row[colA])
         .filter(v => typeof v === 'number' && !isNaN(v));
       const valuesB = data.map(row => row[colB])
         .filter(v => typeof v === 'number' && !isNaN(v));
       
       if (valuesA.length > 2 && valuesB.length > 2) {
         const minLength = Math.min(valuesA.length, valuesB.length);
         const corr = pearsonCorrelation(
           valuesA.slice(0, minLength), 
           valuesB.slice(0, minLength)
         );
         
         if (!isNaN(corr)) {
           correlations.push({
             pair: `${colA} & ${colB}`,
             colA,
             colB,
             correlation: corr,
             strength: Math.abs(corr),
             sampleSize: minLength
           });
         }
       }
     }
   }

   const sortedCorrelations = correlations.sort((a, b) => 
     b.strength - a.strength
   );
   
   return {
     all: sortedCorrelations,
     strong: sortedCorrelations.filter(c => c.strength > 0.7),
     moderate: sortedCorrelations.filter(c => 
       c.strength > 0.3 && c.strength <= 0.7
     ),
     weak: sortedCorrelations.filter(c => c.strength <= 0.3),
     positive: sortedCorrelations.filter(c => c.correlation > 0).slice(0, 5),
     negative: sortedCorrelations.filter(c => c.correlation < 0).slice(0, 5)
   };
 }

 generateInsights(columnStats, correlations) {
   const insights = [];
   
   // Data Quality Analysis
   Object.entries(columnStats).forEach(([col, stats]) => {
     if (stats.missingPercent > 30) {
       insights.push({
         type: 'warning',
         category: 'Data Quality',
         message: `${col} has ${stats.missingPercent.toFixed(1)}% missing values - consider data cleaning`,
         severity: 'high'
       });
     }
     
     if (stats.type === 'numeric' && stats.outliers > 0) {
       insights.push({
         type: 'info',
         category: 'Outliers',
         message: `${col} contains ${stats.outliers} potential outliers using IQR method`,
         severity: 'medium'
       });
     }
     
     if (stats.type === 'categorical' && stats.unique === 1) {
       insights.push({
         type: 'warning',
         category: 'Feature Engineering',
         message: `${col} has only one unique value - consider removing this column`,
         severity: 'high'
       });
     }

     if (stats.type === 'categorical' && stats.unique === stats.validCount) {
       insights.push({
         type: 'info',
         category: 'Feature Engineering',
         message: `${col} appears to be an identifier (all unique values)`,
         severity: 'low'
       });
     }

     if (stats.type === 'numeric' && stats.stdDev === 0) {
       insights.push({
         type: 'warning',
         category: 'Data Quality',
         message: `${col} has zero variance - all values are identical`,
         severity: 'high'
       });
     }
   });

   // Correlation Analysis
   if (correlations.strong && correlations.strong.length > 0) {
     insights.push({
       type: 'insight',
       category: 'Multicollinearity',
       message: `Found ${correlations.strong.length} strong correlations (>0.7) - potential multicollinearity detected`,
       severity: 'medium'
     });
   }

   // Advanced Pattern Detection
   const numericColumns = Object.values(columnStats).filter(col => col.type === 'numeric');
   if (numericColumns.length > 0) {
     const avgMissing = numericColumns.reduce((sum, col) => sum + col.missingPercent, 0) / numericColumns.length;
     
     if (avgMissing > 15) {
       insights.push({
         type: 'warning',
         category: 'Data Quality',
         message: `Average missing data rate is ${avgMissing.toFixed(1)}% - dataset may need significant cleaning`,
         severity: 'high'
       });
     }
   }

   // High cardinality detection
   Object.entries(columnStats).forEach(([col, stats]) => {
     if (stats.type === 'categorical' && stats.uniquePercent > 90 && stats.unique > 100) {
       insights.push({
         type: 'info',
         category: 'Feature Engineering',
         message: `${col} has very high cardinality (${stats.unique} unique values) - consider binning or encoding`,
         severity: 'medium'
       });
     }
   });

   return insights.sort((a, b) => {
     const severityOrder = { high: 3, medium: 2, low: 1 };
     return severityOrder[b.severity] - severityOrder[a.severity];
   });
 }
}

module.exports = ProfilerService;