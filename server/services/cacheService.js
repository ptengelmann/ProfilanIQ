const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * CacheService provides methods for caching analysis results
 * to avoid redundant processing of the same data
 */
class CacheService {
  constructor(logger) {
    this.logger = logger;
    this.cacheDir = path.join(__dirname, '../cache');
    this.ensureCacheDir();
    this.cacheMap = new Map(); // In-memory cache for faster access
    this.ttl = 24 * 60 * 60 * 1000; // 24 hours TTL for cache entries
    
    // Load existing cache on startup
    this.loadCacheMap();
    
    // Periodically clean up expired cache entries
    setInterval(() => this.cleanupExpiredEntries(), 60 * 60 * 1000); // Hourly cleanup
  }
  
  /**
   * Ensure cache directory exists
   */
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  
  /**
   * Load existing cache entries into memory
   */
  loadCacheMap() {
    try {
      if (!fs.existsSync(this.cacheDir)) return;
      
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const cacheFilePath = path.join(this.cacheDir, file);
            const stat = fs.statSync(cacheFilePath);
            
            // Skip if file is older than TTL
            if (Date.now() - stat.mtime.getTime() > this.ttl) {
              return;
            }
            
            const content = fs.readFileSync(cacheFilePath, 'utf8');
            const cacheEntry = JSON.parse(content);
            
            // Only load valid entries with a fingerprint
            if (cacheEntry && cacheEntry.fingerprint) {
              this.cacheMap.set(cacheEntry.fingerprint, {
                path: cacheFilePath,
                timestamp: stat.mtime.getTime()
              });
            }
          } catch (err) {
            // Skip invalid cache entries
          }
        }
      });
      
      this.logger.info(`Loaded ${this.cacheMap.size} cache entries`);
    } catch (err) {
      this.logger.error('Failed to load cache', { error: err.message });
    }
  }
  
  /**
   * Generate a fingerprint for a CSV file
   * @param {String} csv - CSV content
   * @param {Object} options - Processing options that affect results
   * @returns {String} - Unique fingerprint
   */
  generateFingerprint(csv, options = {}) {
    // Generate a hash of the CSV content
    const contentHash = crypto.createHash('sha256').update(csv).digest('hex');
    
    // Include relevant options in the fingerprint
    const relevantOptions = {
      delimiter: options.delimiter || '',
      skipEmptyLines: options.skipEmptyLines !== false
    };
    
    // Create a combined fingerprint of content and options
    const optionsStr = JSON.stringify(relevantOptions);
    const fingerprint = crypto.createHash('sha256')
      .update(`${contentHash}|${optionsStr}`)
      .digest('hex');
    
    return fingerprint;
  }
  
  /**
   * Check if analysis is cached
   * @param {String} fingerprint - File fingerprint
   * @returns {Object|null} - Cached result or null
   */
  getCachedResult(fingerprint) {
    const cacheInfo = this.cacheMap.get(fingerprint);
    
    if (!cacheInfo) return null;
    
    try {
      // Check if cache file exists
      if (!fs.existsSync(cacheInfo.path)) {
        this.cacheMap.delete(fingerprint);
        return null;
      }
      
      // Check if cache is expired
      if (Date.now() - cacheInfo.timestamp > this.ttl) {
        this.cacheMap.delete(fingerprint);
        fs.unlinkSync(cacheInfo.path);
        return null;
      }
      
      // Read cache file
      const content = fs.readFileSync(cacheInfo.path, 'utf8');
      const cacheEntry = JSON.parse(content);
      
      // Update access timestamp
      fs.utimesSync(cacheInfo.path, new Date(), new Date());
      
      return cacheEntry.result;
    } catch (err) {
      this.logger.warn('Failed to read cache', { 
        fingerprint, 
        error: err.message 
      });
      return null;
    }
  }
  
  /**
   * Store analysis result in cache
   * @param {String} fingerprint - File fingerprint
   * @param {Object} result - Analysis result
   */
  cacheResult(fingerprint, result) {
    try {
      const cacheFilePath = path.join(this.cacheDir, `${fingerprint}.json`);
      
      const cacheEntry = {
        fingerprint,
        timestamp: Date.now(),
        result
      };
      
      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheEntry));
      
      this.cacheMap.set(fingerprint, {
        path: cacheFilePath,
        timestamp: Date.now()
      });
      
      return true;
    } catch (err) {
      this.logger.warn('Failed to cache result', { 
        fingerprint, 
        error: err.message 
      });
      return false;
    }
  }
  
  /**
   * Clean up expired cache entries
   */
  cleanupExpiredEntries() {
    try {
      const now = Date.now();
      let deletedCount = 0;
      
      for (const [fingerprint, cacheInfo] of this.cacheMap.entries()) {
        if (now - cacheInfo.timestamp > this.ttl) {
          if (fs.existsSync(cacheInfo.path)) {
            fs.unlinkSync(cacheInfo.path);
          }
          this.cacheMap.delete(fingerprint);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        this.logger.info(`Cleaned up ${deletedCount} expired cache entries`);
      }
    } catch (err) {
      this.logger.error('Failed to cleanup cache', { error: err.message });
    }
  }
}

module.exports = CacheService;