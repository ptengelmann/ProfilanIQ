import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, 
  ArrowUpDown, 
  BarChart2, 
  Hash, 
  Type, 
  Lightbulb,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import Chart from 'chart.js/auto';
import styles from '../profiler.module.scss';

const FeatureImportanceAnalyzer = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const featureScoreChartRef = useRef(null);
  const featureScoreChart = useRef(null);
  
  // Safe data access
  const safeColumnStats = profile?.columnStats || {};
  const safeCorrelations = profile?.correlations || { all: [], strong: [], moderate: [], weak: [] };
  
  // Calculate feature importance scores based on various metrics
  const calculateFeatureScores = () => {
    const scores = {};
    
    // Get all column names
    const columns = Object.keys(safeColumnStats);
    
    columns.forEach(column => {
      const stats = safeColumnStats[column];
      let score = 0;
      
      // Factor 1: Missing values (lower is better)
      score -= (stats.missingPercent || 0) * 0.1;
      
      // Factor 2: Unique values percentage (higher is better for categorical)
      if (stats.type === 'categorical') {
        const uniquenessScore = (stats.uniquePercent || 0) * 0.05;
        // Cap uniqueness score to avoid over-rewarding IDs
        score += Math.min(uniquenessScore, 2.5);
      }
      
      // Factor 3: Correlation strength (higher is better)
      const columnCorrelations = safeCorrelations.all.filter(
        corr => corr.colA === column || corr.colB === column
      );
      
      if (columnCorrelations.length > 0) {
        // Average correlation strength
        const avgCorrelation = columnCorrelations.reduce(
          (sum, corr) => sum + corr.strength, 0
        ) / columnCorrelations.length;
        
        score += avgCorrelation * 5;
      }
      
      // Factor 4: Numeric column bonus
      if (stats.type === 'numeric') {
        score += 2;
        
        // Variance/distribution score (higher stdDev relative to mean is better)
        if (stats.mean && stats.stdDev) {
          const variationCoefficient = stats.stdDev / Math.abs(stats.mean);
          score += Math.min(variationCoefficient * 2, 3); // Cap at 3 points
        }
      }
      
      // Factor 5: Penalize constant columns
      if (stats.type === 'numeric' && stats.stdDev === 0) {
        score -= 5;
      }
      
      // Factor 6: Penalize high cardinality categoricals
      if (stats.type === 'categorical' && stats.unique > 100 && stats.uniquePercent > 90) {
        score -= 3;
      }
      
      // Normalize score to a 0-10 range
      scores[column] = Math.max(0, Math.min(10, score + 5));
    });
    
    return scores;
  };
  
  // Get feature importance explanations
  const getFeatureExplanation = (column, score) => {
    const stats = safeColumnStats[column];
    const reasons = [];
    
    if (stats.type === 'numeric') {
      reasons.push('Numeric feature');
      
      if (stats.stdDev === 0) {
        reasons.push('Constant value (no variance)');
      } else if (stats.stdDev && stats.mean && stats.stdDev / Math.abs(stats.mean) > 0.5) {
        reasons.push('Good distribution/variance');
      }
    } else {
      reasons.push('Categorical feature');
      
      if (stats.uniquePercent > 90 && stats.unique > stats.validCount * 0.9) {
        reasons.push('Likely an ID column (very high cardinality)');
      } else if (stats.uniquePercent > 60) {
        reasons.push('High cardinality');
      } else if (stats.uniquePercent < 10) {
        reasons.push('Low cardinality (few unique values)');
      }
    }
    
    if (stats.missingPercent > 30) {
      reasons.push('High missing value rate');
    }
    
    // Check correlations
    const columnCorrelations = safeCorrelations.all.filter(
      corr => corr.colA === column || corr.colB === column
    );
    
    if (columnCorrelations.length > 0) {
      const strongCorrs = columnCorrelations.filter(corr => corr.strength > 0.7).length;
      if (strongCorrs > 0) {
        reasons.push(`Strong correlations with ${strongCorrs} other feature${strongCorrs > 1 ? 's' : ''}`);
      }
    }
    
    return reasons;
  };
  
  // Calculate and sort feature scores
  const featureScores = calculateFeatureScores();
  const sortedFeatures = Object.entries(featureScores)
    .sort((a, b) => b[1] - a[1])
    .map(([column, score]) => ({
      column,
      score,
      type: safeColumnStats[column]?.type || 'unknown',
      reasons: getFeatureExplanation(column, score)
    }));
  
  // Create feature score chart
  useEffect(() => {
    if (isOpen && featureScoreChartRef.current && sortedFeatures.length > 0) {
      // Destroy previous chart if it exists
      if (featureScoreChart.current) {
        featureScoreChart.current.destroy();
      }
      
      // Prepare data for chart
      const chartData = sortedFeatures.slice(0, 10); // Top 10 features
      
      featureScoreChart.current = new Chart(featureScoreChartRef.current, {
        type: 'bar',
        data: {
          labels: chartData.map(f => f.column),
          datasets: [{
            label: 'Feature Importance Score',
            data: chartData.map(f => f.score),
            backgroundColor: chartData.map(f => 
              f.type === 'numeric' ? '#3b82f6' : '#10b981'
            ),
            borderColor: chartData.map(f => 
              f.type === 'numeric' ? '#1d4ed8' : '#059669'
            ),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              max: 10,
              title: {
                display: true,
                text: 'Importance Score (0-10)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Feature'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                afterLabel: (context) => {
                  const index = context.dataIndex;
                  const feature = chartData[index];
                  return [
                    `Type: ${feature.type}`,
                    ...feature.reasons.map(r => `• ${r}`)
                  ];
                }
              }
            },
            title: {
              display: true,
              text: 'Feature Importance Analysis'
            }
          }
        }
      });
    }
    
    return () => {
      if (featureScoreChart.current) {
        featureScoreChart.current.destroy();
        featureScoreChart.current = null;
      }
    };
  }, [isOpen, sortedFeatures]);
  
  if (!profile) return null;
  
  const topFeatures = sortedFeatures.slice(0, 5);
  const bottomFeatures = sortedFeatures.slice(-5).reverse();
  
  return (
    <div className={styles.featureImportanceTool}>
      <div 
        className={styles.featureImportanceHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Star size={18} />
        <h3>Feature Importance Analysis</h3>
        <button className={styles.toggleButton}>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      
      {isOpen && (
        <div className={styles.featureImportanceContent}>
          <div className={styles.featureImportanceDescription}>
            <Lightbulb size={16} />
            <p>
              This analysis scores features based on data type, uniqueness, correlation strength, and data quality. 
              Higher scores suggest features with greater potential predictive value.
            </p>
          </div>
          
          <div className={styles.featureChartContainer}>
            <canvas ref={featureScoreChartRef} height={300}></canvas>
          </div>
          
          <div className={styles.featureImportanceGrid}>
            <div className={styles.featureImportanceCard}>
              <div className={styles.featureCardHeader}>
                <ArrowUpDown size={16} />
                <h4>Top 5 Features</h4>
              </div>
              <div className={styles.featureList}>
                {topFeatures.map(feature => (
                  <div key={feature.column} className={styles.featureItem}>
                    <div className={styles.featureScore}>
                      <div 
                        className={styles.scoreIndicator}
                        style={{ width: `${feature.score * 10}%` }}
                      ></div>
                      <span>{feature.score.toFixed(1)}</span>
                    </div>
                    <div className={styles.featureDetails}>
                      <div className={styles.featureName}>
                        {feature.column}
                        <span className={`${styles.featureType} ${styles[feature.type]}`}>
                          {feature.type === 'numeric' ? <Hash size={10} /> : <Type size={10} />}
                          {feature.type}
                        </span>
                      </div>
                      <div className={styles.featureReasons}>
                        {feature.reasons.map((reason, idx) => (
                          <span key={idx} className={styles.featureReason}>{reason}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.featureImportanceCard}>
              <div className={styles.featureCardHeader}>
                <BarChart2 size={16} />
                <h4>Bottom 5 Features</h4>
              </div>
              <div className={styles.featureList}>
                {bottomFeatures.map(feature => (
                  <div key={feature.column} className={styles.featureItem}>
                    <div className={styles.featureScore}>
                      <div 
                        className={`${styles.scoreIndicator} ${styles.lowScore}`}
                        style={{ width: `${feature.score * 10}%` }}
                      ></div>
                      <span>{feature.score.toFixed(1)}</span>
                    </div>
                    <div className={styles.featureDetails}>
                      <div className={styles.featureName}>
                        {feature.column}
                        <span className={`${styles.featureType} ${styles[feature.type]}`}>
                          {feature.type === 'numeric' ? <Hash size={10} /> : <Type size={10} />}
                          {feature.type}
                        </span>
                      </div>
                      <div className={styles.featureReasons}>
                        {feature.reasons.map((reason, idx) => (
                          <span key={idx} className={styles.featureReason}>{reason}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className={styles.featureImportanceNote}>
            <p>
              <strong>Note:</strong> This importance analysis is based on statistical properties of the data, 
              not on actual model training. Feature importance may vary depending on the specific machine 
              learning algorithm and target variable used.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureImportanceAnalyzer;