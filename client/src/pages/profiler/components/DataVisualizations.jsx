import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart3, 
  Grid, 
  Network, 
  LayoutGrid, 
  CircleDot,
  Brain,
  Zap,
  Activity,
  Cpu,
  Eye,
  Target,
  Layers,
  TrendingUp,
  Sparkles,
  Database,
  GitBranch,
  Atom,
  Workflow,
  LineChart,
  PieChart,
  Scatter,
  BarChart,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Gauge,
  Lightbulb,
} from 'lucide-react';
import Chart from 'chart.js/auto';
import styles from '../profiler.module.scss';

// Advanced ML-based Chart Configuration Generator
class ChartConfigurationAI {
  constructor() {
    this.colorPalettes = {
      neural: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
      quantum: ['#a8edea', '#fed6e3', '#d299c2', '#fef9d7', '#7209b7', '#2196f3'],
      cyber: ['#00d4ff', '#091e3a', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
      matrix: ['#0f3460', '#16537e', '#533a7b', '#4a47a3', '#6a4c93', '#c06c84']
    };
    
    this.chartThemes = {
      distribution: 'neural',
      correlation: 'quantum', 
      missing: 'cyber',
      outliers: 'matrix'
    };
  }

  generateAdvancedConfig(type, data, options = {}) {
    const theme = this.chartThemes[type] || 'neural';
    const colors = this.colorPalettes[theme];
    
    const baseConfig = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 2000,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: '600',
              family: "'Inter', sans-serif"
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 35, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#a5b4fc',
          borderColor: 'rgba(102, 126, 234, 0.3)',
          borderWidth: 1,
          cornerRadius: 12,
          displayColors: false,
          titleFont: {
            size: 14,
            weight: '600'
          },
          bodyFont: {
            size: 12,
            weight: '500'
          },
          padding: 12
        }
      },
      scales: this.generateScales(type, colors[0]),
      ...options
    };

    return this.enhanceConfigForType(type, baseConfig, colors, data);
  }

  generateScales(type, primaryColor) {
    const baseScale = {
      grid: {
        color: 'rgba(102, 126, 234, 0.1)',
        lineWidth: 1
      },
      ticks: {
        font: {
          size: 11,
          weight: '500',
          family: "'Inter', sans-serif"
        },
        color: '#64748b'
      },
      title: {
        display: true,
        font: {
          size: 12,
          weight: '600'
        },
        color: '#0f0f23'
      }
    };

    if (type === 'correlation') {
      return {
        x: {
          ...baseScale,
          type: 'category',
          position: 'top',
          ticks: {
            ...baseScale.ticks,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          ...baseScale,
          type: 'category',
          reverse: true
        }
      };
    }

    return {
      x: {
        ...baseScale,
        title: {
          ...baseScale.title,
          text: 'Features'
        }
      },
      y: {
        ...baseScale,
        beginAtZero: true,
        title: {
          ...baseScale.title,
          text: 'Values'
        }
      }
    };
  }

  enhanceConfigForType(type, config, colors, data) {
    switch (type) {
      case 'distribution':
        return {
          ...config,
          type: 'line',
          plugins: {
            ...config.plugins,
            title: {
              display: true,
              text: 'AI-Powered Distribution Analysis',
              font: {
                size: 16,
                weight: '700'
              },
              color: '#0f0f23'
            }
          }
        };
        
      case 'correlation':
        return {
          ...config,
          type: 'scatter',
          plugins: {
            ...config.plugins,
            title: {
              display: true,
              text: 'Neural Correlation Matrix',
              font: {
                size: 16,
                weight: '700'
              },
              color: '#0f0f23'
            },
            legend: {
              display: false
            }
          }
        };
        
      case 'missing':
        return {
          ...config,
          type: 'bar',
          indexAxis: 'y',
          plugins: {
            ...config.plugins,
            title: {
              display: true,
              text: 'Data Quality Assessment',
              font: {
                size: 16,
                weight: '700'
              },
              color: '#0f0f23'
            }
          },
          scales: {
            ...config.scales,
            x: {
              ...config.scales.x,
              max: 100,
              title: {
                ...config.scales.x.title,
                text: 'Missing Values (%)'
              }
            }
          }
        };
        
      case 'outliers':
        return {
          ...config,
          type: 'bar',
          plugins: {
            ...config.plugins,
            title: {
              display: true,
              text: 'Statistical Outlier Detection',
              font: {
                size: 16,
                weight: '700'
              },
              color: '#0f0f23'
            }
          }
        };
        
      default:
        return config;
    }
  }
}

// Advanced Data Processing Engine
class DataVisualizationEngine {
  constructor(columnStats, correlations) {
    this.columnStats = columnStats;
    this.correlations = correlations;
    this.configAI = new ChartConfigurationAI();
  }

  generateDistributionData() {
    const numericColumns = Object.entries(this.columnStats)
      .filter(([name, stats]) => stats.type === 'numeric')
      .slice(0, 6);
    
    if (numericColumns.length === 0) return null;

    const datasets = numericColumns.map(([colName, stats], index) => {
      const bins = this.generateHistogramBins(stats);
      const colors = this.configAI.colorPalettes.neural;
      
      return {
        label: colName,
        data: bins,
        backgroundColor: `${colors[index % colors.length]}33`,
        borderColor: colors[index % colors.length],
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors[index % colors.length],
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });

    return { datasets };
  }

  generateHistogramBins(stats, binCount = 15) {
    const { min, max, mean, stdDev, validCount } = stats;
    const range = max - min;
    const step = range / binCount;
    
    // Generate normal distribution approximation
    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const x = min + i * step + step / 2;
      const normalizedX = (x - mean) / stdDev;
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
                Math.exp(-0.5 * normalizedX * normalizedX);
      
      bins.push({
        x: x,
        y: y * validCount * step // Scale to approximate count
      });
    }
    
    return bins;
  }

  generateCorrelationData() {
    if (!this.correlations.all || this.correlations.all.length === 0) return null;

    const topCorrelations = this.correlations.all.slice(0, 20);
    const columns = [...new Set(
      topCorrelations.flatMap(corr => [corr.colA, corr.colB])
    )];

    const data = [];
    const colors = this.configAI.colorPalettes.quantum;
    
    topCorrelations.forEach((corr, index) => {
      const colorIntensity = Math.abs(corr.correlation);
      const baseColor = corr.correlation > 0 ? colors[1] : colors[4];
      
      data.push({
        x: corr.colA,
        y: corr.colB,
        v: corr.correlation,
        backgroundColor: `${baseColor}${Math.round(colorIntensity * 255).toString(16).padStart(2, '0')}`,
        borderColor: baseColor,
        pointRadius: Math.abs(corr.correlation) * 20 + 5,
        pointHoverRadius: Math.abs(corr.correlation) * 25 + 8
      });
    });

    return {
      datasets: [{
        label: 'Correlations',
        data: data,
        backgroundColor: data.map(d => d.backgroundColor),
        borderColor: data.map(d => d.borderColor),
        pointRadius: data.map(d => d.pointRadius),
        pointHoverRadius: data.map(d => d.pointHoverRadius),
        borderWidth: 2
      }]
    };
  }

  generateMissingDataVisualization() {
    const columns = Object.keys(this.columnStats);
    const missingData = columns.map(col => ({
      column: col,
      missing: this.columnStats[col].missingPercent || 0,
      total: this.columnStats[col].totalCount || 0,
      missingCount: this.columnStats[col].missingCount || 0
    })).sort((a, b) => b.missing - a.missing);

    const colors = this.configAI.colorPalettes.cyber;
    
    return {
      labels: missingData.map(d => d.column),
      datasets: [{
        label: 'Missing Values %',
        data: missingData.map(d => d.missing),
        backgroundColor: missingData.map(d => {
          if (d.missing > 30) return `${colors[2]}CC`;
          if (d.missing > 10) return `${colors[3]}CC`;
          if (d.missing > 5) return `${colors[4]}CC`;
          return `${colors[5]}CC`;
        }),
        borderColor: missingData.map(d => {
          if (d.missing > 30) return colors[2];
          if (d.missing > 10) return colors[3];
          if (d.missing > 5) return colors[4];
          return colors[5];
        }),
        borderWidth: 2,
        borderRadius: 8,
        missingData: missingData // Store for tooltips
      }]
    };
  }

  generateOutlierVisualization() {
    const numericColumns = Object.entries(this.columnStats)
      .filter(([name, stats]) => stats.type === 'numeric' && stats.outliers > 0)
      .sort((a, b) => b[1].outliers - a[1].outliers)
      .slice(0, 10);

    if (numericColumns.length === 0) return null;

    const colors = this.configAI.colorPalettes.matrix;
    const labels = numericColumns.map(([name]) => name);
    
    return {
      labels,
      datasets: [
        {
          label: 'Normal Range',
          data: numericColumns.map(([name, stats]) => stats.q3 - stats.q1),
          backgroundColor: `${colors[0]}66`,
          borderColor: colors[0],
          borderWidth: 2
        },
        {
          label: 'Outlier Count',
          type: 'line',
          data: numericColumns.map(([name, stats]) => stats.outliers),
          backgroundColor: colors[4],
          borderColor: colors[4],
          borderWidth: 3,
          pointBackgroundColor: colors[4],
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          yAxisID: 'y1'
        }
      ]
    };
  }
}

const DataVisualizations = ({ profile, activeTab, setActiveTab }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [visualizationProgress, setVisualizationProgress] = useState(0);
  const [neuralActivity, setNeuralActivity] = useState(0);
  const [visibleCharts, setVisibleCharts] = useState(0);
  const [analysisPhase, setAnalysisPhase] = useState('initializing');
  
  // Chart refs
  const distributionChartRef = useRef(null);
  const correlationChartRef = useRef(null);
  const missingDataChartRef = useRef(null);
  const outlierChartRef = useRef(null);
  
  const distributionChart = useRef(null);
  const correlationChart = useRef(null);
  const missingDataChart = useRef(null);
  const outlierChart = useRef(null);

  // Safe data access
  const safeColumnStats = profile?.columnStats || {};
  const safeCorrelations = profile?.correlations || { all: [], positive: [], negative: [] };
  
  // Data processing engine
  const dataEngine = useMemo(() => {
    return new DataVisualizationEngine(safeColumnStats, safeCorrelations);
  }, [safeColumnStats, safeCorrelations]);

  // Advanced tab configuration
  const visualizationTabs = [
    {
      id: 'distributions',
      label: 'Neural Distributions',
      icon: <LineChart size={16} />,
      algorithm: 'Gaussian Analysis',
      description: 'ML-powered distribution modeling',
      color: '#667eea'
    },
    {
      id: 'correlations',
      label: 'Quantum Correlations',
      icon: <Network size={16} />,
      algorithm: 'Pearson Matrix',
      description: 'Advanced relationship mapping',
      color: '#764ba2'
    },
    {
      id: 'missing',
      label: 'Data Integrity',
      icon: <Shield size={16} />,
      algorithm: 'Quality Assessment',
      description: 'Missing value analysis',
      color: '#4facfe'
    },
    {
      id: 'outliers',
      label: 'Anomaly Detection',
      icon: <Target size={16} />,
      algorithm: 'Statistical Bounds',
      description: 'Outlier identification',
      color: '#f5576c'
    }
  ];

  // Enhanced tab switching with ML processing simulation
  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;
    
    setIsProcessing(true);
    setVisualizationProgress(0);
    setAnalysisPhase('initializing');
    
    // Simulate AI processing phases
    const phases = ['loading_data', 'preprocessing', 'feature_extraction', 'visualization_generation', 'optimization', 'complete'];
    let currentPhase = 0;
    
    const phaseInterval = setInterval(() => {
      if (currentPhase < phases.length - 1) {
        currentPhase++;
        setAnalysisPhase(phases[currentPhase]);
      }
    }, 300);
    
    const progressInterval = setInterval(() => {
      setVisualizationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(phaseInterval);
          setIsProcessing(false);
          setActiveTab(tabId);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 100);
  };

  // Neural activity animation
  useEffect(() => {
    const neuralTimer = setInterval(() => {
      setNeuralActivity(prev => (prev + 1) % 100);
    }, 150);

    return () => clearInterval(neuralTimer);
  }, []);

  // Chart visibility animation
  useEffect(() => {
    const visibilityTimer = setInterval(() => {
      setVisibleCharts(prev => (prev >= 4 ? 4 : prev + 1));
    }, 200);

    return () => clearInterval(visibilityTimer);
  }, []);

  // Distribution Chart
  useEffect(() => {
    if (activeTab === 'distributions' && distributionChartRef.current && !isProcessing) {
      const chartData = dataEngine.generateDistributionData();
      if (!chartData) return;

      if (distributionChart.current) {
        distributionChart.current.destroy();
      }

      const config = dataEngine.configAI.generateAdvancedConfig('distribution', chartData);
      
      distributionChart.current = new Chart(distributionChartRef.current, {
        ...config,
        data: chartData
      });
    }

    return () => {
      if (distributionChart.current) {
        distributionChart.current.destroy();
        distributionChart.current = null;
      }
    };
  }, [activeTab, dataEngine, isProcessing]);

  // Correlation Chart
  useEffect(() => {
    if (activeTab === 'correlations' && correlationChartRef.current && !isProcessing) {
      const chartData = dataEngine.generateCorrelationData();
      if (!chartData) return;

      if (correlationChart.current) {
        correlationChart.current.destroy();
      }

      const config = dataEngine.configAI.generateAdvancedConfig('correlation', chartData, {
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const point = context.raw;
                return `${point.x} ↔ ${point.y}: ${point.v.toFixed(3)}`;
              }
            }
          }
        }
      });

      correlationChart.current = new Chart(correlationChartRef.current, {
        ...config,
        data: chartData
      });
    }

    return () => {
      if (correlationChart.current) {
        correlationChart.current.destroy();
        correlationChart.current = null;
      }
    };
  }, [activeTab, dataEngine, isProcessing]);

  // Missing Data Chart
  useEffect(() => {
    if (activeTab === 'missing' && missingDataChartRef.current && !isProcessing) {
      const chartData = dataEngine.generateMissingDataVisualization();
      if (!chartData) return;

      if (missingDataChart.current) {
        missingDataChart.current.destroy();
      }

      const config = dataEngine.configAI.generateAdvancedConfig('missing', chartData, {
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const missingData = context.dataset.missingData[context.dataIndex];
                return [
                  `Missing: ${context.raw.toFixed(1)}%`,
                  `Count: ${missingData.missingCount} of ${missingData.total}`
                ];
              }
            }
          }
        }
      });

      missingDataChart.current = new Chart(missingDataChartRef.current, {
        ...config,
        data: chartData
      });
    }

    return () => {
      if (missingDataChart.current) {
        missingDataChart.current.destroy();
        missingDataChart.current = null;
      }
    };
  }, [activeTab, dataEngine, isProcessing]);

  // Outlier Chart
  useEffect(() => {
    if (activeTab === 'outliers' && outlierChartRef.current && !isProcessing) {
      const chartData = dataEngine.generateOutlierVisualization();
      if (!chartData) return;

      if (outlierChart.current) {
        outlierChart.current.destroy();
      }

      const config = dataEngine.configAI.generateAdvancedConfig('outliers', chartData, {
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'IQR Range'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Outlier Count'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      });

      outlierChart.current = new Chart(outlierChartRef.current, {
        ...config,
        data: chartData
      });
    }

    return () => {
      if (outlierChart.current) {
        outlierChart.current.destroy();
        outlierChart.current = null;
      }
    };
  }, [activeTab, dataEngine, isProcessing]);

  // Calculate visualization metrics
  const visualizationMetrics = useMemo(() => {
    const numericColumns = Object.values(safeColumnStats).filter(s => s.type === 'numeric').length;
    const correlationCount = safeCorrelations.all?.length || 0;
    const missingDataColumns = Object.values(safeColumnStats).filter(s => (s.missingPercent || 0) > 0).length;
    const outlierColumns = Object.values(safeColumnStats).filter(s => (s.outliers || 0) > 0).length;

    return {
      distributions: numericColumns,
      correlations: correlationCount,
      missing: missingDataColumns,
      outliers: outlierColumns
    };
  }, [safeColumnStats, safeCorrelations]);

  if (!profile) {
    return (
      <div className={styles.neuralVisualizationDashboard}>
        <div className={styles.visualizationLoadingState}>
          <Brain size={48} />
          <p>Initializing Visualization Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.neuralVisualizationDashboard}>
      {/* Neural Background Effects */}
      <div className={styles.visualizationBackground}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i} 
            className={styles.neuralNode}
            style={{
              '--delay': `${i * 0.4}s`,
              '--duration': `${3 + i * 0.2}s`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`
            }}
          ></div>
        ))}
      </div>

      {/* Advanced Visualization Header */}
      <div className={styles.visualizationHeader}>
        <div className={styles.headerGlow}></div>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <BarChart3 size={24} />
            <div className={styles.iconOrbit}></div>
          </div>
          <div className={styles.headerText}>
            <h3>Neural Visualization Engine</h3>
            <div className={styles.headerBadge}>
              <Sparkles size={12} />
              <span>AI-Powered Analytics</span>
            </div>
          </div>
          <div className={styles.neuralActivityMonitor}>
            <div className={styles.activityLabel}>Neural Activity</div>
            <div className={styles.brainwaveContainer}>
              <div className={styles.brainwave} style={{ '--activity': `${neuralActivity}%` }}>
                <div className={styles.neuralWave}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Processing Status */}
      {isProcessing && (
        <div className={styles.aiVisualizationStatus}>
          <div className={styles.processingHeader}>
            <div className={styles.processingOrb}>
              <Brain size={16} />
              <div className={styles.orbPulse}></div>
            </div>
            <span>Processing: {analysisPhase.replace(/_/g, ' ').toUpperCase()}</span>
            <span className={styles.progressPercent}>{Math.round(visualizationProgress)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${visualizationProgress}%` }}
            >
              <div className={styles.progressGlow}></div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Neural Tabs */}
      <div className={styles.neuralVisualizationTabs}>
        {visualizationTabs.map((tab, index) => (
          <button 
            key={tab.id}
            className={`${styles.neuralTabButton} ${activeTab === tab.id ? styles.active : ''} ${
              visibleCharts > index ? styles.visible : ''
            }`}
            onClick={() => handleTabChange(tab.id)}
            style={{ '--tab-color': tab.color, '--delay': `${index * 100}ms` }}
          >
            <div className={styles.tabIcon}>{tab.icon}</div>
            <div className={styles.tabContent}>
              <span className={styles.tabLabel}>{tab.label}</span>
              <span className={styles.tabAlgorithm}>{tab.algorithm}</span>
              <span className={styles.tabDescription}>{tab.description}</span>
            </div>
            <div className={styles.tabMetric}>
              <span className={styles.metricValue}>{visualizationMetrics[tab.id]}</span>
              <span className={styles.metricLabel}>Items</span>
            </div>
            <div className={styles.tabGlow}></div>
            <div className={styles.tabPulse}></div>
          </button>
        ))}
      </div>

      {/* Enhanced Chart Container */}
      <div className={styles.neuralChartContainer}>
        <div className={styles.chartHeader}>
          <div className={styles.chartIcon}>
            {visualizationTabs.find(t => t.id === activeTab)?.icon}
          </div>
          <div className={styles.chartInfo}>
            <h4>{visualizationTabs.find(t => t.id === activeTab)?.label || 'Visualization'}</h4>
            <div className={styles.chartBadge}>
              <Cpu size={12} />
              <span>{visualizationTabs.find(t => t.id === activeTab)?.algorithm}</span>
            </div>
          </div>
          <div className={styles.chartMetrics}>
            <div className={styles.metricItem}>
              <Activity size={14} />
              <span>Real-time</span>
            </div>
            <div className={styles.metricItem}>
              <Database size={14} />
              <span>{visualizationMetrics[activeTab]} Features</span>
            </div>
          </div>
        </div>
        
        <div className={styles.chartCanvas}>
          {activeTab === 'distributions' && (
            <canvas ref={distributionChartRef}></canvas>
          )}
          
          {activeTab === 'correlations' && (
            <canvas ref={correlationChartRef}></canvas>
          )}
          
          {activeTab === 'missing' && (
            <canvas ref={missingDataChartRef}></canvas>
          )}
          
          {activeTab === 'outliers' && (
            <canvas ref={outlierChartRef}></canvas>
          )}
        </div>

        {/* Chart Insights Panel */}
        <div className={styles.chartInsights}>
          <div className={styles.insightsHeader}>
            <Lightbulb size={16} />
            <span>AI Insights</span>
          </div>
          <div className={styles.insightsList}>
            {activeTab === 'distributions' && (
              <div className={styles.insightItem}>
                <CheckCircle size={14} />
                <span>Detected {Object.values(safeColumnStats).filter(s => s.type === 'numeric').length} numeric distributions for analysis</span>
              </div>
            )}
            {activeTab === 'correlations' && (
              <div className={styles.insightItem}>
                <TrendingUp size={14} />
                <span>Found {safeCorrelations.all?.length || 0} statistical relationships in dataset</span>
              </div>
            )}
            {activeTab === 'missing' && (
              <div className={styles.insightItem}>
                <Shield size={14} />
                <span>Data quality assessment across {Object.keys(safeColumnStats).length} features</span>
              </div>
            )}
            {activeTab === 'outliers' && (
              <div className={styles.insightItem}>
                <Target size={14} />
                <span>Anomaly detection using statistical boundaries and IQR methods</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visualization Performance Panel */}
      <div className={styles.visualizationPerformance}>
        <div className={styles.performanceHeader}>
          <Gauge size={18} />
          <h4>Visualization Performance</h4>
        </div>
        <div className={styles.performanceMetrics}>
          <div className={styles.performanceCard}>
            <div className={styles.cardIcon}>
              <Zap size={16} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>Real-time</span>
              <span className={styles.cardLabel}>Rendering Speed</span>
            </div>
          </div>
          <div className={styles.performanceCard}>
            <div className={styles.cardIcon}>
              <Eye size={16} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{Object.keys(safeColumnStats).length}</span>
              <span className={styles.cardLabel}>Features Visualized</span>
            </div>
          </div>
          <div className={styles.performanceCard}>
            <div className={styles.cardIcon}>
              <Brain size={16} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>Active</span>
              <span className={styles.cardLabel}>AI Enhancement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualizations;