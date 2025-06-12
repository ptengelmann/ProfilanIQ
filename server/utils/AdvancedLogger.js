const fs = require('fs');
const path = require('path');

class AdvancedLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
    
    // Development metrics
    this.sessionMetrics = {
      requestCount: 0,
      errorCount: 0,
      totalFilesProcessed: 0,
      totalRowsAnalyzed: 0,
      avgProcessingTime: 0,
      processingTimes: [],
      startTime: Date.now()
    };

    // Only setup dashboard if explicitly enabled
    this.setupDevelopmentDashboard();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  setupDevelopmentDashboard() {
    // Clear screen and show header
    console.clear();
    this.showHeader();
    
    // REMOVED: Auto-refreshing setInterval
    // Now metrics only show after actual requests are processed
    // If you want periodic updates, set SHOW_METRICS_INTERVAL=true in .env
    if (process.env.SHOW_METRICS_INTERVAL === 'true') {
      setInterval(() => {
        if (this.sessionMetrics.requestCount > 0) {
          this.updateDashboard();
        }
      }, 60000); // Reduced to every minute if enabled
    }
  }

  showHeader() {
    const header = `
╔══════════════════════════════════════════════════════════════╗
║                    🚀 CSV PROFILER PRO - DEV MODE             ║
║                   Advanced Data Analytics Engine              ║
╠══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${process.env.PORT || 5000}                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                     ║
║  Started: ${new Date().toLocaleString()}                    ║
║  Docs: http://localhost:${process.env.PORT || 5000}/api-docs               ║
╚══════════════════════════════════════════════════════════════╝
`;
    console.log('\x1b[36m%s\x1b[0m', header);
  }

  updateDashboard() {
    const uptime = this.formatUptime(Date.now() - this.sessionMetrics.startTime);
    const avgTime = this.sessionMetrics.processingTimes.length > 0 
      ? (this.sessionMetrics.processingTimes.reduce((a, b) => a + b, 0) / this.sessionMetrics.processingTimes.length).toFixed(2)
      : '0';

    console.log('\n' + '='.repeat(60));
    console.log('\x1b[33m📊 DEVELOPMENT METRICS\x1b[0m');
    console.log('='.repeat(60));
    console.log(`⏱️  Uptime: ${uptime}`);
    console.log(`📈 Requests: ${this.sessionMetrics.requestCount}`);
    console.log(`📁 Files Processed: ${this.sessionMetrics.totalFilesProcessed}`);
    console.log(`📊 Total Rows Analyzed: ${this.sessionMetrics.totalRowsAnalyzed.toLocaleString()}`);
    console.log(`⚡ Avg Processing Time: ${avgTime}ms`);
    console.log(`❌ Errors: ${this.sessionMetrics.errorCount}`);
    console.log('='.repeat(60));
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Enhanced logging methods with development context
  info(message, meta = {}) {
    const timestamp = new Date().toISOString();
    const formattedMessage = this.formatDevMessage('INFO', message, meta);
    console.log(formattedMessage);
    this.writeToFile('info', message, meta);
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatDevMessage('WARN', message, meta);
    console.log(formattedMessage);
    this.writeToFile('warn', message, meta);
  }

  error(message, meta = {}) {
    this.sessionMetrics.errorCount++;
    const formattedMessage = this.formatDevMessage('ERROR', message, meta);
    console.log(formattedMessage);
    this.writeToFile('error', message, meta);
  }

  // Special method for profiling requests
  profileRequest(requestId, data) {
    this.sessionMetrics.requestCount++;
    this.sessionMetrics.totalFilesProcessed++;
    
    const message = `🔍 Starting CSV Analysis`;
    const meta = {
      requestId,
      fileSize: data.csv ? `${(data.csv.length / 1024).toFixed(1)}KB` : 'unknown',
      timestamp: new Date().toISOString()
    };
    
    console.log('\n' + '▼'.repeat(60));
    console.log('\x1b[32m%s\x1b[0m', `🚀 NEW REQUEST [${requestId}]`);
    console.log(`📁 File Size: ${meta.fileSize}`);
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    console.log('▼'.repeat(60));
    
    this.writeToFile('profile', message, meta);
  }

  profileComplete(requestId, results, processingTime) {
    this.sessionMetrics.processingTimes.push(processingTime);
    this.sessionMetrics.totalRowsAnalyzed += results.summary?.totalRows || 0;
    
    const message = `✅ CSV Analysis Complete`;
    const meta = {
      requestId,
      processingTime: `${processingTime.toFixed(2)}ms`,
      rowsAnalyzed: results.summary?.totalRows || 0,
      columnsAnalyzed: results.summary?.totalColumns || 0,
      insights: results.insights?.length || 0
    };
    
    console.log('\n' + '▲'.repeat(60));
    console.log('\x1b[32m%s\x1b[0m', `✅ COMPLETED [${requestId}]`);
    console.log(`⚡ Processing Time: ${meta.processingTime}`);
    console.log(`📊 Rows: ${meta.rowsAnalyzed.toLocaleString()} | Columns: ${meta.columnsAnalyzed}`);
    console.log(`💡 Insights Generated: ${meta.insights}`);
    console.log('▲'.repeat(60));
    
    this.writeToFile('profile', message, meta);
    
    // Show updated metrics immediately after processing (but don't repeat automatically)
    if (process.env.SHOW_METRICS_AFTER_REQUEST !== 'false') {
      setTimeout(() => this.updateDashboard(), 100);
    }
  }

  profileError(requestId, error, processingTime) {
    this.sessionMetrics.errorCount++;
    
    const message = `❌ CSV Analysis Failed`;
    const meta = {
      requestId,
      error: error.message,
      processingTime: processingTime ? `${processingTime.toFixed(2)}ms` : 'N/A',
      stack: error.stack
    };
    
    console.log('\n' + '❌'.repeat(60));
    console.log('\x1b[31m%s\x1b[0m', `💥 FAILED [${requestId}]`);
    console.log(`❌ Error: ${error.message}`);
    console.log(`⏱️  Time: ${meta.processingTime}`);
    console.log('❌'.repeat(60));
    
    this.writeToFile('error', message, meta);
  }

  formatDevMessage(level, message, meta) {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    // Only show essential meta data for cleaner logs
    const essentialMeta = {};
    if (meta.requestId) essentialMeta.requestId = meta.requestId;
    if (meta.method && meta.url) essentialMeta.endpoint = `${meta.method} ${meta.url}`;
    if (meta.duration) essentialMeta.duration = meta.duration;
    
    const metaStr = Object.keys(essentialMeta).length ? 
      ` | ${JSON.stringify(essentialMeta, null, 0)}` : '';
    
    return `${colors[level]}[${timestamp}] ${level}: ${message}${metaStr}${colors.reset}`;
  }

  writeToFile(level, message, meta = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
      };
      
      const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }

  // Development helper - show current session stats
  getSessionStats() {
    return {
      ...this.sessionMetrics,
      uptime: Date.now() - this.sessionMetrics.startTime,
      avgProcessingTime: this.sessionMetrics.processingTimes.length > 0
        ? this.sessionMetrics.processingTimes.reduce((a, b) => a + b, 0) / this.sessionMetrics.processingTimes.length
        : 0
    };
  }

  // Manual metrics display for debugging
  showMetrics() {
    this.updateDashboard();
  }
}

module.exports = AdvancedLogger;