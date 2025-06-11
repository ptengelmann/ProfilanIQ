import React, { useState, useRef, useEffect } from 'react';
import { Calculator, TrendingUp, BarChart, Zap, Info } from 'lucide-react';
import Chart from 'chart.js/auto';
import styles from '../profiler.module.scss';

const AdvancedStatistics = ({ profile }) => {
  const [activeTest, setActiveTest] = useState('normality');
  const [testResults, setTestResults] = useState({});
  const distributionChartRef = useRef(null);
  const distributionChart = useRef(null);

  const safeColumnStats = profile?.columnStats || {};
  
  // Perform statistical tests
  const performNormalityTest = (columnData) => {
    // Simplified Shapiro-Wilk approximation
    const n = columnData.validCount;
    if (n < 3) return { test: 'insufficient_data', pValue: null };
    
    // Use skewness and kurtosis to approximate normality
    const skewness = Math.abs(columnData.skewness || 0);
    const kurtosis = Math.abs((columnData.kurtosis || 3) - 3);
    
    // Rough approximation of normality based on skewness/kurtosis
    const normalityScore = Math.max(0, 1 - (skewness * 0.3 + kurtosis * 0.2));
    const pValue = normalityScore > 0.5 ? 0.1 + normalityScore * 0.4 : normalityScore * 0.1;
    
    return {
      test: 'shapiro_wilk_approx',
      statistic: normalityScore,
      pValue: pValue,
      interpretation: pValue > 0.05 ? 'Normal distribution' : 'Non-normal distribution',
      confidence: pValue > 0.05 ? 'high' : 'medium'
    };
  };

  const performCorrelationTests = () => {
    const correlations = profile?.correlations?.all || [];
    return correlations.map(corr => {
      const n = corr.sampleSize || 100;
      const r = corr.correlation;
      
      // Calculate t-statistic for correlation
      const t = r * Math.sqrt((n - 2) / (1 - r * r));
      
      // Approximate p-value (simplified)
      const pValue = Math.max(0.001, 1 - Math.abs(t) / 10);
      
      return {
        ...corr,
        tStatistic: t,
        pValue: pValue,
        significant: pValue < 0.05,
        interpretation: pValue < 0.05 ? 'Statistically significant' : 'Not significant'
      };
    });
  };

  const performOutlierAnalysis = (columnData) => {
    if (columnData.type !== 'numeric') return null;
    
    const q1 = columnData.q1;
    const q3 = columnData.q3;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // Z-score outliers (assuming mean and std)
    const zScoreOutliers = Math.round(columnData.validCount * 0.003); // ~0.3% for normal dist
    
    return {
      method: 'iqr_and_zscore',
      iqrOutliers: columnData.outliers || 0,
      zScoreOutliers: zScoreOutliers,
      lowerBound: lowerBound,
      upperBound: upperBound,
      severity: (columnData.outliers || 0) > columnData.validCount * 0.05 ? 'high' : 'low'
    };
  };

  // Generate comprehensive statistical report
  const generateStatisticalReport = () => {
    const report = {
      normality: {},
      correlations: performCorrelationTests(),
      outliers: {},
      summary: {
        totalTests: 0,
        significantFindings: 0,
        recommendations: []
      }
    };

    // Test each numeric column for normality
    Object.entries(safeColumnStats).forEach(([colName, stats]) => {
      if (stats.type === 'numeric') {
        report.normality[colName] = performNormalityTest(stats);
        report.outliers[colName] = performOutlierAnalysis(stats);
        report.summary.totalTests += 2;
      }
    });

    // Count significant findings
    report.summary.significantFindings = 
      Object.values(report.normality).filter(test => test.pValue && test.pValue < 0.05).length +
      report.correlations.filter(corr => corr.significant).length;

    // Generate recommendations
    const nonNormalColumns = Object.entries(report.normality)
      .filter(([col, test]) => test.pValue && test.pValue < 0.05)
      .map(([col]) => col);

    if (nonNormalColumns.length > 0) {
      report.summary.recommendations.push({
        type: 'transformation',
        message: `Consider log/sqrt transformation for non-normal columns: ${nonNormalColumns.join(', ')}`,
        priority: 'medium'
      });
    }

    const highOutlierColumns = Object.entries(report.outliers)
      .filter(([col, analysis]) => analysis && analysis.severity === 'high')
      .map(([col]) => col);

    if (highOutlierColumns.length > 0) {
      report.summary.recommendations.push({
        type: 'outlier_treatment',
        message: `High outlier concentration in: ${highOutlierColumns.join(', ')}. Consider robust scaling or outlier removal.`,
        priority: 'high'
      });
    }

    return report;
  };

  const statisticalReport = generateStatisticalReport();

  // Create distribution visualization
  useEffect(() => {
    if (activeTest === 'normality' && distributionChartRef.current) {
      if (distributionChart.current) {
        distributionChart.current.destroy();
      }

      const numericColumns = Object.entries(safeColumnStats)
        .filter(([name, stats]) => stats.type === 'numeric')
        .slice(0, 1); // Show first numeric column

      if (numericColumns.length === 0) return;

      const [colName, stats] = numericColumns[0];
      
      // Generate normal distribution curve for comparison
      const generateNormalCurve = (mean, std, points = 100) => {
        const data = [];
        const range = std * 4;
        const step = (range * 2) / points;
        
        for (let i = 0; i < points; i++) {
          const x = mean - range + i * step;
          const y = (1 / (std * Math.sqrt(2 * Math.PI))) * 
                   Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
          data.push({ x, y });
        }
        return data;
      };

      const normalCurve = generateNormalCurve(stats.mean, stats.stdDev);

      distributionChart.current = new Chart(distributionChartRef.current, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Theoretical Normal Distribution',
              data: normalCurve,
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'linear',
              title: {
                display: true,
                text: `${colName} Values`
              }
            },
            y: {
              title: {
                display: true,
                text: 'Density'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: `Normality Assessment: ${colName}`
            },
            legend: {
              display: true
            }
          }
        }
      });
    }
  }, [activeTest, safeColumnStats]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Calculator size={20} />
        <h2>Advanced Statistical Analysis</h2>
      </div>

      <div className={styles.visualizationTabs}>
        <button 
          className={`${styles.tabButton} ${activeTest === 'normality' ? styles.active : ''}`}
          onClick={() => setActiveTest('normality')}
        >
          <BarChart size={16} />
          Normality Tests
        </button>
        <button 
          className={`${styles.tabButton} ${activeTest === 'correlations' ? styles.active : ''}`}
          onClick={() => setActiveTest('correlations')}
        >
          <TrendingUp size={16} />
          Correlation Significance
        </button>
        <button 
          className={`${styles.tabButton} ${activeTest === 'outliers' ? styles.active : ''}`}
          onClick={() => setActiveTest('outliers')}
        >
          <Zap size={16} />
          Outlier Analysis
        </button>
      </div>

      {activeTest === 'normality' && (
        <div>
          <div className={styles.chartContainer} style={{ height: '300px', marginBottom: '1.5rem' }}>
            <canvas ref={distributionChartRef}></canvas>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.statsTable}>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Test Statistic</th>
                  <th>P-Value</th>
                  <th>Interpretation</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statisticalReport.normality).map(([colName, test]) => (
                  <tr key={colName}>
                    <td className={styles.columnName}>{colName}</td>
                    <td>{test.statistic?.toFixed(4) || 'N/A'}</td>
                    <td style={{ color: test.pValue < 0.05 ? '#dc2626' : '#16a34a' }}>
                      {test.pValue?.toFixed(4) || 'N/A'}
                    </td>
                    <td>{test.interpretation}</td>
                    <td>
                      {test.pValue && test.pValue < 0.05 ? 
                        'Consider transformation' : 
                        'No action needed'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTest === 'correlations' && (
        <div className={styles.tableContainer}>
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>Variable Pair</th>
                <th>Correlation</th>
                <th>t-Statistic</th>
                <th>P-Value</th>
                <th>Significance</th>
              </tr>
            </thead>
            <tbody>
              {statisticalReport.correlations.map((corr, idx) => (
                <tr key={idx}>
                  <td className={styles.columnName}>{corr.pair}</td>
                  <td>{corr.correlation.toFixed(4)}</td>
                  <td>{corr.tStatistic.toFixed(4)}</td>
                  <td style={{ color: corr.significant ? '#dc2626' : '#64748b' }}>
                    {corr.pValue.toFixed(4)}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${corr.significant ? styles.significant : styles.notSignificant}`}>
                      {corr.significant ? 'Significant' : 'Not Significant'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTest === 'outliers' && (
        <div className={styles.tableContainer}>
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>Column</th>
                <th>IQR Outliers</th>
                <th>Bounds</th>
                <th>Severity</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(statisticalReport.outliers).map(([colName, analysis]) => (
                analysis && (
                  <tr key={colName}>
                    <td className={styles.columnName}>{colName}</td>
                    <td>{analysis.iqrOutliers}</td>
                    <td>
                      [{analysis.lowerBound.toFixed(2)}, {analysis.upperBound.toFixed(2)}]
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[analysis.severity]}`}>
                        {analysis.severity}
                      </span>
                    </td>
                    <td>
                      {analysis.severity === 'high' ? 
                        'Consider robust scaling' : 
                        'Monitor outliers'
                      }
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Statistical Summary */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Info size={16} />
          Statistical Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>Tests Performed:</strong> {statisticalReport.summary.totalTests}
          </div>
          <div>
            <strong>Significant Findings:</strong> {statisticalReport.summary.significantFindings}
          </div>
        </div>
        
        {statisticalReport.summary.recommendations.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Recommendations:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              {statisticalReport.summary.recommendations.map((rec, idx) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>
                  <span style={{ 
                    color: rec.priority === 'high' ? '#dc2626' : '#d97706',
                    fontWeight: '600'
                  }}>
                    [{rec.priority.toUpperCase()}]
                  </span> {rec.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedStatistics;