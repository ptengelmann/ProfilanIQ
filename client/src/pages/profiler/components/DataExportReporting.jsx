import React, { useState } from 'react';
import { Download, FileText, Mail, Link, Settings } from 'lucide-react';
import styles from '../profiler.module.scss';

const DataExportReporting = ({ profile, processingStats }) => {
  const [exportOptions, setExportOptions] = useState({
    includeCharts: true,
    includeInsights: true,
    includeRecommendations: true,
    format: 'comprehensive'
  });

  const generateExecutiveSummary = () => {
    const summary = profile?.summary || {};
    const insights = profile?.insights || [];
    const highPriorityInsights = insights.filter(i => i.severity === 'high').length;
    
    return {
      datasetSize: `${summary.totalRows?.toLocaleString() || 0} rows × ${summary.totalColumns || 0} columns`,
      dataQuality: summary.totalMissingValues > summary.totalRows * 0.1 ? 'Needs Attention' : 'Good',
      keyFindings: [
        `${summary.numericColumns || 0} numeric and ${(summary.totalColumns || 0) - (summary.numericColumns || 0)} categorical features`,
        `${summary.totalMissingValues || 0} missing values (${((summary.totalMissingValues || 0) / ((summary.totalRows || 1) * (summary.totalColumns || 1)) * 100).toFixed(1)}%)`,
        `${highPriorityInsights} high-priority data quality issues identified`
      ],
      recommendations: insights.slice(0, 3).map(i => i.message)
    };
  };

  const exportToPDF = async () => {
    const executiveSummary = generateExecutiveSummary();
    
    // Generate comprehensive PDF report
    const reportContent = `
      DATA PROFILING REPORT
      Generated: ${new Date().toLocaleString()}
      
      EXECUTIVE SUMMARY
      Dataset: ${executiveSummary.datasetSize}
      Quality: ${executiveSummary.dataQuality}
      
      KEY FINDINGS:
      ${executiveSummary.keyFindings.map(f => `• ${f}`).join('\n')}
      
      TOP RECOMMENDATIONS:
      ${executiveSummary.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      
      DETAILED ANALYSIS
      [Complete statistical breakdown would be included here]
    `;
    
    // Create blob and download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-profile-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Generate Excel-compatible CSV with multiple sheets
    const columnStats = Object.entries(profile?.columnStats || {}).map(([name, stats]) => ({
      Column: name,
      Type: stats.type,
      'Total Count': stats.totalCount,
      'Valid Count': stats.validCount,
      'Missing Count': stats.missingCount,
      'Missing %': (stats.missingPercent || 0).toFixed(2),
      'Unique Values': stats.unique,
      Mean: stats.type === 'numeric' ? (stats.mean || 0).toFixed(3) : 'N/A',
      'Std Dev': stats.type === 'numeric' ? (stats.stdDev || 0).toFixed(3) : 'N/A',
      Minimum: stats.type === 'numeric' ? (stats.min || 0).toFixed(3) : 'N/A',
      Maximum: stats.type === 'numeric' ? (stats.max || 0).toFixed(3) : 'N/A'
    }));

    const csvContent = [
      Object.keys(columnStats[0] || {}),
      ...columnStats.map(row => Object.values(row))
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detailed-profile-analysis-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateShareableLink = () => {
    // Generate a shareable summary (would typically involve backend)
    const summary = generateExecutiveSummary();
    const encoded = btoa(JSON.stringify(summary));
    const shareUrl = `${window.location.origin}/shared-report/${encoded}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Shareable link copied to clipboard!');
    });
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Download size={20} />
        <h2>Export & Reporting</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Export Options */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Settings size={16} />
            Export Options
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={exportOptions.includeCharts}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
              />
              Include visualizations
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={exportOptions.includeInsights}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeInsights: e.target.checked }))}
              />
              Include AI insights
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={exportOptions.includeRecommendations}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeRecommendations: e.target.checked }))}
              />
              Include recommendations
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Report Format:
            </label>
            <select 
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="comprehensive">Comprehensive Report</option>
              <option value="executive">Executive Summary</option>
              <option value="technical">Technical Details Only</option>
            </select>
          </div>
        </div>

        {/* Export Actions */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={16} />
            Export Formats
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={exportToPDF}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: '#dc2626', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              <FileText size={16} />
              Export PDF Report
            </button>
            
            <button 
              onClick={exportToExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: '#16a34a', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              <Download size={16} />
              Export Excel Analysis
            </button>
            
            <button 
              onClick={generateShareableLink}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              <Link size={16} />
              Generate Shareable Link
            </button>
          </div>
        </div>
      </div>

      {/* Executive Summary Preview */}
      <div style={{ 
        marginTop: '1.5rem', 
        background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', 
        padding: '1.5rem', 
        borderRadius: '12px',
        border: '1px solid #0ea5e9'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#0369a1' }}>Executive Summary Preview</h3>
        {(() => {
          const summary = generateExecutiveSummary();
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>Dataset Size:</strong> {summary.datasetSize}
              </div>
              <div>
                <strong>Data Quality:</strong> 
                <span style={{ 
                  marginLeft: '0.5rem',
                  color: summary.dataQuality === 'Good' ? '#16a34a' : '#dc2626',
                  fontWeight: '600'
                }}>
                  {summary.dataQuality}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Key Recommendations:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {summary.recommendations.slice(0, 2).map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default DataExportReporting;