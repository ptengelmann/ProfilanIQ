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
  Book,
  Cpu,
  Brain,
  Sparkles,
  Shield,
  Activity,
  Layers
} from 'lucide-react';
import styles from './profiler.module.scss';
import DataVisualizations from './components/DataVisualizations';
import InsightsDashboard from './components/InsightsDashboard';
import FileComparisonTool from './components/FileComparisonTool';
import SummaryDashboard from './components/SummaryDashboard';
import FeatureImportanceAnalyzer from './components/FeatureImportanceAnalyzer';
import AdvancedStatistics from './components/AdvancedStatistics';        
import DataExportReporting from './components/DataExportReporting'; 
import apiClient from '../../services/apiClient';

const Profiler = () => {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState('distributions');
  const [apiStatus, setApiStatus] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

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

  // Simulate analysis progress
  useEffect(() => {
    let progressInterval;
    if (isProcessing) {
      setAnalysisProgress(0);
      progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
    } else {
      setAnalysisProgress(0);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isProcessing]);

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
        // Complete the progress bar
        setAnalysisProgress(100);
        
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

  // Export functions (keeping existing functionality)
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
      {/* Futuristic animated background */}
      <div className={styles.backgroundGrid}></div>
      <div className={styles.floatingParticles}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{
            '--delay': `${i * 0.5}s`,
            '--duration': `${3 + i * 0.2}s`
          }}></div>
        ))}
      </div>

      {/* Premium Header */}
      <div className={styles.premiumHeader}>
        <div className={styles.headerGlow}></div>
        <div className={styles.headerContent}>
          <div className={styles.logoSection}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <Brain size={40} />
                <div className={styles.logoOrbit}></div>
              </div>
              <div className={styles.logoText}>
                <h1>CSV Profiler <span className={styles.pro}>Pro</span></h1>
                <p className={styles.tagline}>
                  <Sparkles size={14} />
                  Next-Generation Data Intelligence Platform
                </p>
              </div>
            </div>
          </div>

          {/* Real-time System Status */}
          <div className={styles.systemStatus}>
            <div className={styles.statusCard}>
              <div className={styles.statusIndicator}>
                <div className={`${styles.pulseRing} ${styles[apiStatus?.status || 'loading']}`}></div>
                <Activity size={16} />
              </div>
              <div className={styles.statusInfo}>
                <span className={styles.statusLabel}>System Status</span>
                <span className={styles.statusValue}>
                  {apiStatus?.status === 'healthy' ? 'Optimal' : 'Connecting...'}
                </span>
              </div>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusIndicator}>
                <Cpu size={16} />
              </div>
              <div className={styles.statusInfo}>
                <span className={styles.statusLabel}>AI Engine</span>
                <span className={styles.statusValue}>v{apiStatus?.version || '2.1.0'}</span>
              </div>
            </div>

            {apiStatus?.documentation && (
              <a href={apiStatus.documentation} target="_blank" rel="noopener noreferrer" 
                 className={styles.docsButton}>
                <Book size={14} />
                <span>Docs</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Upload Zone */}
      <div className={styles.uploadZone}>
        <div className={styles.uploadCard}>
          <div className={styles.uploadHeader}>
            <Shield size={20} />
            <span>Secure Data Upload</span>
            <div className={styles.encryptionBadge}>
              <span>256-bit Encrypted</span>
            </div>
          </div>

          <div className={styles.dropZone}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              className={styles.fileInput}
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className={styles.uploadArea}>
              <div className={styles.uploadVisual}>
                <div className={styles.uploadIcon}>
                  <Upload size={48} />
                  <div className={styles.uploadRipple}></div>
                </div>
                <div className={styles.uploadText}>
                  <h3>Drop your CSV file here</h3>
                  <p>or click to browse • Max file size: 50MB</p>
                </div>
              </div>
              
              <div className={styles.uploadSpecs}>
                <div className={styles.specItem}>
                  <Database size={16} />
                  <span>Supports all CSV formats</span>
                </div>
                <div className={styles.specItem}>
                  <Zap size={16} />
                  <span>Real-time processing</span>
                </div>
                <div className={styles.specItem}>
                  <Layers size={16} />
                  <span>Smart sampling for large datasets</span>
                </div>
              </div>
            </label>
          </div>

          {file && (
            <div className={styles.filePreview}>
              <div className={styles.fileInfo}>
                <div className={styles.fileIcon}>
                  <FileText size={24} />
                </div>
                <div className={styles.fileDetails}>
                  <h4>{file.name}</h4>
                  <p>{(file.size / 1024).toFixed(1)} KB • Ready for analysis</p>
                </div>
                <div className={styles.fileActions}>
                  <button 
                    onClick={processFileWithBackend}
                    disabled={isProcessing}
                    className={styles.analyzeButton}
                  >
                    <Brain size={18} />
                    <span>{isProcessing ? 'Analyzing...' : 'Start AI Analysis'}</span>
                    <div className={styles.buttonGlow}></div>
                  </button>
                </div>
              </div>

              {isProcessing && (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <Cpu size={16} />
                    <span>AI Processing Pipeline</span>
                    <span className={styles.progressPercent}>{Math.round(analysisProgress)}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${analysisProgress}%` }}
                    ></div>
                    <div className={styles.progressGlow}></div>
                  </div>
                  <div className={styles.processingSteps}>
                    <div className={styles.step}>Parsing structure</div>
                    <div className={styles.step}>Statistical analysis</div>
                    <div className={styles.step}>Pattern recognition</div>
                    <div className={styles.step}>Generating insights</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorAlert}>
          <div className={styles.errorContent}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Processing Statistics */}
      {processingStats && (
        <div className={styles.statsPanel}>
          <div className={styles.statsHeader}>
            <div className={styles.statsTitle}>
              <Server size={18} />
              <span>Processing Metrics</span>
            </div>
            <div className={styles.requestBadge}>
              ID: {processingStats.requestId}
            </div>
          </div>
          
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Clock size={16} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Client Time</span>
                <span className={styles.statValue}>{processingStats.clientProcessingTime}ms</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Server size={16} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Server Time</span>
                <span className={styles.statValue}>{processingStats.serverProcessingTime?.total || 'N/A'}</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <CheckCircle size={16} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Efficiency</span>
                <span className={styles.statValue}>{processingStats.performance?.efficiency || 'N/A'}</span>
              </div>
            </div>

            {processingStats.fromCache && (
              <div className={`${styles.statCard} ${styles.cacheHit}`}>
                <div className={styles.statIcon}>
                  <Database size={16} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Cache Hit</span>
                  <span className={styles.statValue}>Optimized</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Analysis Results */}
      {profile && (
        <div className={styles.analysisResults}>
          {/* Quick Actions Bar */}
          <div className={styles.actionsBar}>
            <h2 className={styles.resultsTitle}>
              <Brain size={24} />
              Analysis Complete
            </h2>
            <div className={styles.quickActions}>
              <button onClick={exportToJSON} className={styles.actionButton}>
                <Download size={16} />
                <span>Export JSON</span>
              </button>
              <button onClick={exportToCSV} className={styles.actionButton}>
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Enhanced Content Sections */}
          <div className={styles.contentGrid}>
            {/* Summary Dashboard */}
            <div className={styles.premiumSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Database size={20} />
                </div>
                <h3>Data Overview</h3>
                <div className={styles.sectionBadge}>Primary</div>
              </div>
              <SummaryDashboard profile={profile} processingStats={processingStats} />
            </div>

            {/* AI Insights */}
            <div className={styles.premiumSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Lightbulb size={20} />
                </div>
                <h3>AI Insights</h3>
                <div className={styles.sectionBadge}>AI-Powered</div>
              </div>
              <InsightsDashboard profile={profile} />
            </div>

            {/* Data Visualizations */}
            <div className={styles.premiumSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <BarChart3 size={20} />
                </div>
                <h3>Interactive Analytics</h3>
                <div className={styles.sectionBadge}>Dynamic</div>
              </div>
              <DataVisualizations 
                profile={profile} 
                activeTab={activeVisualizationTab} 
                setActiveTab={setActiveVisualizationTab} 
              />
            </div>

            {/* Column Statistics */}
            {Object.keys(safeColumnStats).length > 0 && (
              <div className={styles.premiumSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Eye size={20} />
                  </div>
                  <h3>Statistical Analysis</h3>
                  <div className={styles.sectionBadge}>Detailed</div>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.dataTable}>
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
                            <span className={`${styles.typeBadge} ${styles[stats.type]}`}>
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
                              <div className={styles.statsGrid}>
                                <div>μ: {formatNumber(stats.mean)}</div>
                                <div>σ: {formatNumber(stats.stdDev)}</div>
                                <div>Range: [{formatNumber(stats.min)}, {formatNumber(stats.max)}]</div>
                              </div>
                            ) : (
                              <div className={styles.statsGrid}>
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
              <div className={styles.premiumSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Target size={20} />
                  </div>
                  <h3>Correlation Analysis</h3>
                  <div className={styles.sectionBadge}>Advanced</div>
                </div>
                
                <div className={styles.correlationDashboard}>
                  {safeCorrelations.positive && safeCorrelations.positive.length > 0 && (
                    <div className={styles.correlationPanel}>
                      <h4 className={styles.correlationTitle}>
                        <TrendingUp size={16} />
                        Strongest Positive
                      </h4>
                      <div className={styles.correlationList}>
                        {safeCorrelations.positive.map((corr, idx) => (
                          <div key={idx} className={`${styles.correlationCard} ${styles.positive}`}>
                            <span className={styles.pairName}>{corr.pair}</span>
                            <span className={styles.correlationValue}>+{formatNumber(corr.correlation)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {safeCorrelations.negative && safeCorrelations.negative.length > 0 && (
                    <div className={styles.correlationPanel}>
                      <h4 className={styles.correlationTitle}>
                        <TrendingDown size={16} />
                        Strongest Negative
                      </h4>
                      <div className={styles.correlationList}>
                        {safeCorrelations.negative.map((corr, idx) => (
                          <div key={idx} className={`${styles.correlationCard} ${styles.negative}`}>
                            <span className={styles.pairName}>{corr.pair}</span>
                            <span className={styles.correlationValue}>{formatNumber(corr.correlation)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Heatmap */}
                {safeCorrelations.all.length > 0 && (
                  <div className={styles.heatmapContainer}>
                    <h4>Correlation Matrix</h4>
                    <div className={styles.heatmapGrid}>
                      {safeCorrelations.all.slice(0, 10).map((corr, idx) => (
                        <div
                          key={idx}
                          className={styles.heatmapTile}
                          style={{ 
                            backgroundColor: getCorrelationColor(corr.correlation),
                            '--intensity': Math.abs(corr.correlation)
                          }}
                          title={`${corr.pair}: ${formatNumber(corr.correlation)}`}
                        >
                          <div className={styles.tileLabels}>
                            <div>{corr.colA}</div>
                            <div className={styles.separator}>×</div>
                            <div>{corr.colB}</div>
                          </div>
                          <div className={styles.tileValue}>{formatNumber(corr.correlation)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Components */}
      {profile && (
        <>
          <AdvancedStatistics profile={profile} />
          <DataExportReporting profile={profile} processingStats={processingStats} />
          
          <div className={styles.premiumSection}>
            <FeatureImportanceAnalyzer profile={profile} />
          </div>

          <div className={styles.premiumSection}>
            <FileComparisonTool currentProfile={profile} />
          </div>
        </>
      )}
    </div>
  );
};

export default Profiler;