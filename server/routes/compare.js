const express = require('express');
const router = express.Router();
const { performance } = require('perf_hooks');
const ProfilerService = require('../services/profilerService');

/**
 * Compare two CSV datasets
 */
router.post('/', async (req, res, next) => {
  const startTime = performance.now();
  
  try {
    const { dataset1, dataset2, options = {} } = req.body;
    
    if (!dataset1 || !dataset2) {
      return res.status(400).json({
        error: 'Two datasets are required for comparison',
        requestId: req.requestId
      });
    }
    
    req.logger.info('Starting dataset comparison', { 
      requestId: req.requestId,
      dataset1Size: dataset1.length,
      dataset2Size: dataset2.length
    });
    
    // Analyze both datasets
    const profilerService = new ProfilerService(req.logger, req.requestId);
    
    const [profile1, profile2] = await Promise.all([
      profilerService.profileData(dataset1, options),
      profilerService.profileData(dataset2, options)
    ]);
    
    // Compare the profiles
    const comparison = compareProfiles(profile1, profile2);
    
    const totalTime = performance.now() - startTime;
    
    req.logger.info('Comparison completed', {
      requestId: req.requestId,
      processingTime: `${totalTime.toFixed(2)}ms`,
      changeSummary: comparison.summary
    });
    
    res.json({
      success: true,
      requestId: req.requestId,
      data: {
        comparison,
        profiles: {
          dataset1: profile1,
          dataset2: profile2
        },
        processingTime: `${totalTime.toFixed(2)}ms`
      }
    });
    
  } catch (error) {
    req.logger.error('Comparison failed', {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack
    });
    
    next(error);
  }
});

/**
 * Compare two profile results
 */
function compareProfiles(profile1, profile2) {
  // Compare column presence
  const columns1 = Object.keys(profile1.columnStats);
  const columns2 = Object.keys(profile2.columnStats);
  
  const commonColumns = columns1.filter(col => columns2.includes(col));
  const uniqueToProfile1 = columns1.filter(col => !columns2.includes(col));
  const uniqueToProfile2 = columns2.filter(col => !columns1.includes(col));
  
  // Compare data size
  const rowCountDiff = profile2.summary.totalRows - profile1.summary.totalRows;
  const rowCountPercent = profile1.summary.totalRows > 0 
    ? (rowCountDiff / profile1.summary.totalRows) * 100 
    : 0;
  
  // Compare column statistics for common columns
  const columnComparisons = {};
  
  commonColumns.forEach(column => {
    const stats1 = profile1.columnStats[column];
    const stats2 = profile2.columnStats[column];
    
    // Check for type changes
    const typeChanged = stats1.type !== stats2.type;
    
    // Calculate changes in key metrics
    const changes = {
      typeChanged,
      typeChange: typeChanged ? `${stats1.type} → ${stats2.type}` : null,
      missingCountDiff: stats2.missingCount - stats1.missingCount,
      missingPercentDiff: stats2.missingPercent - stats1.missingPercent,
      uniqueValuesDiff: stats2.unique - stats1.unique,
      uniquePercent: stats1.unique > 0 
        ? ((stats2.unique - stats1.unique) / stats1.unique) * 100 
        : 0
    };
    
    // Add type-specific comparisons
    if (stats1.type === 'numeric' && stats2.type === 'numeric') {
      changes.numeric = {
        meanDiff: stats2.mean - stats1.mean,
        meanPercent: stats1.mean !== 0 
          ? ((stats2.mean - stats1.mean) / Math.abs(stats1.mean)) * 100 
          : 0,
        stdDevDiff: stats2.stdDev - stats1.stdDev,
        minDiff: stats2.min - stats1.min,
        maxDiff: stats2.max - stats1.max,
        rangeDiff: (stats2.max - stats2.min) - (stats1.max - stats1.min),
        outliersDiff: stats2.outliers - stats1.outliers
      };
    } else if (stats1.type === 'categorical' && stats2.type === 'categorical') {
      changes.categorical = {
        entropyDiff: stats2.entropy - stats1.entropy,
        // Compare top values
        topValueChanges: compareTopValues(stats1.topValues, stats2.topValues)
      };
    }
    
    columnComparisons[column] = {
      column,
      type1: stats1.type,
      type2: stats2.type,
      changes
    };
  });
  
  // Compare correlations
  const correlationChanges = compareCorrelations(
    profile1.correlations.all, 
    profile2.correlations.all
  );
  
  // Generate insights based on comparisons
  const insights = generateComparisonInsights(profile1, profile2, {
    columnComparisons,
    uniqueToProfile1,
    uniqueToProfile2,
    rowCountDiff,
    correlationChanges
  });
  
  return {
    summary: {
      rowCountDiff,
      rowCountPercent: rowCountPercent.toFixed(2),
      columnCountDiff: profile2.summary.totalColumns - profile1.summary.totalColumns,
      commonColumnCount: commonColumns.length,
      uniqueToProfile1Count: uniqueToProfile1.length,
      uniqueToProfile2Count: uniqueToProfile2.length,
      significantChanges: insights.filter(i => i.severity === 'high').length
    },
    columns: {
      common: commonColumns,
      uniqueToProfile1,
      uniqueToProfile2,
      comparisons: columnComparisons
    },
    correlations: correlationChanges,
    insights
  };
}

/**
 * Compare top categorical values
 */
function compareTopValues(topValues1, topValues2) {
  if (!topValues1 || !topValues2) return [];
  
  const valueMap1 = new Map(topValues1.map(([value, count]) => [value, count]));
  const valueMap2 = new Map(topValues2.map(([value, count]) => [value, count]));
  
  const allValues = [...new Set([
    ...topValues1.map(([v]) => v),
    ...topValues2.map(([v]) => v)
  ])];
  
  return allValues.map(value => {
    const count1 = valueMap1.get(value) || 0;
    const count2 = valueMap2.get(value) || 0;
    const diff = count2 - count1;
    const percentChange = count1 > 0 ? (diff / count1) * 100 : null;
    
    return {
      value,
      count1,
      count2,
      diff,
      percentChange: percentChange !== null ? percentChange.toFixed(2) : null,
      significant: Math.abs(percentChange) > 20 // Mark significant changes
    };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/**
 * Compare correlations between profiles
 */
function compareCorrelations(correlations1, correlations2) {
  const pairMap1 = new Map(correlations1.map(corr => [corr.pair, corr]));
  const pairMap2 = new Map(correlations2.map(corr => [corr.pair, corr]));
  
  const allPairs = [...new Set([
    ...correlations1.map(c => c.pair),
    ...correlations2.map(c => c.pair)
  ])];
  
  const changes = allPairs.map(pair => {
    const corr1 = pairMap1.get(pair);
    const corr2 = pairMap2.get(pair);
    
    if (!corr1) {
      return {
        pair,
        onlyInProfile2: true,
        correlation2: corr2.correlation
      };
    }
    
    if (!corr2) {
      return {
        pair,
        onlyInProfile1: true,
        correlation1: corr1.correlation
      };
    }
    
    const diff = corr2.correlation - corr1.correlation;
    const significant = Math.abs(diff) > 0.2;
    
    return {
      pair,
      correlation1: corr1.correlation,
      correlation2: corr2.correlation,
      diff,
      significant,
      signChange: (corr1.correlation > 0 && corr2.correlation < 0) || 
                  (corr1.correlation < 0 && corr2.correlation > 0)
    };
  });
  
  return {
    added: changes.filter(c => c.onlyInProfile2),
    removed: changes.filter(c => c.onlyInProfile1),
    changed: changes.filter(c => !c.onlyInProfile1 && !c.onlyInProfile2)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  };
}

/**
 * Generate insights from comparison
 */
function generateComparisonInsights(profile1, profile2, comparison) {
  const insights = [];
  
  // Row count insights
  if (Math.abs(comparison.rowCountDiff) > 0) {
    const direction = comparison.rowCountDiff > 0 ? 'increased' : 'decreased';
    const percentChange = Math.abs((comparison.rowCountDiff / profile1.summary.totalRows) * 100);
    
    let severity = 'low';
    if (percentChange > 50) severity = 'high';
    else if (percentChange > 20) severity = 'medium';
    
    insights.push({
      category: 'Data Size',
      type: 'change',
      message: `Row count has ${direction} by ${Math.abs(comparison.rowCountDiff)} rows (${percentChange.toFixed(1)}%)`,
      severity
    });
  }
  
  // Column changes
  if (comparison.uniqueToProfile1.length > 0) {
    insights.push({
      category: 'Column Structure',
      type: 'removed',
      message: `${comparison.uniqueToProfile1.length} columns were removed: ${comparison.uniqueToProfile1.join(', ')}`,
      severity: 'high'
    });
  }
  
  if (comparison.uniqueToProfile2.length > 0) {
    insights.push({
      category: 'Column Structure',
      type: 'added',
      message: `${comparison.uniqueToProfile2.length} new columns were added: ${comparison.uniqueToProfile2.join(', ')}`,
      severity: 'high'
    });
  }
  
  // Type changes
  const typeChanges = Object.values(comparison.columnComparisons)
    .filter(comp => comp.changes.typeChanged);
  
  if (typeChanges.length > 0) {
    insights.push({
      category: 'Data Types',
      type: 'changed',
      message: `${typeChanges.length} columns changed data types: ${typeChanges.map(c => `${c.column} (${c.changes.typeChange})`).join(', ')}`,
      severity: 'high'
    });
  }
  
  // Missing values changes
  const missingIncreases = Object.values(comparison.columnComparisons)
    .filter(comp => comp.changes.missingPercentDiff > 5);
  
  if (missingIncreases.length > 0) {
    insights.push({
      category: 'Data Quality',
      type: 'warning',
      message: `${missingIncreases.length} columns have significantly higher missing values: ${missingIncreases.map(c => `${c.column} (+${c.changes.missingPercentDiff.toFixed(1)}%)`).join(', ')}`,
      severity: 'medium'
    });
  }
  
  // Significant numeric changes
  const numericChanges = Object.values(comparison.columnComparisons)
    .filter(comp => 
      comp.type1 === 'numeric' && 
      comp.type2 === 'numeric' &&
      comp.changes.numeric &&
      Math.abs(comp.changes.numeric.meanPercent) > 20
    );
  
  if (numericChanges.length > 0) {
    insights.push({
      category: 'Numeric Distributions',
      type: 'change',
      message: `${numericChanges.length} numeric columns have significant mean changes: ${numericChanges.map(c => `${c.column} (${c.changes.numeric.meanPercent > 0 ? '+' : ''}${c.changes.numeric.meanPercent.toFixed(1)}%)`).join(', ')}`,
      severity: 'medium'
    });
  }
  
  // Correlation changes
  const significantCorrChanges = comparison.correlations.changed
    .filter(c => c.significant);
  
  if (significantCorrChanges.length > 0) {
    insights.push({
      category: 'Relationships',
      type: 'change',
      message: `${significantCorrChanges.length} correlation relationships have changed significantly`,
      severity: 'medium'
    });
  }
  
  const signChanges = comparison.correlations.changed
    .filter(c => c.signChange);
  
  if (signChanges.length > 0) {
    insights.push({
      category: 'Relationships',
      type: 'warning',
      message: `${signChanges.length} correlations have changed direction (positive to negative or vice versa)`,
      severity: 'high'
    });
  }
  
  return insights.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

module.exports = router;