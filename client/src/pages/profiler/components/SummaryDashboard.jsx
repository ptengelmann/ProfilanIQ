import React from 'react';
import { 
  Database, 
  FileText, 
  Hash, 
  Type, 
  AlertTriangle, 
  Check, 
  BarChart3,
  Clock
} from 'lucide-react';
import styles from '../profiler.module.scss';

const SummaryDashboard = ({ profile, processingStats }) => {
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
  
  // Calculate column type distribution
  const columnTypes = Object.values(safeColumnStats).reduce((types, col) => {
    types[col.type] = (types[col.type] || 0) + 1;
    return types;
  }, {});
  
  // Get column with most missing values
  const columnsWithMissingValues = Object.entries(safeColumnStats)
    .filter(([name, stats]) => stats.missingCount > 0)
    .sort((a, b) => b[1].missingCount - a[1].missingCount);
  
  const worstColumn = columnsWithMissingValues[0];
  
  // Quality checks
  const qualityChecks = [
    {
      name: 'Missing Values',
      status: missingPercent < 10 ? 'success' : missingPercent < 30 ? 'warning' : 'error',
      message: missingPercent < 10 ? 'Low missing value rate' : 
               missingPercent < 30 ? 'Moderate missing values' : 'High missing value rate',
      icon: missingPercent < 10 ? <Check size={16} /> : <AlertTriangle size={16} />
    },
    {
      name: 'Column Balance',
      status: numericColumns > 0 && categoricalColumns > 0 ? 'success' : 'warning',
      message: numericColumns > 0 && categoricalColumns > 0 ? 
               'Mixed column types' : 
               numericColumns === 0 ? 'No numeric columns' : 'No categorical columns',
      icon: numericColumns > 0 && categoricalColumns > 0 ? <Check size={16} /> : <AlertTriangle size={16} />
    },
    {
      name: 'Outliers',
      status: Object.values(safeColumnStats).some(col => (col.outliers || 0) > 10) ? 'warning' : 'success',
      message: Object.values(safeColumnStats).some(col => (col.outliers || 0) > 10) ? 
               'Outliers detected' : 'Low outlier count',
      icon: Object.values(safeColumnStats).some(col => (col.outliers || 0) > 10) ? 
            <AlertTriangle size={16} /> : <Check size={16} />
    }
  ];
  
  return (
    <div className={styles.summaryDashboard}>
      <div className={styles.overviewCards}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <Database size={20} />
          </div>
          <div className={styles.overviewDetails}>
            <div className={styles.overviewLabel}>Total Rows</div>
            <div className={styles.overviewValue}>{totalRows.toLocaleString()}</div>
          </div>
        </div>
        
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <FileText size={20} />
          </div>
          <div className={styles.overviewDetails}>
            <div className={styles.overviewLabel}>Total Columns</div>
            <div className={styles.overviewValue}>{totalColumns}</div>
          </div>
        </div>
        
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <BarChart3 size={20} />
          </div>
          <div className={styles.overviewDetails}>
            <div className={styles.overviewLabel}>Missing Values</div>
            <div className={styles.overviewValue}>
              {totalMissingValues.toLocaleString()}
              <span className={styles.overviewSubvalue}>({missingPercent}%)</span>
            </div>
          </div>
        </div>
        
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>
            <Clock size={20} />
          </div>
          <div className={styles.overviewDetails}>
            <div className={styles.overviewLabel}>Processing Time</div>
            <div className={styles.overviewValue}>
              {processingStats?.serverProcessingTime?.total || 'N/A'}
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.dashboardGrid}>
        <div className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelHeader}>
            <FileText size={16} />
            <h3>Column Types</h3>
          </div>
          <div className={styles.columnTypeDistribution}>
            <div className={styles.columnTypeBar}>
              <div 
                className={styles.numericBar}
                style={{ width: `${(numericColumns / totalColumns * 100) || 0}%` }}
              >
                <Hash size={12} />
                <span>{numericColumns}</span>
              </div>
              <div 
                className={styles.categoricalBar}
                style={{ width: `${(categoricalColumns / totalColumns * 100) || 0}%` }}
              >
                <Type size={12} />
                <span>{categoricalColumns}</span>
              </div>
            </div>
            <div className={styles.columnTypeLegend}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.numericLegend}`}></div>
                <span>Numeric</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.categoricalLegend}`}></div>
                <span>Categorical</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelHeader}>
            <AlertTriangle size={16} />
            <h3>Quality Checks</h3>
          </div>
          <div className={styles.qualityCheckList}>
            {qualityChecks.map((check, idx) => (
              <div 
                key={idx} 
                className={`${styles.qualityCheckItem} ${styles[check.status]}`}
              >
                <div className={styles.qualityCheckIcon}>{check.icon}</div>
                <div className={styles.qualityCheckContent}>
                  <div className={styles.qualityCheckName}>{check.name}</div>
                  <div className={styles.qualityCheckMessage}>{check.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {worstColumn && (
        <div className={styles.dataQualityIssue}>
          <div className={styles.dataQualityIssueHeader}>
            <AlertTriangle size={16} />
            <h3>Data Quality Issue Detected</h3>
          </div>
          <div className={styles.dataQualityIssueContent}>
            <p>
              Column <strong>{worstColumn[0]}</strong> has the highest missing value rate at 
              <strong> {worstColumn[1].missingPercent.toFixed(1)}%</strong> 
              ({worstColumn[1].missingCount} missing values). 
              Consider cleaning this column before analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryDashboard;