const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const { performance } = require('perf_hooks');
const ProfilerService = require('../services/profilerService');

// Simple validation middleware
const validateProfileRequest = (req, res, next) => {
  const { csv } = req.body;
  
  if (!csv) {
    req.logger.warn('Validation failed - no CSV data', { requestId: req.requestId });
    return res.status(400).json({
      error: 'CSV data is required',
      requestId: req.requestId
    });
  }
  
  if (typeof csv !== 'string') {
    req.logger.warn('Validation failed - CSV not string', { requestId: req.requestId });
    return res.status(400).json({
      error: 'CSV data must be a string',
      requestId: req.requestId
    });
  }
  
  if (csv.length < 10) {
    req.logger.warn('Validation failed - CSV too short', { requestId: req.requestId });
    return res.status(400).json({
      error: 'CSV data is too short to be valid',
      requestId: req.requestId
    });
  }
  
  if (csv.length > 50 * 1024 * 1024) { // 50MB
    req.logger.warn('Validation failed - CSV too large', { requestId: req.requestId });
    return res.status(400).json({
      error: 'CSV data exceeds 50MB limit',
      requestId: req.requestId
    });
  }
  
  next();
};

// In your profile.js route, update the main POST handler:

router.post('/', validateProfileRequest, async (req, res, next) => {
  const startTime = performance.now();
  
  try {
    const { csv, options = {} } = req.body;
    
    // 🔥 NEW: Enhanced profiling start
    req.logger.profileRequest(req.requestId, { csv, options });

    // Step 1: Parse CSV with enhanced options
    const parseStartTime = performance.now();
    const parseOptions = {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: options.skipEmptyLines !== false,
      delimiter: options.delimiter || '',
      transformHeader: (header) => header.trim(),
      transform: (value, header) => {
        if (typeof value === 'string') {
          return value.trim();
        }
        return value;
      }
    };

    const parsed = Papa.parse(csv, parseOptions);
    const parseTime = performance.now() - parseStartTime;

    if (parsed.errors && parsed.errors.length > 0) {
      req.logger.warn('CSV parsing had errors', {
        requestId: req.requestId,
        errors: parsed.errors.slice(0, 5),
        totalErrors: parsed.errors.length
      });
      
      const criticalErrors = parsed.errors.filter(err => err.type === 'Delimiter');
      if (criticalErrors.length > 0) {
        req.logger.profileError(req.requestId, new Error('Invalid CSV format'), performance.now() - startTime);
        return res.status(400).json({
          error: 'CSV parsing failed',
          details: 'Invalid CSV format or delimiter',
          parseErrors: criticalErrors,
          requestId: req.requestId
        });
      }
    }

    const data = parsed.data;
    
    if (!data || data.length === 0) {
      req.logger.profileError(req.requestId, new Error('No data found'), performance.now() - startTime);
      return res.status(400).json({
        error: 'No data found in CSV',
        requestId: req.requestId
      });
    }

    // 🔥 NEW: Log parsing success
    req.logger.info('CSV parsing completed', {
      requestId: req.requestId,
      rowCount: data.length,
      columnCount: data.length > 0 ? Object.keys(data[0]).length : 0,
      parseTime: `${parseTime.toFixed(2)}ms`,
      parseErrors: parsed.errors?.length || 0
    });

    // Step 2: Profile the data
    const profileStartTime = performance.now();
    const profilerService = new ProfilerService(req.logger, req.requestId);
    const profileResult = await profilerService.profileData(data, options);
    const profileTime = performance.now() - profileStartTime;

    const totalTime = performance.now() - startTime;

    // 🔥 NEW: Enhanced completion logging
    req.logger.profileComplete(req.requestId, profileResult, totalTime);

    // Step 3: Return comprehensive response with enhanced metadata
    res.json({
      success: true,
      requestId: req.requestId,
      data: {
        summary: {
          ...profileResult.summary,
          processingTime: {
            total: `${totalTime.toFixed(2)}ms`,
            parsing: `${parseTime.toFixed(2)}ms`,
            profiling: `${profileTime.toFixed(2)}ms`
          },
          // 🔥 NEW: Add performance insights
          performance: {
            rowsPerSecond: Math.round((profileResult.summary.totalRows / totalTime) * 1000),
            columnsPerSecond: Math.round((profileResult.summary.totalColumns / totalTime) * 1000),
            efficiency: totalTime < 1000 ? 'excellent' : totalTime < 5000 ? 'good' : 'needs optimization'
          }
        },
        columns: profileResult.columnStats,
        correlations: profileResult.correlations,
        insights: profileResult.insights,
        metadata: {
          parseErrors: parsed.errors?.length || 0,
          timestamp: new Date().toISOString(),
          version: '2.1.0' // Bump version for enhanced logging
        }
      }
    });

  } catch (error) {
    const totalTime = performance.now() - startTime;
    
    // 🔥 NEW: Enhanced error logging
    req.logger.profileError(req.requestId, error, totalTime);

    next(error);
  }
});

// GET endpoint for testing
router.get('/', (req, res) => {
  req.logger.info('Profile endpoint health check', { ip: req.ip });
  
  res.json({
    message: 'CSV Profiler API is running',
    version: '2.0.0',
    endpoints: {
      'POST /': 'Profile CSV data',
      'GET /': 'Health check'
    },
    usage: {
      method: 'POST',
      contentType: 'application/json',
      body: {
        csv: 'string (required) - CSV data as string',
        options: {
          delimiter: 'string (optional) - CSV delimiter (,;|\\t)',
          skipEmptyLines: 'boolean (optional) - Skip empty lines (default: true)'
        }
      }
    }
  });
});

module.exports = router;