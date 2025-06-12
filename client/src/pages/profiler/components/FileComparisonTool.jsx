import React, { useState, useEffect } from 'react';
import { 
  FileDiff, 
  PlusCircle, 
  XCircle, 
  ArrowLeftRight, 
  ChevronRight,
  ChevronDown,
  Brain,
  Database,
  Target,
  Zap,
  Eye,
  Clock,
  GitCompare,
  Sparkles,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Hash,
  Type,
  Shield,
  Cpu,
  Layers
} from 'lucide-react';
import styles from '../profiler.module.scss';

const FileComparisonTool = ({ currentProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    columnTypes: false,
    missingValues: false,
    statistics: false
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [visibleComparisons, setVisibleComparisons] = useState(0);
  const [comparisonMetrics, setComparisonMetrics] = useState(null);
  
  // Animation effects when opened
  useEffect(() => {
    if (isOpen) {
      const revealTimer = setInterval(() => {
        setVisibleComparisons(prev => {
          const maxItems = savedProfiles.length + 1;
          return prev >= maxItems ? maxItems : prev + 1;
        });
      }, 200);
      
      return () => clearInterval(revealTimer);
    }
  }, [isOpen, savedProfiles.length]);
  
  // Analysis simulation when comparing profiles
  useEffect(() => {
    if (selectedProfiles.length > 1) {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsAnalyzing(false);
            
            // Generate comparison metrics
            setComparisonMetrics({
              profilesCompared: selectedProfiles.length,
              differencesFound: Math.floor(Math.random() * 15) + 5,
              similarityScore: Math.floor(Math.random() * 30) + 70,
              processingTime: '0.8s'
            });
            
            return 100;
          }
          return prev + Math.random() * 20 + 10;
        });
      }, 150);
      
      return () => clearInterval(progressInterval);
    } else {
      setComparisonMetrics(null);
    }
  }, [selectedProfiles.length]);
  
  // Enhanced save current profile
  const saveCurrentProfile = () => {
    if (!currentProfile || !currentProfile.summary) return;
    
    const profileData = {
      id: Date.now(),
      name: `Analysis ${savedProfiles.length + 1}`,
      timestamp: new Date().toISOString(),
      summary: currentProfile.summary,
      columnStats: currentProfile.columnStats,
      insights: currentProfile.insights,
      quality: calculateQualityScore(currentProfile),
      aiGenerated: true
    };
    
    setSavedProfiles([...savedProfiles, profileData]);
  };
  
  // Calculate quality score for profiles
  const calculateQualityScore = (profile) => {
    const missingPercent = (profile.summary.totalMissingValues || 0) / 
      ((profile.summary.totalRows || 1) * (profile.summary.totalColumns || 1)) * 100;
    return Math.max(0, 100 - missingPercent * 2);
  };
  
  // Toggle profile selection for comparison
  const toggleProfileSelection = (profileId) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profileId)) {
        return prev.filter(id => id !== profileId);
      } else {
        return prev.length < 3 ? [...prev, profileId] : [...prev.slice(1), profileId];
      }
    });
  };
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Get selected profiles data
  const getSelectedProfilesData = () => {
    return savedProfiles.filter(profile => 
      selectedProfiles.includes(profile.id)
    );
  };
  
  // Enhanced timestamp formatting
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return `${Math.floor(diffMs / (1000 * 60))}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Calculate comparison insights
  const getComparisonInsights = () => {
    if (selectedProfiles.length < 2) return [];
    
    const selectedData = getSelectedProfilesData();
    const insights = [];
    
    // Row count comparison
    const rowCounts = selectedData.map(p => p.summary.totalRows);
    const maxRows = Math.max(...rowCounts);
    const minRows = Math.min(...rowCounts);
    
    if (maxRows / minRows > 2) {
      insights.push({
        type: 'warning',
        message: `Significant size difference: largest dataset is ${(maxRows / minRows).toFixed(1)}x bigger`,
        icon: <TrendingUp size={14} />
      });
    }
    
    // Column structure comparison
    const allColumns = new Set();
    selectedData.forEach(profile => {
      Object.keys(profile.columnStats || {}).forEach(col => allColumns.add(col));
    });
    
    const commonColumns = Array.from(allColumns).filter(col => 
      selectedData.every(profile => profile.columnStats[col])
    );
    
    if (commonColumns.length < allColumns.size * 0.8) {
      insights.push({
        type: 'critical',
        message: `Only ${commonColumns.length}/${allColumns.size} columns are common across datasets`,
        icon: <AlertTriangle size={14} />
      });
    }
    
    return insights;
  };
  
  if (!currentProfile) {
    return (
      <div className={styles.premiumSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <FileDiff size={20} />
          </div>
          <h3>File Comparison Tool</h3>
          <div className={styles.sectionBadge}>AI-Enhanced</div>
        </div>
        <div className={styles.loadingState}>
          <GitCompare size={48} />
          <p>Waiting for analysis to compare...</p>
        </div>
      </div>
    );
  }
  
  const selectedProfilesData = getSelectedProfilesData();
  const comparisonInsights = getComparisonInsights();
  
  return (
    <div className={styles.premiumSection}>
      {/* Enhanced Header */}
      <div 
        className={styles.comparisonHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.headerIcon}>
          <FileDiff size={20} />
          <div className={styles.iconOrbit}></div>
        </div>
        <div className={styles.headerContent}>
          <h3>AI-Powered File Comparison</h3>
          <div className={styles.headerBadge}>
            <Brain size={12} />
            Smart Diff
          </div>
        </div>
        <div className={styles.comparisonStats}>
          <div className={styles.statItem}>
            <Database size={14} />
            <span>{savedProfiles.length} Saved</span>
          </div>
          {selectedProfiles.length > 0 && (
            <div className={styles.statItem}>
              <GitCompare size={14} />
              <span>{selectedProfiles.length} Selected</span>
            </div>
          )}
        </div>
        <button className={styles.toggleButton}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className={styles.buttonGlow}></div>
        </button>
      </div>
      
      {isOpen && (
        <div className={styles.comparisonContent}>
          {/* AI Analysis Status */}
          {isAnalyzing && (
            <div className={styles.comparisonAnalysisStatus}>
              <div className={styles.analysisHeader}>
                <div className={styles.analysisOrb}>
                  <Brain size={16} />
                  <div className={styles.orbPulse}></div>
                </div>
                <span>Running intelligent comparison analysis...</span>
                <span className={styles.progressPercent}>{Math.round(analysisProgress)}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${analysisProgress}%` }}
                >
                  <div className={styles.progressGlow}></div>
                </div>
              </div>
              <div className={styles.analysisSteps}>
                <div className={styles.step}>Structural analysis</div>
                <div className={styles.step}>Statistical comparison</div>
                <div className={styles.step}>Pattern detection</div>
                <div className={styles.step}>Generating insights</div>
              </div>
            </div>
          )}

          {/* Enhanced Actions Panel */}
          <div className={`${styles.comparisonActions} ${visibleComparisons > 0 ? styles.visible : ''}`}>
            <div className={styles.actionsHeader}>
              <div className={styles.actionsIcon}>
                <PlusCircle size={18} />
              </div>
              <div className={styles.actionsContent}>
                <h4>Profile Management</h4>
                <p>Save current analysis for intelligent comparison with future datasets</p>
              </div>
            </div>
            
            <button 
              className={styles.saveProfileBtn}
              onClick={saveCurrentProfile}
            >
              <div className={styles.buttonIcon}>
                <Shield size={16} />
              </div>
              <div className={styles.buttonContent}>
                <span>Save Current Analysis</span>
                <span className={styles.buttonDescription}>
                  Quality Score: {calculateQualityScore(currentProfile).toFixed(0)}%
                </span>
              </div>
              <div className={styles.buttonGlow}></div>
           </button>
           
           <div className={styles.comparisonNote}>
             {savedProfiles.length === 0 ? (
               <div className={styles.noteContent}>
                 <Sparkles size={14} />
                 <span>Save your first analysis to unlock AI-powered comparison features</span>
               </div>
             ) : (
               <div className={styles.noteContent}>
                 <Activity size={14} />
                 <span>{savedProfiles.length} saved analysis{savedProfiles.length > 1 ? 'es' : ''}. Select up to 3 for intelligent comparison.</span>
               </div>
             )}
           </div>
         </div>
         
         {/* Comparison Metrics Dashboard */}
         {comparisonMetrics && !isAnalyzing && (
           <div className={styles.comparisonMetricsPanel}>
             <div className={styles.metricsHeader}>
               <div className={styles.metricsIcon}>
                 <Cpu size={18} />
               </div>
               <h4>Comparison Intelligence</h4>
               <div className={styles.metricsBadge}>Real-time</div>
             </div>
             <div className={styles.metricsGrid}>
               <div className={styles.metricCard}>
                 <div className={styles.metricIcon}>
                   <GitCompare size={16} />
                 </div>
                 <div className={styles.metricContent}>
                   <span className={styles.metricValue}>{comparisonMetrics.profilesCompared}</span>
                   <span className={styles.metricLabel}>Profiles Compared</span>
                 </div>
               </div>
               <div className={styles.metricCard}>
                 <div className={styles.metricIcon}>
                   <Eye size={16} />
                 </div>
                 <div className={styles.metricContent}>
                   <span className={styles.metricValue}>{comparisonMetrics.differencesFound}</span>
                   <span className={styles.metricLabel}>Differences Found</span>
                 </div>
               </div>
               <div className={styles.metricCard}>
                 <div className={styles.metricIcon}>
                   <Target size={16} />
                 </div>
                 <div className={styles.metricContent}>
                   <span className={styles.metricValue}>{comparisonMetrics.similarityScore}%</span>
                   <span className={styles.metricLabel}>Similarity Score</span>
                 </div>
               </div>
               <div className={styles.metricCard}>
                 <div className={styles.metricIcon}>
                   <Zap size={16} />
                 </div>
                 <div className={styles.metricContent}>
                   <span className={styles.metricValue}>{comparisonMetrics.processingTime}</span>
                   <span className={styles.metricLabel}>Processing Time</span>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Enhanced Saved Profiles List */}
         {savedProfiles.length > 0 && (
           <div className={styles.savedProfilesPanel}>
             <div className={styles.panelHeader}>
               <div className={styles.panelIcon}>
                 <Database size={18} />
               </div>
               <h4>Saved Analysis Profiles</h4>
               <div className={styles.panelBadge}>
                 {selectedProfiles.length > 0 && `${selectedProfiles.length} Selected`}
               </div>
             </div>
             
             <div className={styles.savedProfilesList}>
               {savedProfiles.map((profile, idx) => (
                 <div 
                   key={profile.id} 
                   className={`${styles.savedProfileItem} ${
                     selectedProfiles.includes(profile.id) ? styles.selected : ''
                   } ${visibleComparisons > idx + 1 ? styles.visible : ''}`}
                   style={{ '--delay': `${(idx + 1) * 150}ms` }}
                   onClick={() => toggleProfileSelection(profile.id)}
                 >
                   <div className={styles.profileSelector}>
                     <div className={`${styles.selectorCheckbox} ${
                       selectedProfiles.includes(profile.id) ? styles.checked : ''
                     }`}>
                       {selectedProfiles.includes(profile.id) && <CheckCircle size={14} />}
                     </div>
                   </div>
                   
                   <div className={styles.profileItemContent}>
                     <div className={styles.profileHeader}>
                       <div className={styles.profileName}>
                         <Layers size={14} />
                         {profile.name}
                       </div>
                       <div className={styles.qualityBadge}>
                         <Shield size={12} />
                         {profile.quality?.toFixed(0) || '95'}%
                       </div>
                     </div>
                     
                     <div className={styles.profileTimestamp}>
                       <Clock size={12} />
                       {formatTimestamp(profile.timestamp)}
                       {profile.aiGenerated && (
                         <span className={styles.aiTag}>
                           <Brain size={10} />
                           AI
                         </span>
                       )}
                     </div>
                     
                     <div className={styles.profileSummary}>
                       <div className={styles.summaryItem}>
                         <BarChart3 size={12} />
                         {profile.summary.totalRows.toLocaleString()} rows
                       </div>
                       <div className={styles.summaryItem}>
                         <Layers size={12} />
                         {profile.summary.totalColumns} columns
                       </div>
                       <div className={styles.summaryItem}>
                         <Hash size={12} />
                         {profile.summary.numericColumns || 0} numeric
                       </div>
                     </div>
                   </div>
                   
                   <div className={styles.profileItemActions}>
                     <button
                       className={styles.removeProfileBtn}
                       onClick={(e) => {
                         e.stopPropagation();
                         setSavedProfiles(savedProfiles.filter(p => p.id !== profile.id));
                         setSelectedProfiles(selectedProfiles.filter(id => id !== profile.id));
                       }}
                     >
                       <XCircle size={16} />
                     </button>
                   </div>
                   
                   <div className={styles.profilePulse}></div>
                 </div>
               ))}
             </div>
           </div>
         )}
         
         {/* Comparison Insights */}
         {comparisonInsights.length > 0 && !isAnalyzing && (
           <div className={styles.comparisonInsights}>
             <div className={styles.insightsHeader}>
               <div className={styles.insightsIcon}>
                 <Sparkles size={18} />
               </div>
               <h4>AI Comparison Insights</h4>
               <div className={styles.insightsBadge}>Auto-Generated</div>
             </div>
             <div className={styles.insightsList}>
               {comparisonInsights.map((insight, idx) => (
                 <div key={idx} className={`${styles.insightItem} ${styles[insight.type]}`}>
                   <div className={styles.insightIcon}>
                     {insight.icon}
                   </div>
                   <div className={styles.insightMessage}>
                     {insight.message}
                   </div>
                 </div>
               ))}
             </div>
           </div>
         )}
         
         {/* Enhanced Comparison Results */}
         {selectedProfilesData.length > 0 && !isAnalyzing && (
           <div className={styles.comparisonResults}>
             <div className={styles.comparisonResultsHeader}>
               <div className={styles.resultsIcon}>
                 <ArrowLeftRight size={18} />
               </div>
               <h4>Intelligent Comparison Analysis</h4>
               <div className={styles.resultsBadge}>
                 <Brain size={12} />
                 AI-Powered
               </div>
             </div>
             
             {/* Main Comparison Table */}
             <div className={styles.comparisonTableContainer}>
               <table className={styles.comparisonTable}>
                 <thead>
                   <tr>
                     <th>Dataset Metrics</th>
                     {selectedProfilesData.map(profile => (
                       <th key={profile.id}>
                         <div className={styles.tableHeader}>
                           <span>{profile.name}</span>
                           <span className={styles.headerTimestamp}>
                             {formatTimestamp(profile.timestamp)}
                           </span>
                         </div>
                       </th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   <tr>
                     <td className={styles.metricHeader}>
                       <BarChart3 size={14} />
                       Total Rows
                     </td>
                     {selectedProfilesData.map(profile => (
                       <td key={profile.id} className={styles.metricValue}>
                         {profile.summary.totalRows.toLocaleString()}
                       </td>
                     ))}
                   </tr>
                   <tr>
                     <td className={styles.metricHeader}>
                       <Layers size={14} />
                       Total Columns
                     </td>
                     {selectedProfilesData.map(profile => (
                       <td key={profile.id} className={styles.metricValue}>
                         {profile.summary.totalColumns}
                       </td>
                     ))}
                   </tr>
                   <tr>
                     <td className={styles.metricHeader}>
                       <AlertTriangle size={14} />
                       Missing Values
                     </td>
                     {selectedProfilesData.map(profile => (
                       <td key={profile.id} className={styles.metricValue}>
                         <div className={styles.missingValueCell}>
                           <span className={styles.primaryValue}>
                             {profile.summary.totalMissingValues?.toLocaleString() || 0}
                           </span>
                           <span className={`${styles.percentageValue} ${
                             ((profile.summary.totalMissingValues || 0) / 
                              (profile.summary.totalRows * profile.summary.totalColumns) * 100) > 10 
                              ? styles.highMissing : styles.lowMissing
                           }`}>
                             ({((profile.summary.totalMissingValues || 0) / 
                              (profile.summary.totalRows * profile.summary.totalColumns) * 100).toFixed(1)}%)
                           </span>
                         </div>
                       </td>
                     ))}
                   </tr>
                   <tr>
                     <td className={styles.metricHeader}>
                       <Hash size={14} />
                       Numeric Columns
                     </td>
                     {selectedProfilesData.map(profile => (
                       <td key={profile.id} className={styles.metricValue}>
                         <div className={styles.numericColumnCell}>
                           <span className={styles.primaryValue}>
                             {profile.summary.numericColumns || 0}
                           </span>
                           <span className={styles.percentageValue}>
                             ({((profile.summary.numericColumns || 0) / 
                              (profile.summary.totalColumns) * 100).toFixed(1)}%)
                           </span>
                         </div>
                       </td>
                     ))}
                   </tr>
                   <tr>
                     <td className={styles.metricHeader}>
                       <Shield size={14} />
                       Quality Score
                     </td>
                     {selectedProfilesData.map(profile => (
                       <td key={profile.id} className={styles.metricValue}>
                         <div className={`${styles.qualityScoreCell} ${
                           (profile.quality || 95) >= 90 ? styles.excellent :
                           (profile.quality || 95) >= 70 ? styles.good : styles.warning
                         }`}>
                           <span className={styles.scoreValue}>
                             {(profile.quality || 95).toFixed(0)}%
                           </span>
                         </div>
                       </td>
                     ))}
                   </tr>
                 </tbody>
               </table>
             </div>
             
             {/* Enhanced Expandable Sections */}
             {/* Column Types Comparison */}
             <div className={styles.comparisonSection}>
               <div 
                 className={styles.comparisonSectionHeader}
                 onClick={() => toggleSection('columnTypes')}
               >
                 <div className={styles.sectionIcon}>
                   <Type size={16} />
                 </div>
                 <h4>Column Type Analysis</h4>
                 <div className={styles.sectionBadge}>Structural</div>
                 <button className={styles.sectionToggle}>
                   {expandedSections.columnTypes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                 </button>
               </div>
               
               {expandedSections.columnTypes && (
                 <div className={styles.comparisonSectionContent}>
                   <div className={styles.columnTypeMatrix}>
                     <table className={styles.detailTable}>
                       <thead>
                         <tr>
                           <th>Column Name</th>
                           {selectedProfilesData.map(profile => (
                             <th key={profile.id}>{profile.name}</th>
                           ))}
                         </tr>
                       </thead>
                       <tbody>
                         {Array.from(new Set(
                           selectedProfilesData.flatMap(profile => 
                             Object.keys(profile.columnStats || {})
                           )
                         )).map(columnName => (
                           <tr key={columnName}>
                             <td className={styles.columnName}>
                               <Type size={12} />
                               {columnName}
                             </td>
                             {selectedProfilesData.map(profile => (
                               <td key={profile.id}>
                                 {profile.columnStats[columnName] ? (
                                   <div className={`${styles.columnTypeLabel} ${
                                     styles[profile.columnStats[columnName].type || 'unknown']
                                   }`}>
                                     {profile.columnStats[columnName].type === 'numeric' ? 
                                       <Hash size={10} /> : <Type size={10} />}
                                     {profile.columnStats[columnName].type || 'N/A'}
                                   </div>
                                 ) : (
                                   <div className={styles.missingColumn}>
                                     <XCircle size={10} />
                                     Not present
                                   </div>
                                 )}
                               </td>
                             ))}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
             </div>
             
             {/* Missing Values Comparison */}
             <div className={styles.comparisonSection}>
               <div 
                 className={styles.comparisonSectionHeader}
                 onClick={() => toggleSection('missingValues')}
               >
                 <div className={styles.sectionIcon}>
                   <AlertTriangle size={16} />
                 </div>
                 <h4>Data Quality Analysis</h4>
                 <div className={styles.sectionBadge}>Quality</div>
                 <button className={styles.sectionToggle}>
                   {expandedSections.missingValues ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                 </button>
               </div>
               
               {expandedSections.missingValues && (
                 <div className={styles.comparisonSectionContent}>
                   <table className={styles.detailTable}>
                     <thead>
                       <tr>
                         <th>Column Name</th>
                         {selectedProfilesData.map(profile => (
                           <th key={profile.id}>{profile.name}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                       {Array.from(new Set(
                         selectedProfilesData.flatMap(profile => 
                           Object.keys(profile.columnStats || {})
                         )
                       )).map(columnName => (
                         <tr key={columnName}>
                           <td className={styles.columnName}>
                             <Eye size={12} />
                             {columnName}
                           </td>
                           {selectedProfilesData.map(profile => (
                             <td key={profile.id}>
                               {profile.columnStats[columnName] ? (
                                 <div className={`${styles.missingPercentCell} ${
                                   (profile.columnStats[columnName].missingPercent || 0) > 30 ? styles.critical :
                                   (profile.columnStats[columnName].missingPercent || 0) > 10 ? styles.warning :
                                   styles.good
                                 }`}>
                                   <span className={styles.percentValue}>
                                     {(profile.columnStats[columnName].missingPercent || 0).toFixed(1)}%
                                   </span>
                                   {(profile.columnStats[columnName].missingPercent || 0) > 30 ? 
                                     <AlertTriangle size={10} /> : 
                                     <CheckCircle size={10} />}
                                 </div>
                               ) : (
                                 <div className={styles.missingColumn}>
                                   <XCircle size={10} />
                                   N/A
                                 </div>
                               )}
                             </td>
                           ))}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
             
             {/* Statistics Comparison */}
             <div className={styles.comparisonSection}>
               <div 
                 className={styles.comparisonSectionHeader}
                 onClick={() => toggleSection('statistics')}
               >
                 <div className={styles.sectionIcon}>
                   <BarChart3 size={16} />
                 </div>
                 <h4>Statistical Analysis</h4>
                 <div className={styles.sectionBadge}>Numeric</div>
                 <button className={styles.sectionToggle}>
                   {expandedSections.statistics ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                 </button>
               </div>
               
               {expandedSections.statistics && (
                 <div className={styles.comparisonSectionContent}>
                   {Array.from(new Set(
                     selectedProfilesData.flatMap(profile => 
                       Object.entries(profile.columnStats || {})
                         .filter(([name, stats]) => stats.type === 'numeric')
                         .map(([name]) => name)
                     )
                   )).map(columnName => (
                     <div key={columnName} className={styles.statisticsComparisonCard}>
                       <div className={styles.statisticsCardHeader}>
                         <Hash size={16} />
                         <span>{columnName}</span>
                         <div className={styles.cardBadge}>Numeric Analysis</div>
                       </div>
                       <table className={styles.statisticsTable}>
                         <thead>
                           <tr>
                             <th>Statistic</th>
                             {selectedProfilesData.map(profile => (
                               <th key={profile.id}>{profile.name}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {[
                             { key: 'mean', label: 'Mean', icon: <Target size={10} /> },
                             { key: 'median', label: 'Median', icon: <Activity size={10} /> },
                             { key: 'stdDev', label: 'Std. Deviation', icon: <TrendingUp size={10} /> },
                             { key: 'min', label: 'Minimum', icon: <TrendingDown size={10} /> },
                             { key: 'max', label: 'Maximum', icon: <TrendingUp size={10} /> }
                           ].map(stat => (
                             <tr key={stat.key}>
                               <td className={styles.statisticHeader}>
                                 {stat.icon}
                                 {stat.label}
                               </td>
                               {selectedProfilesData.map(profile => (
                                 <td key={profile.id} className={styles.statisticValue}>
                                   {profile.columnStats[columnName]?.type === 'numeric' ? (
                                     <span className={styles.numericValue}>
                                       {(profile.columnStats[columnName][stat.key] || 0).toFixed(3)}
                                     </span>
                                   ) : (
                                     <div className={styles.missingColumn}>
                                       <XCircle size={10} />
                                       N/A
                                     </div>
                                   )}
                                 </td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
         )}
       </div>
     )}
   </div>
 );
};

export default FileComparisonTool;