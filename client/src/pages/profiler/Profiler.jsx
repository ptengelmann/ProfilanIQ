import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Info, 
  Lightbulb, 
  Database,
  Hash,
  Type,
  Eye,
  Target,
  Zap,
  Download,
  Clock,
  Server,
  CheckCircle,
  Book
} from 'lucide-react';
import styles from './profiler.module.scss';
import DataVisualizations from './components/DataVisualizations';
import InsightsDashboard from './components/InsightsDashboard';
import FileComparisonTool from './components/FileComparisonTool';
import SummaryDashboard from './components/SummaryDashboard';
import FeatureImportanceAnalyzer from './components/FeatureImportanceAnalyzer';
import apiClient from '../../services/apiClient';

const Profiler = () => {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState('distributions');
  const [apiStatus, setApiStatus] = useState(null);

  // Check API health on component mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const healthStatus = await apiClient.checkHealth();
        setApiStatus({
          status: healthStatus.status,
          version: healthStatus.version,
          documentation: healthStatus.documentation
        });
      } catch (err) {
        console.error('API health check failed:', err);
        setApiStatus({
          status: 'unhealthy',
          error: err.message
        });
      }
    };

    checkApiHealth();
  }, []);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setProfile(null);
    setProcessingStats(null);
  };

  const processFileWithBackend = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Read file as text
      const csvText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });

      console.log('Sending CSV to backend...');
      
      // Send to backend using API client
      const startTime = Date.now();
      const response = await apiClient.profileCsv(csvText, {
        skipEmptyLines: true,
        delimiter: '', // Auto-detect
        enableSampling: true,
        useCache: true
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log('Response received');

      if (response.success && response.data) {
        // Safely extract data with defaults
        const profileData = {
          summary: response.data.summary || {},
          columnStats: response.data.columns || {},
          correlations: response.data.correlations || { all: [], positive: [], negative: [] },
          insights: response.data.insights || []
        };

        setProfile(profileData);
        setProcessingStats({
          requestId: response.requestId,
          clientProcessingTime: responseTime,
          serverProcessingTime: response.data.summary?.processingTime || {},
          performance: response.data.summary?.performance || {},
          fromCache: response.fromCache || false,
          sampling: response.data.summary?.sampling || { isSampled: false }
        });
      } else {
        throw new Error(response.message || 'Processing failed - no data returned');
      }

    } catch (err) {
      console.error('Processing error:', err);
      setError(`Failed to process file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export functions
  const exportToJSON = () => {
    if (!profile) return;
    
    const dataStr = JSON.stringify(profile, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.name.replace('.csv', '')}_profile.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!profile || !profile.columnStats) return;
    
    // Create CSV with column statistics
    const headers = ['Column', 'Type', 'Count', 'Missing %', 'Unique', 'Mean', 'Std Dev', 'Min', 'Max'];
    const rows = Object.entries(profile.columnStats).map(([column, stats]) => [
      column,
      stats.type || 'unknown',
      stats.validCount || 0,
      (stats.missingPercent || 0).toFixed(2),
      stats.unique || 0,
      stats.type === 'numeric' ? (stats.mean?.toFixed(3) || 'N/A') : 'N/A',
      stats.type === 'numeric' ? (stats.stdDev?.toFixed(3) || 'N/A') : 'N/A',
      stats.type === 'numeric' ? (stats.min?.toFixed(3) || 'N/A') : 'N/A',
      stats.type === 'numeric' ? (stats.max?.toFixed(3) || 'N/A') : 'N/A'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.name.replace('.csv', '')}_statistics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return 'N/A';
    return num.toFixed(3);
  };

  const getCorrelationColor = (corr) => {
    const intensity = Math.abs(corr);
    if (corr > 0) {
      return `hsl(120, ${intensity * 80}%, ${90 - intensity * 40}%)`;
    } else {
      return `hsl(0, ${intensity * 80}%, ${90 - intensity * 40}%)`;
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={16} />;
      case 'info': return <Info size={16} />;
      case 'insight': return <Lightbulb size={16} />;
      default: return <BarChart3 size={16} />;
    }
  };

  // Safe data access with defaults
  const safeProfile = profile || {};
  const safeSummary = safeProfile.summary || {};
  const safeColumnStats = safeProfile.columnStats || {};
  const safeCorrelations = safeProfile.correlations || { all: [], positive: [], negative: [] };
  const safeInsights = safeProfile.insights || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <BarChart3 size={32} />
        </div>
        <h1>CSV Profiler Pro</h1>
        <p>Advanced data profiling with AI-powered insights</p>
        
        {apiStatus && (
          <div className={styles.apiStatus}>
            <div className={`${styles.statusIndicator} ${styles[apiStatus.status]}`}></div>
            <span>API v{apiStatus.version}</span>
            {apiStatus.documentation && (
              <a href={apiStatus.documentation} target="_blank" rel="noopener noreferrer" className={styles.docsLink}>
                <Book size={14} />
                <span>Documentation</span>
              </a>
            )}
          </div>
        )}
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.fileUpload}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className={styles.fileInput}
          />
          <div className={styles.uploadLabel}>
            <Upload size={48} className={styles.uploadIcon} />
            <p>Drop CSV file here or click to upload</p>
          </div>
        </div>
        
        {file && (
          <div className={styles.fileInfo}>
            <div className={styles.fileDetails}>
              <FileText size={20} />
              <span>Selected: <strong>{file.name}</strong></span>
              <span className={styles.fileSize}>
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button 
              onClick={processFileWithBackend}
              disabled={isProcessing}
              className={styles.analyzeBtn}
            >
              <Zap size={16} />
              {isProcessing ? 'Processing...' : 'Analyze with AI'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertTriangle size={20} className={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      {/* Processing Statistics */}
      {processingStats && (
        <div className={styles.processingStats}>
          <div className={styles.statsHeader}>
            <Server size={16} />
            <span>Processing Statistics</span>
            <span className={styles.requestId}>ID: {processingStats.requestId}</span>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <Clock size={14} />
              <span>Client: {processingStats.clientProcessingTime}ms</span>
            </div>
            <div className={styles.statItem}>
              <Server size={14} />
              <span>Server: {processingStats.serverProcessingTime?.total || 'N/A'}</span>
            </div>
            <div className={styles.statItem}>
              <CheckCircle size={14} />
              <span>Efficiency: {processingStats.performance?.efficiency || 'N/A'}</span>
            </div>
            {processingStats.fromCache && (
              <div className={`${styles.statItem} ${styles.cacheHit}`}>
                <span>Results from cache</span>
              </div>
            )}
            {processingStats.sampling?.isSampled && (
              <div className={`${styles.statItem} ${styles.sampled}`}>
                <span>Data sampled ({processingStats.sampling.samplingRate?.toFixed(2) || ''}×)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {profile && (
        <div className={styles.results}>
          {/* Export Tools */}
          <div className={styles.exportSection}>
            <h3>Export Results</h3>
            <div className={styles.exportButtons}>
              <button onClick={exportToJSON} className={styles.exportBtn}>
                <Download size={16} />
                JSON Report
              </button>
              <button onClick={exportToCSV} className={styles.exportBtn}>
                <Download size={16} />
                CSV Statistics
              </button>
            </div>
          </div>

          {/* Summary Dashboard */}
          {profile && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Database size={20} />
                <h2>Data Overview</h2>
              </div>
              <SummaryDashboard profile={profile} processingStats={processingStats} />
            </div>
          )}

          {/* AI Insights Dashboard */}
          {profile && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Lightbulb size={20} />
                <h2>AI Insights Dashboard</h2>
              </div>
              <InsightsDashboard profile={profile} />
            </div>
          )}

          {/* Data Visualizations */}
          {profile && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <BarChart3 size={20} />
                <h2>Data Visualizations</h2>
              </div>
              <DataVisualizations 
                profile={profile} 
                activeTab={activeVisualizationTab} 
                setActiveTab={setActiveVisualizationTab} 
              />
            </div>
          )}

          {/* Column Statistics */}
          {Object.keys(safeColumnStats).length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Eye size={20} />
                <h2>Column Statistics</h2>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.statsTable}>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Type</th>
                      <th>Count</th>
                      <th>Missing %</th>
                      <th>Unique</th>
                      <th>Statistics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(safeColumnStats).map(([column, stats]) => (
                      <tr key={column}>
                        <td className={styles.columnName}>{column}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[stats.type]}`}>
                            {stats.type === 'numeric' ? <Hash size={12} /> : <Type size={12} />}
                            {stats.type}
                          </span>
                        </td>
                        <td>{stats.validCount || 0}</td>
                        <td className={(stats.missingPercent || 0) > 10 ? styles.highMissing : ''}>
                          {(stats.missingPercent || 0).toFixed(1)}%
                        </td>
                        <td>{stats.unique || 0}</td>
                        <td>
                          {stats.type === 'numeric' ? (
                            <div className={styles.numericStats}>
                              <div>μ: {formatNumber(stats.mean)}</div>
                              <div>σ: {formatNumber(stats.stdDev)}</div>
                              <div>Range: [{formatNumber(stats.min)}, {formatNumber(stats.max)}]</div>
                            </div>
                          ) : (
                            <div className={styles.categoricalStats}>
                              <div>Entropy: {formatNumber(stats.entropy)}</div>
                              {stats.topValues && stats.topValues.length > 0 && (
                                <div>Top: {stats.topValues[0][0]}</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Correlations */}
          {safeCorrelations.all && safeCorrelations.all.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Target size={20} />
                <h2>Correlation Analysis</h2>
              </div>
              
              <div className={styles.correlationGrid}>
                {safeCorrelations.positive && safeCorrelations.positive.length > 0 && (
                  <div className={styles.correlationGroup}>
                    <h3 className={styles.positiveTitle}>
                      <TrendingUp size={16} />
                      Strongest Positive
                    </h3>
                    <div className={styles.correlationList}>
                      {safeCorrelations.positive.map((corr, idx) => (
                        <div key={idx} className={`${styles.correlationItem} ${styles.positive}`}>
                          <span className={styles.correlationPair}>{corr.pair}</span>
                          <span className={styles.correlationValue}>+{formatNumber(corr.correlation)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {safeCorrelations.negative && safeCorrelations.negative.length > 0 && (
                  <div className={styles.correlationGroup}>
                    <h3 className={styles.negativeTitle}>
                      <TrendingDown size={16} />
                      Strongest Negative
                    </h3>
                    <div className={styles.correlationList}>
                      {safeCorrelations.negative.map((corr, idx) => (
                        <div key={idx} className={`${styles.correlationItem} ${styles.negative}`}>
                          <span className={styles.correlationPair}>{corr.pair}</span>
                          <span className={styles.correlationValue}>{formatNumber(corr.correlation)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Correlation Heatmap */}
              {safeCorrelations.all.length > 0 && (
                <div className={styles.heatmapSection}>
                  <h3>Correlation Matrix</h3>
                  <div className={styles.heatmap}>
                    {safeCorrelations.all.slice(0, 10).map((corr, idx) => (
                      <div
                        key={idx}
                        className={styles.heatmapCell}
                        style={{ backgroundColor: getCorrelationColor(corr.correlation) }}
                        title={`${corr.pair}: ${formatNumber(corr.correlation)}`}
                      >
                        <div className={styles.heatmapLabels}>
                          <div>{corr.colA}</div>
                          <div>×</div>
                          <div>{corr.colB}</div>
                        </div>
                        <div className={styles.heatmapValue}>{formatNumber(corr.correlation)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Feature Importance Analyzer */}
      {profile && (
        <div className={styles.section}>
          <FeatureImportanceAnalyzer profile={profile} />
        </div>
      )}

      {/* File Comparison Tool */}
      {profile && (
        <div className={styles.section}>
          <FileComparisonTool currentProfile={profile} />
        </div>
      )}
    </div>
  );
};

export default Profiler;