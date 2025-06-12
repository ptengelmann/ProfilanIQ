import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  Hash, 
  Type, 
  AlertTriangle, 
  Check, 
  BarChart3,
  Clock,
  Cpu,
  Zap,
  Activity,
  TrendingUp,
  Shield,
  Brain,
  Gauge,
  Eye,
  Target,
  Layers
} from 'lucide-react';
import styles from '../profiler.module.scss';

const SummaryDashboard = ({ profile, processingStats }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [visibleCards, setVisibleCards] = useState(0);

  // Animation effects - MOVED TO TOP BEFORE ANY RETURN
  useEffect(() => {
    if (!profile) return; // Exit early if no profile
    
    const progressTimer = setInterval(() => {
      setAnimationProgress(prev => (prev >= 100 ? 100 : prev + 2));
    }, 50);

    const cardTimer = setInterval(() => {
      setVisibleCards(prev => (prev >= 4 ? 4 : prev + 1));
    }, 200);

    return () => {
      clearInterval(progressTimer);
      clearInterval(cardTimer);
    };
  }, [profile]); // Add profile as dependency

  // NOW safe to return early
  if (!profile) return null;
  
  // Safe data access
  const safeSummary = profile.summary || {};
  const safeColumnStats = profile.columnStats || {};
  
  // Calculate various metrics
  const totalRows = safeSummary.totalRows || 0;
  const totalColumns = safeSummary.totalColumns || 0;
  const numericColumns = safeSummary.numericColumns || 0;
  const categoricalColumns = totalColumns - numericColumns;
  const totalMissingValues = safeSummary.totalMissingValues || 0;
  const missingPercent = totalRows && totalColumns ? 
    (totalMissingValues / (totalRows * totalColumns) * 100).toFixed(1) : 0;

  // Calculate data quality score
  const dataQualityScore = () => {
    let score = 100;
    score -= missingPercent * 2; // Penalty for missing values
    if (numericColumns === 0 || categoricalColumns === 0) score -= 15; // Penalty for imbalanced types
    return Math.max(0, Math.min(100, score));
  };

  const qualityScore = dataQualityScore();
  
  // Get column with most missing values
  const columnsWithMissingValues = Object.entries(safeColumnStats)
    .filter(([name, stats]) => stats.missingCount > 0)
    .sort((a, b) => b[1].missingCount - a[1].missingCount);
  
  const worstColumn = columnsWithMissingValues[0];
  
  // Enhanced quality checks with scoring
  const qualityChecks = [
    {
      name: 'Data Integrity',
      status: missingPercent < 5 ? 'excellent' : missingPercent < 15 ? 'good' : missingPercent < 30 ? 'warning' : 'critical',
      score: Math.max(0, 100 - (missingPercent * 3)),
      message: missingPercent < 5 ? 'Excellent data quality' : 
               missingPercent < 15 ? 'Good data quality' :
               missingPercent < 30 ? 'Moderate quality issues' : 'Critical quality issues',
      icon: missingPercent < 5 ? <Shield size={16} /> : missingPercent < 15 ? <Check size={16} /> : <AlertTriangle size={16} />,
      detail: `${missingPercent}% missing values`
    },
    {
      name: 'Feature Diversity',
      status: numericColumns > 0 && categoricalColumns > 0 ? 'excellent' : 'warning',
      score: numericColumns > 0 && categoricalColumns > 0 ? 95 : 60,
      message: numericColumns > 0 && categoricalColumns > 0 ? 
               'Optimal feature mix' : 
               numericColumns === 0 ? 'No numeric features' : 'No categorical features',
      icon: numericColumns > 0 && categoricalColumns > 0 ? <Target size={16} /> : <AlertTriangle size={16} />,
      detail: `${numericColumns} numeric, ${categoricalColumns} categorical`
    },
    {
      name: 'Outlier Analysis',
      status: Object.values(safeColumnStats).some(col => (col.outliers || 0) > totalRows * 0.05) ? 'warning' : 'excellent',
      score: Object.values(safeColumnStats).some(col => (col.outliers || 0) > totalRows * 0.05) ? 75 : 90,
      message: Object.values(safeColumnStats).some(col => (col.outliers || 0) > totalRows * 0.05) ? 
               'Outliers detected' : 'Clean distribution',
      icon: Object.values(safeColumnStats).some(col => (col.outliers || 0) > totalRows * 0.05) ? 
            <Eye size={16} /> : <Check size={16} />,
      detail: `${Object.values(safeColumnStats).reduce((sum, col) => sum + (col.outliers || 0), 0)} outliers total`
    }
  ];

  // Performance metrics for processing
  const performanceMetrics = [
    {
      label: 'Processing Speed',
      value: processingStats?.performance?.efficiency || 'N/A',
      icon: <Zap size={16} />,
      trend: 'up',
      color: '#10b981'
    },
    {
      label: 'Memory Usage',
      value: processingStats?.fromCache ? 'Cached' : 'Fresh',
      icon: <Cpu size={16} />,
      trend: processingStats?.fromCache ? 'up' : 'neutral',
      color: processingStats?.fromCache ? '#3b82f6' : '#6b7280'
    },
    {
      label: 'Data Samples',
      value: processingStats?.sampling?.isSampled ? 'Sampled' : 'Full',
      icon: <Database size={16} />,
      trend: 'neutral',
      color: '#8b5cf6'
    }
  ];
  
  return (
    <div className={styles.futuristicSummary}>
      {/* Holographic Header */}
      <div className={styles.summaryHeader}>
        <div className={styles.headerGlow}></div>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <Brain size={28} />
            <div className={styles.iconOrbit}></div>
          </div>
          <div className={styles.headerText}>
            <h2>Dataset Intelligence Overview</h2>
            <p>AI-powered analysis of {totalRows.toLocaleString()} records across {totalColumns} dimensions</p>
          </div>
          <div className={styles.qualityBadge}>
            <Gauge size={16} />
            <span>{qualityScore.toFixed(0)}% Quality</span>
          </div>
        </div>
      </div>

      {/* Holographic Metric Cards */}
      <div className={styles.holoCardsGrid}>
        {[
          {
            icon: <Database size={24} />,
            label: 'Data Records',
            value: totalRows.toLocaleString(),
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            detail: 'Total rows analyzed',
            trend: '+12.5%',
            delay: 0
          },
          {
            icon: <Layers size={24} />,
            label: 'Feature Dimensions',
            value: totalColumns,
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            detail: 'Available columns',
            trend: 'Optimal',
            delay: 200
          },
          {
            icon: <AlertTriangle size={24} />,
            label: 'Missing Data',
            value: totalMissingValues.toLocaleString(),
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            detail: `${missingPercent}% of total`,
            trend: missingPercent < 10 ? 'Low' : 'Monitor',
            delay: 400
          },
          {
            icon: <Activity size={24} />,
            label: 'Processing Time',
            value: processingStats?.serverProcessingTime?.total || 'N/A',
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            detail: 'Server response',
            trend: 'Fast',
            delay: 600
          }
        ].map((card, index) => (
          <div 
            key={index}
            className={`${styles.holoCard} ${visibleCards > index ? styles.visible : ''}`}
            style={{ 
              '--delay': `${card.delay}ms`,
              '--gradient': card.gradient
            }}
          >
            <div className={styles.cardGlow}></div>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  {card.icon}
                </div>
                <div className={styles.cardTrend}>
                  <TrendingUp size={12} />
                  <span>{card.trend}</span>
                </div>
              </div>
              <div className={styles.cardMetrics}>
                <div className={styles.primaryValue}>{card.value}</div>
                <div className={styles.cardLabel}>{card.label}</div>
                <div className={styles.cardDetail}>{card.detail}</div>
              </div>
              <div className={styles.cardPulse}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Analytics Panels */}
      <div className={styles.analyticsGrid}>
        {/* Data Distribution Panel */}
        <div className={styles.analyticsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <BarChart3 size={20} />
            </div>
            <h3>Feature Distribution</h3>
            <div className={styles.panelBadge}>Real-time</div>
          </div>
          
          <div className={styles.distributionViz}>
            <div className={styles.distributionBar}>
              <div 
                className={styles.numericSegment}
                style={{ 
                  width: `${(numericColumns / totalColumns * 100) || 0}%`,
                  '--progress': `${animationProgress}%`
                }}
              >
                <Hash size={14} />
                <span>{numericColumns}</span>
                <div className={styles.segmentGlow}></div>
              </div>
              <div 
                className={styles.categoricalSegment}
                style={{ 
                  width: `${(categoricalColumns / totalColumns * 100) || 0}%`,
                  '--progress': `${animationProgress}%`
                }}
              >
                <Type size={14} />
                <span>{categoricalColumns}</span>
                <div className={styles.segmentGlow}></div>
              </div>
            </div>
            
            <div className={styles.distributionLegend}>
              <div className={styles.legendItem}>
                <div className={styles.numericIndicator}></div>
                <span>Numeric Features</span>
                <strong>{numericColumns}</strong>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.categoricalIndicator}></div>
                <span>Categorical Features</span>
                <strong>{categoricalColumns}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Assessment Panel */}
        <div className={styles.analyticsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <Shield size={20} />
            </div>
            <h3>Quality Assessment</h3>
            <div className={styles.panelBadge}>AI-Powered</div>
          </div>
          
          <div className={styles.qualityMatrix}>
            {qualityChecks.map((check, idx) => (
              <div 
                key={idx} 
                className={`${styles.qualityItem} ${styles[check.status]}`}
                style={{ '--delay': `${idx * 100}ms` }}
              >
                <div className={styles.qualityIndicator}>
                  <div className={styles.qualityIcon}>{check.icon}</div>
                  <div className={styles.qualityScore}>
                    <div 
                      className={styles.scoreRing}
                      style={{ '--score': `${check.score}%` }}
                    >
                      <span>{check.score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.qualityInfo}>
                  <div className={styles.qualityName}>{check.name}</div>
                  <div className={styles.qualityMessage}>{check.message}</div>
                  <div className={styles.qualityDetail}>{check.detail}</div>
                </div>
                <div className={styles.qualityPulse}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics Bar */}
      <div className={styles.performanceBar}>
        <div className={styles.performanceHeader}>
          <Cpu size={18} />
          <span>System Performance</span>
        </div>
        <div className={styles.performanceMetrics}>
          {performanceMetrics.map((metric, idx) => (
            <div key={idx} className={styles.performanceItem}>
              <div className={styles.metricIcon} style={{ color: metric.color }}>
                {metric.icon}
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricValue}>{metric.value}</span>
              </div>
              <div className={styles.metricTrend}>
                {metric.trend === 'up' && <TrendingUp size={14} color={metric.color} />}
                {metric.trend === 'neutral' && <Activity size={14} color={metric.color} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Issues Alert */}
      {worstColumn && missingPercent > 20 && (
        <div className={styles.criticalAlert}>
          <div className={styles.alertHeader}>
            <div className={styles.alertIcon}>
              <AlertTriangle size={20} />
            </div>
            <h3>Critical Data Quality Issue</h3>
            <div className={styles.alertSeverity}>High Priority</div>
          </div>
          <div className={styles.alertContent}>
            <div className={styles.alertMessage}>
              <strong>{worstColumn[0]}</strong> column has severe missing data at 
              <span className={styles.criticalValue}> {worstColumn[1].missingPercent.toFixed(1)}%</span>
            </div>
            <div className={styles.alertRecommendation}>
              <strong>Recommendation:</strong> Consider data imputation or column removal before ML training
            </div>
            <div className={styles.alertMetrics}>
              <span>{worstColumn[1].missingCount.toLocaleString()} missing values</span>
              <span>•</span>
              <span>{((worstColumn[1].missingCount / totalRows) * 100).toFixed(1)}% of total records</span>
            </div>
          </div>
          <div className={styles.alertPulse}></div>
        </div>
      )}
    </div>
  );
};

export default SummaryDashboard;