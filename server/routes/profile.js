const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const { performance } = require('perf_hooks');
const ProfilerService = require('../services/profilerService');
const SamplingService = require('../services/samplingService');
const CacheService = require('../services/cacheService');

// Initialize services
const samplingService = new SamplingService();
const cacheService = new CacheService(console); // Temporary logger until proper injection

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

router.post('/', validateProfileRequest, async (req, res, next) => {
  const startTime = performance.now();
  
  try {
    const { csv, options = {} } = req.body;
    
    // Extract cache and sampling options
    const { 
      useCache = true,
      enableSampling = true,
      sampleSize = 5000,
      fullAnalysis = false
    } = options;
    
    req.logger.profileRequest(req.requestId, { csv, options });

    // Generate a fingerprint for caching
    let fingerprint = null;
    let cacheUsed = false;
    
    if (useCache) {
      fingerprint = cacheService.generateFingerprint(csv, options);
      
      // Check if we have a cached result
      const cachedResult = cacheService.getCachedResult(fingerprint);
      
      if (cachedResult) {
        req.logger.info('Using cached analysis result', {
          requestId: req.requestId,
          fingerprint: fingerprint.substring(0, 8) // Just log a prefix for privacy
        });
        
        const cacheHitTime = performance.now() - startTime;
        
        // Add cache metrics to the result
        const resultWithCacheMetrics = {
          ...cachedResult,
          summary: {
            ...cachedResult.summary,
            cache: {
              hit: true,
              retrievalTime: `${cacheHitTime.toFixed(2)}ms`
            }
          }
        };
        
        req.logger.profileComplete(req.requestId, resultWithCacheMetrics, cacheHitTime);
        
        // Return cached result
        return res.json({
          success: true,
          requestId: req.requestId,
          data: resultWithCacheMetrics,
          fromCache: true
        });
      }
    }

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

    let data = parsed.data;
    
    if (!data || data.length === 0) {
      req.logger.profileError(req.requestId, new Error('No data found'), performance.now() - startTime);
      return res.status(400).json({
        error: 'No data found in CSV',
        requestId: req.requestId
      });
    }

    // Sampling for large datasets
    let samplingMetadata = { isSampled: false };
    
    if (enableSampling && data.length > sampleSize && !fullAnalysis) {
      req.logger.info('Sampling large dataset', {
        requestId: req.requestId,
        originalRowCount: data.length,
        targetSampleSize: sampleSize
      });
      
      const samplingStartTime = performance.now();
      const { sample, metadata } = samplingService.createSample(data, {
        maxSampleSize: sampleSize,
        stratify: true
      });
      const samplingTime = performance.now() - samplingStartTime;
      
      data = sample;
      samplingMetadata = {
        ...metadata,
        samplingTime: `${samplingTime.toFixed(2)}ms`
      };
      
      req.logger.info('Dataset sampled', {
        requestId: req.requestId,
        sampleSize: data.length,
        samplingRate: samplingMetadata.samplingRate,
        samplingTime: samplingMetadata.samplingTime
      });
    }

    // Log parsing success
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

    // Cache the result if caching is enabled
    if (useCache && fingerprint) {
      const cacheStartTime = performance.now();
      const cached = cacheService.cacheResult(fingerprint, profileResult);
      const cacheTime = performance.now() - cacheStartTime;
      
      cacheUsed = true;
      
      req.logger.info('Cached analysis result', {
        requestId: req.requestId,
        fingerprint: fingerprint.substring(0, 8),
        cacheTime: `${cacheTime.toFixed(2)}ms`,
        success: cached
      });
      
      // Add cache metrics to the result
      profileResult.summary.cache = {
        hit: false,
        stored: cached,
        storageTime: `${cacheTime.toFixed(2)}ms`
      };
    }

    req.logger.profileComplete(req.requestId, profileResult, totalTime);

    // Step 3: Return comprehensive response with enhanced metadata
    res.json({
      success: true,
      requestId: req.requestId,
      fromCache: false,
      data: {
        summary: {
          ...profileResult.summary,
          processingTime: {
            total: `${totalTime.toFixed(2)}ms`,
            parsing: `${parseTime.toFixed(2)}ms`,
            profiling: `${profileTime.toFixed(2)}ms`
          },
          performance: {
            rowsPerSecond: Math.round((profileResult.summary.totalRows / totalTime) * 1000),
            columnsPerSecond: Math.round((profileResult.summary.totalColumns / totalTime) * 1000),
            efficiency: totalTime < 1000 ? 'excellent' : totalTime < 5000 ? 'good' : 'needs optimization'
          },
          sampling: samplingMetadata,
          cache: profileResult.summary.cache || { enabled: useCache, used: cacheUsed }
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
    
    // Enhanced error logging
    req.logger.profileError(req.requestId, error, totalTime);

    next(error);
  }
});

// GET endpoint for testing
router.get('/', (req, res) => {
  req.logger.info('Profile endpoint health check', { ip: req.ip });
  
  res.json({
    message: 'CSV Profiler API is running',
    version: '2.1.0',
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
          skipEmptyLines: 'boolean (optional) - Skip empty lines (default: true)',
          enableSampling: 'boolean (optional) - Enable sampling for large datasets (default: true)',
          sampleSize: 'number (optional) - Maximum sample size if sampling is enabled (default: 5000)',
          fullAnalysis: 'boolean (optional) - Force full analysis even for large datasets (default: false)',
          useCache: 'boolean (optional) - Use cached results for identical datasets (default: true)'
        }
      }
    },
    documentation: `${req.protocol}://${req.get('host')}/api-docs`
  });
});

module.exports = router;