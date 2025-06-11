import React from 'react';
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  CheckCircle, 
  XCircle,
  FileWarning,
  BrainCircuit,
  Gauge
} from 'lucide-react';
import styles from '../profiler.module.scss';

const InsightsDashboard = ({ profile }) => {
  if (!profile) return null;
  
  // Safe data access
  const safeInsights = profile.insights || [];
  const safeColumnStats = profile.columnStats || {};
  const safeCorrelations = profile.correlations || { all: [], strong: [], weak: [] };
  const safeSummary = profile.summary || {};
  
  // Calculate data quality score
  const calculateQualityScore = () => {
    let score = 100;
    const columns = Object.keys(safeColumnStats).length;
    
    // Deduct points for missing data
    const avgMissingRate = Object.values(safeColumnStats).reduce(
      (sum, col) => sum + (col.missingPercent || 0), 0
    ) / (columns || 1);
    score -= avgMissingRate * 0.5;
    
    // Deduct for high cardinality categorical columns
    const highCardinalityColumns = Object.values(safeColumnStats).filter(
      col => col.type === 'categorical' && col.uniquePercent > 90 && col.unique > 100
    ).length;
    score -= highCardinalityColumns * 2;
    
    // Deduct for constant columns
    const constantColumns = Object.values(safeColumnStats).filter(
      col => col.type === 'numeric' && col.stdDev === 0
    ).length;
    score -= constantColumns * 5;
    
    // Deduct for outliers
    const outlierCount = Object.values(safeColumnStats).reduce(
      (sum, col) => sum + (col.outliers || 0), 0
    );
    score -= Math.min(outlierCount / 10, 10);
    
    // Cap between 0-100
    return Math.max(0, Math.min(100, score));
  };
  
  const dataQualityScore = calculateQualityScore();
  
  // Group insights by category
  const groupedInsights = safeInsights.reduce((groups, insight) => {
    const category = insight.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(insight);
    return groups;
  }, {});
  
  // Data quality metrics
  const qualityMetrics = [
    {
      label: 'Missing Values',
      value: safeSummary.totalMissingValues || 0,
      percentage: Object.values(safeColumnStats).reduce(
        (sum, col) => sum + col.missingCount || 0, 0
      ) / (safeSummary.totalRows * safeSummary.totalColumns || 1) * 100,
      icon: <FileWarning size={16} />,
      status: 'warning'
    },
    {
      label: 'Outliers',
      value: Object.values(safeColumnStats).reduce(
        (sum, col) => sum + (col.outliers || 0), 0
      ),
      percentage: Object.values(safeColumnStats).reduce(
        (sum, col) => sum + (col.outliers || 0), 0
      ) / (safeSummary.totalRows || 1) * 100,
      icon: <AlertTriangle size={16} />,
      status: 'warning'
    },
    {
      label: 'Strong Correlations',
      value: safeCorrelations.strong?.length || 0,
      icon: <TrendingUp size={16} />,
      status: 'success'
    },
    {
      label: 'Data Quality',
      value: `${Math.round(dataQualityScore)}%`,
      icon: <Gauge size={16} />,
      status: dataQualityScore > 80 ? 'success' : dataQualityScore > 60 ? 'warning' : 'error'
    }
  ];
  
  // Recommendations based on dataset analysis
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Missing value recommendations
    if (Object.values(safeColumnStats).some(col => col.missingPercent > 30)) {
      recommendations.push({
        type: 'cleaning',
        message: 'Handle columns with high missing value rates (>30%) using imputation or removal',
        icon: <FileWarning size={16} />
      });
    }
    
    // Correlation recommendations
    if (safeCorrelations.strong && safeCorrelations.strong.length > 2) {
      recommendations.push({
        type: 'feature',
        message: 'Consider dimensionality reduction (PCA) due to high multicollinearity',
        icon: <BrainCircuit size={16} />
      });
    }
    
    // Feature recommendations
    const constantColumns = Object.entries(safeColumnStats).filter(
      ([name, stats]) => stats.type === 'numeric' && stats.stdDev === 0
    );
    if (constantColumns.length > 0) {
      recommendations.push({
        type: 'feature',
        message: `Remove constant columns: ${constantColumns.map(([name]) => name).join(', ')}`,
        icon: <XCircle size={16} />
      });
    }
    
    // Data type recommendations
    const potentialCategoricals = Object.entries(safeColumnStats).filter(
      ([name, stats]) => stats.type === 'numeric' && stats.unique < 10 && stats.unique / stats.validCount < 0.05
    );
    if (potentialCategoricals.length > 0) {
      recommendations.push({
        type: 'type',
        message: `Consider treating low-cardinality numeric columns as categorical: ${potentialCategoricals.map(([name]) => name).join(', ')}`,
        icon: <BarChart2 size={16} />
      });
    }
    
    // Outlier recommendations
    const highOutlierColumns = Object.entries(safeColumnStats).filter(
      ([name, stats]) => stats.type === 'numeric' && (stats.outliers || 0) > 10
    );
    if (highOutlierColumns.length > 0) {
      recommendations.push({
        type: 'cleaning',
        message: `Address outliers in columns with high outlier counts: ${highOutlierColumns.map(([name]) => name).join(', ')}`,
        icon: <AlertTriangle size={16} />
      });
    }
    
    return recommendations;
  };
  
  const recommendations = generateRecommendations();
  
  return (
    <div className={styles.insightsDashboard}>
      <div className={styles.insightsGrid}>
        <div className={styles.insightsPanel}>
          <div className={styles.insightsPanelHeader}>
            <Lightbulb size={18} />
            <h3>AI Insights</h3>
          </div>
          <div className={styles.insightsList}>
            {Object.entries(groupedInsights).map(([category, insights]) => (
              <div key={category} className={styles.insightCategory}>
                <h4>{category}</h4>
                {insights.map((insight, idx) => (
                  <div key={idx} className={`${styles.insightItem} ${styles[insight.severity]}`}>
                    <div className={styles.insightIcon}>
                      {insight.type === 'warning' ? <AlertTriangle size={14} /> : 
                       insight.type === 'insight' ? <Lightbulb size={14} /> : 
                       <CheckCircle size={14} />}
                    </div>
                    <div className={styles.insightMessage}>{insight.message}</div>
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(groupedInsights).length === 0 && (
              <div className={styles.noInsights}>
                No insights were generated for this dataset
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.qualityPanel}>
          <div className={styles.insightsPanelHeader}>
            <Gauge size={18} />
            <h3>Data Quality</h3>
          </div>
          <div className={styles.qualityScore}>
            <div 
              className={`${styles.qualityGauge} ${
                dataQualityScore > 80 ? styles.good : 
                dataQualityScore > 60 ? styles.medium : 
                styles.poor
              }`} 
              style={{ '--score': `${dataQualityScore}%` }}
            >
              <div className={styles.qualityValue}>{Math.round(dataQualityScore)}</div>
            </div>
            <div className={styles.qualityLabel}>
              {dataQualityScore > 80 ? 'Good' : 
               dataQualityScore > 60 ? 'Needs Improvement' : 
               'Poor Quality'}
            </div>
          </div>
          <div className={styles.qualityMetrics}>
            {qualityMetrics.map((metric, idx) => (
              <div key={idx} className={styles.qualityMetric}>
                <div className={`${styles.metricIcon} ${styles[metric.status]}`}>
                  {metric.icon}
                </div>
                <div className={styles.metricLabel}>{metric.label}</div>
                <div className={styles.metricValue}>
                  {metric.value}
                  {metric.percentage !== undefined && (
                    <span className={styles.metricPercentage}>
                      ({metric.percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {recommendations.length > 0 && (
        <div className={styles.recommendationsPanel}>
          <div className={styles.insightsPanelHeader}>
            <BrainCircuit size={18} />
            <h3>AI Recommendations</h3>
          </div>
          <div className={styles.recommendationsList}>
            {recommendations.map((rec, idx) => (
              <div key={idx} className={styles.recommendationItem}>
                <div className={styles.recommendationIcon}>
                  {rec.icon}
                </div>
                <div className={styles.recommendationContent}>
                  <div className={styles.recommendationType}>
                    {{
                      'cleaning': 'Data Cleaning',
                      'feature': 'Feature Engineering',
                      'type': 'Data Type',
                      'model': 'Modeling'
                    }[rec.type] || 'Recommendation'}
                  </div>
                  <div className={styles.recommendationMessage}>
                    {rec.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsDashboard;