import React, { useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Grid, 
  Network, 
  LayoutGrid, 
  CircleDot 
} from 'lucide-react';
import Chart from 'chart.js/auto';
import styles from '../profiler.module.scss';

const DataVisualizations = ({ profile, activeTab, setActiveTab }) => {
  const distributionChartRef = useRef(null);
  const correlationChartRef = useRef(null);
  const missingDataChartRef = useRef(null);
  const outlierChartRef = useRef(null);
  
  const distributionChart = useRef(null);
  const correlationChart = useRef(null);
  const missingDataChart = useRef(null);
  const outlierChart = useRef(null);

  // Safe data access with defaults
  const safeColumnStats = profile?.columnStats || {};
  const safeCorrelations = profile?.correlations || { all: [], positive: [], negative: [] };
  
  // Handle tab switching
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  // Create column distribution chart
  useEffect(() => {
    if (activeTab === 'distributions' && distributionChartRef.current && Object.keys(safeColumnStats).length > 0) {
      // Find numeric columns for distribution chart
      const numericColumns = Object.entries(safeColumnStats)
        .filter(([name, stats]) => stats.type === 'numeric')
        .slice(0, 5); // Limit to first 5 numeric columns for clarity
      
      if (numericColumns.length === 0) return;
      
      // Destroy previous chart if it exists
      if (distributionChart.current) {
        distributionChart.current.destroy();
      }
      
      const datasets = numericColumns.map(([colName, stats], index) => {
        // Create bin data (simplified approach - ideally would calculate proper histogram bins)
        const min = stats.min;
        const max = stats.max;
        const range = max - min;
        const step = range / 10;
        
        // Placeholder for actual distribution data - would need real data from backend
        // Here we're creating a normal distribution based on mean and stdDev
        const generateNormalDistribution = (mean, stdDev, count = 10) => {
          const bins = [];
          for (let i = 0; i < count; i++) {
            const x = min + i * step;
            // Approximate normal distribution
            const y = Math.exp(-0.5 * Math.pow((x - stats.mean) / stats.stdDev, 2)) / (stats.stdDev * Math.sqrt(2 * Math.PI));
            bins.push({x, y: y * stats.validCount});  // Scale by count
          }
          return bins;
        };
        
        const colorHues = [210, 120, 330, 20, 270];
        
        return {
          label: colName,
          data: generateNormalDistribution(stats.mean, stats.stdDev),
          backgroundColor: `hsla(${colorHues[index]}, 80%, 60%, 0.5)`,
          borderColor: `hsla(${colorHues[index]}, 80%, 50%, 1)`,
          borderWidth: 1,
          tension: 0.4
        };
      });
      
      distributionChart.current = new Chart(distributionChartRef.current, {
        type: 'line',
        data: {
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'linear',
              title: {
                display: true,
                text: 'Value'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Frequency'
              },
              beginAtZero: true
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Value Distributions'
            },
            tooltip: {
              mode: 'index',
              intersect: false
            },
            legend: {
              position: 'top',
            }
          }
        }
      });
    }
    
    return () => {
      if (distributionChart.current) {
        distributionChart.current.destroy();
        distributionChart.current = null;
      }
    };
  }, [activeTab, safeColumnStats]);

  // Create correlation heatmap
  useEffect(() => {
    if (activeTab === 'correlations' && correlationChartRef.current && safeCorrelations.all.length > 0) {
      // Limit to top correlations for clarity
      const topCorrelations = safeCorrelations.all.slice(0, 15);
      
      // Extract unique column names
      const columns = [...new Set(
        topCorrelations.flatMap(corr => [corr.colA, corr.colB])
      )];
      
      // Create correlation matrix
      const matrix = Array(columns.length).fill().map(() => Array(columns.length).fill(null));
      
      // Set matrix diagonal to 1 (self-correlation)
      for (let i = 0; i < columns.length; i++) {
        matrix[i][i] = 1;
      }
      
      // Fill matrix with correlation values
      topCorrelations.forEach(corr => {
        const idxA = columns.indexOf(corr.colA);
        const idxB = columns.indexOf(corr.colB);
        if (idxA >= 0 && idxB >= 0) {
          matrix[idxA][idxB] = corr.correlation;
          matrix[idxB][idxA] = corr.correlation; // Mirror
        }
      });
      
      // Destroy previous chart if it exists
      if (correlationChart.current) {
        correlationChart.current.destroy();
      }
      
      // Prepare data for heatmap
      const data = [];
      for (let i = 0; i < columns.length; i++) {
        for (let j = 0; j < columns.length; j++) {
          if (matrix[i][j] !== null) {
            data.push({
              x: columns[i],
              y: columns[j],
              v: matrix[i][j]
            });
          }
        }
      }
      
      correlationChart.current = new Chart(correlationChartRef.current, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Correlation',
            data: data.map(point => ({
              x: point.x,
              y: point.y,
              value: point.v // Custom value for tooltip
            })),
            pointBackgroundColor: data.map(point => {
              // Color based on correlation value
              const value = point.v;
              if (value === 1) return 'rgba(200, 200, 200, 0.8)'; // Self-correlation
              if (value > 0) return `rgba(0, ${Math.round(value * 255)}, 0, 0.8)`;
              return `rgba(${Math.round(-value * 255)}, 0, 0, 0.8)`;
            }),
            pointRadius: data.map(point => Math.abs(point.v) * 15),
            pointHoverRadius: data.map(point => Math.abs(point.v) * 20),
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'category',
              position: 'top',
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              type: 'category',
              position: 'left',
              reverse: true
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const point = context.raw;
                  return `${point.x} & ${point.y}: ${point.value.toFixed(3)}`;
                }
              }
            },
            title: {
              display: true,
              text: 'Correlation Matrix'
            }
          }
        }
      });
    }
    
    return () => {
      if (correlationChart.current) {
        correlationChart.current.destroy();
        correlationChart.current = null;
      }
    };
  }, [activeTab, safeCorrelations]);

  // Create missing data visualization
  useEffect(() => {
    if (activeTab === 'missing' && missingDataChartRef.current && Object.keys(safeColumnStats).length > 0) {
      // Prepare data for missing values chart
      const columns = Object.keys(safeColumnStats);
      const missingPercents = columns.map(col => safeColumnStats[col].missingPercent || 0);
      
      // Destroy previous chart if it exists
      if (missingDataChart.current) {
        missingDataChart.current.destroy();
      }
      
      missingDataChart.current = new Chart(missingDataChartRef.current, {
        type: 'bar',
        data: {
          labels: columns,
          datasets: [{
            label: 'Missing Values %',
            data: missingPercents,
            backgroundColor: missingPercents.map(value => {
              // Color based on missing value percentage
              if (value > 30) return 'rgba(255, 99, 132, 0.7)';
              if (value > 10) return 'rgba(255, 205, 86, 0.7)';
              return 'rgba(54, 162, 235, 0.7)';
            }),
            borderColor: missingPercents.map(value => {
              if (value > 30) return 'rgb(255, 99, 132)';
              if (value > 10) return 'rgb(255, 205, 86)';
              return 'rgb(54, 162, 235)';
            }),
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
              max: 100,
              title: {
                display: true,
                text: 'Missing Values (%)'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const column = context.label;
                  const percent = context.raw.toFixed(1);
                  const total = safeColumnStats[column].totalCount;
                  const missing = safeColumnStats[column].missingCount;
                  return `${percent}% missing (${missing} of ${total})`;
                }
              }
            },
            title: {
              display: true,
              text: 'Missing Values Analysis'
            }
          }
        }
      });
    }
    
    return () => {
      if (missingDataChart.current) {
        missingDataChart.current.destroy();
        missingDataChart.current = null;
      }
    };
  }, [activeTab, safeColumnStats]);

  // Create outlier visualization
  useEffect(() => {
    if (activeTab === 'outliers' && outlierChartRef.current && Object.keys(safeColumnStats).length > 0) {
      // Find numeric columns with outlier data
      const columnsWithOutliers = Object.entries(safeColumnStats)
        .filter(([name, stats]) => stats.type === 'numeric' && stats.outliers > 0)
        .sort((a, b) => b[1].outliers - a[1].outliers) // Sort by most outliers
        .slice(0, 8); // Limit to 8 columns
      
      if (columnsWithOutliers.length === 0) {
        // No outliers, show empty chart with message
        if (outlierChart.current) {
          outlierChart.current.destroy();
        }
        
        outlierChart.current = new Chart(outlierChartRef.current, {
          type: 'bar',
          data: {
            labels: ['No outliers detected'],
            datasets: [{
              data: [0],
              backgroundColor: 'rgba(200, 200, 200, 0.2)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: true,
                text: 'Outlier Analysis - No outliers detected'
              }
            }
          }
        });
        return;
      }
      
      // Prepare boxplot data
      const labels = columnsWithOutliers.map(([name]) => name);
      const boxplotData = columnsWithOutliers.map(([name, stats]) => {
        return {
          min: stats.min,
          q1: stats.q1,
          median: stats.median,
          q3: stats.q3,
          max: stats.max,
          outliers: stats.outliers
        };
      });
      
      // Destroy previous chart if it exists
      if (outlierChart.current) {
        outlierChart.current.destroy();
      }
      
      // Create custom box plot visualization
      outlierChart.current = new Chart(outlierChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            // Min to Q1 bars
            {
              label: 'Min to Q1',
              data: boxplotData.map(d => d.q1 - d.min),
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              base: boxplotData.map(d => d.min),
              barPercentage: 0.3,
              borderWidth: 1,
              borderColor: 'rgba(54, 162, 235, 1)'
            },
            // Q1 to Median bars
            {
              label: 'Q1 to Median',
              data: boxplotData.map(d => d.median - d.q1),
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              base: boxplotData.map(d => d.q1),
              barPercentage: 0.3,
              borderWidth: 1,
              borderColor: 'rgba(75, 192, 192, 1)'
            },
            // Median to Q3 bars
            {
              label: 'Median to Q3',
              data: boxplotData.map(d => d.q3 - d.median),
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              base: boxplotData.map(d => d.median),
              barPercentage: 0.3,
              borderWidth: 1,
              borderColor: 'rgba(75, 192, 192, 1)'
            },
            // Q3 to Max bars
            {
              label: 'Q3 to Max',
              data: boxplotData.map(d => d.max - d.q3),
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              base: boxplotData.map(d => d.q3),
              barPercentage: 0.3,
              borderWidth: 1,
              borderColor: 'rgba(54, 162, 235, 1)'
            },
            // Outlier markers
            {
              label: 'Outlier Count',
              type: 'scatter',
              data: boxplotData.map((d, i) => ({
                x: i,
                y: d.max + (d.max - d.min) * 0.1 // Position slightly above max
              })),
              backgroundColor: 'rgba(255, 99, 132, 0.8)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
              pointRadius: boxplotData.map(d => Math.sqrt(d.outliers) * 3 + 2),
              pointHoverRadius: boxplotData.map(d => Math.sqrt(d.outliers) * 4 + 3),
              datalabels: {
                display: true,
                formatter: (_, context) => boxplotData[context.dataIndex].outliers
              }
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              title: {
                display: true,
                text: 'Value Range'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const datasetLabel = context.dataset.label;
                  if (datasetLabel === 'Outlier Count') {
                    const index = context.dataIndex;
                    return `Outliers: ${boxplotData[index].outliers}`;
                  }
                  return `${datasetLabel}: ${context.raw.toFixed(2)}`;
                }
              }
            },
            title: {
              display: true,
              text: 'Outlier Analysis (Box Plot)'
            }
          }
        }
      });
    }
    
    return () => {
      if (outlierChart.current) {
        outlierChart.current.destroy();
        outlierChart.current = null;
      }
    };
  }, [activeTab, safeColumnStats]);

  if (!profile) {
    return null;
  }

  return (
    <div className={styles.visualizationSection}>
      <div className={styles.visualizationTabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'distributions' ? styles.active : ''}`}
          onClick={() => handleTabChange('distributions')}
        >
          <BarChart3 size={16} />
          Distributions
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'correlations' ? styles.active : ''}`}
          onClick={() => handleTabChange('correlations')}
        >
          <Network size={16} />
          Correlations
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'missing' ? styles.active : ''}`}
          onClick={() => handleTabChange('missing')}
        >
          <Grid size={16} />
          Missing Data
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'outliers' ? styles.active : ''}`}
          onClick={() => handleTabChange('outliers')}
        >
          <CircleDot size={16} />
          Outliers
        </button>
      </div>

      <div className={styles.chartContainer}>
        {activeTab === 'distributions' && (
          <div className={styles.chart}>
            <canvas ref={distributionChartRef}></canvas>
          </div>
        )}
        
        {activeTab === 'correlations' && (
          <div className={styles.chart}>
            <canvas ref={correlationChartRef}></canvas>
          </div>
        )}
        
        {activeTab === 'missing' && (
          <div className={styles.chart}>
            <canvas ref={missingDataChartRef}></canvas>
          </div>
        )}
        
        {activeTab === 'outliers' && (
          <div className={styles.chart}>
            <canvas ref={outlierChartRef}></canvas>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisualizations;