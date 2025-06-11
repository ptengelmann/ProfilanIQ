import React, { useState } from 'react';
import { 
  FileDiff, 
  PlusCircle, 
  XCircle, 
  ArrowLeftRight, 
  ChevronRight,
  ChevronDown
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
  
  // Save current profile for comparison
  const saveCurrentProfile = () => {
    if (!currentProfile || !currentProfile.summary) return;
    
    const profileData = {
      id: Date.now(),
      name: `Analysis ${savedProfiles.length + 1}`,
      timestamp: new Date().toISOString(),
      summary: currentProfile.summary,
      columnStats: currentProfile.columnStats,
      insights: currentProfile.insights
    };
    
    setSavedProfiles([...savedProfiles, profileData]);
  };
  
  // Toggle profile selection for comparison
  const toggleProfileSelection = (profileId) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profileId)) {
        return prev.filter(id => id !== profileId);
      } else {
        // Limit to 3 selections maximum
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
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };
  
  if (!currentProfile) return null;
  
  const selectedProfilesData = getSelectedProfilesData();
  
  return (
    <div className={styles.fileComparisonTool}>
      <div 
        className={styles.comparisonHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <FileDiff size={18} />
        <h3>File Comparison Tool</h3>
        <button className={styles.toggleButton}>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      
      {isOpen && (
        <div className={styles.comparisonContent}>
          <div className={styles.comparisonActions}>
            <button 
              className={styles.saveProfileBtn}
              onClick={saveCurrentProfile}
            >
              <PlusCircle size={16} />
              Save Current Analysis
            </button>
            
            <p className={styles.comparisonNote}>
              {savedProfiles.length === 0 
                ? 'Save the current analysis to compare with future file analyses.' 
                : `${savedProfiles.length} saved analysis${savedProfiles.length > 1 ? 'es' : ''}. Select up to 3 to compare.`}
            </p>
          </div>
          
          {savedProfiles.length > 0 && (
            <div className={styles.savedProfilesList}>
              {savedProfiles.map(profile => (
                <div 
                  key={profile.id} 
                  className={`${styles.savedProfileItem} ${
                    selectedProfiles.includes(profile.id) ? styles.selected : ''
                  }`}
                  onClick={() => toggleProfileSelection(profile.id)}
                >
                  <div className={styles.profileItemContent}>
                    <div className={styles.profileName}>{profile.name}</div>
                    <div className={styles.profileTimestamp}>
                      {formatTimestamp(profile.timestamp)}
                    </div>
                    <div className={styles.profileSummary}>
                      {profile.summary.totalRows.toLocaleString()} rows, 
                      {profile.summary.totalColumns} columns
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
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {selectedProfilesData.length > 0 && (
            <div className={styles.comparisonResults}>
              <div className={styles.comparisonResultsHeader}>
                <ArrowLeftRight size={16} />
                <h4>Comparison Results</h4>
              </div>
              
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {selectedProfilesData.map(profile => (
                      <th key={profile.id}>{profile.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.metricHeader}>Total Rows</td>
                    {selectedProfilesData.map(profile => (
                      <td key={profile.id}>
                        {profile.summary.totalRows.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={styles.metricHeader}>Total Columns</td>
                    {selectedProfilesData.map(profile => (
                      <td key={profile.id}>
                        {profile.summary.totalColumns}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={styles.metricHeader}>Missing Values</td>
                    {selectedProfilesData.map(profile => (
                      <td key={profile.id}>
                        {profile.summary.totalMissingValues?.toLocaleString() || 0}
                        <span className={styles.percentageValue}>
                          ({((profile.summary.totalMissingValues || 0) / 
                           (profile.summary.totalRows * profile.summary.totalColumns) * 100).toFixed(1)}%)
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={styles.metricHeader}>Numeric Columns</td>
                    {selectedProfilesData.map(profile => (
                      <td key={profile.id}>
                        {profile.summary.numericColumns || 0}
                        <span className={styles.percentageValue}>
                          ({((profile.summary.numericColumns || 0) / 
                           (profile.summary.totalColumns) * 100).toFixed(1)}%)
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              
              {/* Column Types Comparison */}
              <div className={styles.comparisonSection}>
                <div 
                  className={styles.comparisonSectionHeader}
                  onClick={() => toggleSection('columnTypes')}
                >
                  <h4>Column Type Comparison</h4>
                  <button className={styles.toggleButton}>
                    {expandedSections.columnTypes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
                
                {expandedSections.columnTypes && (
                  <div className={styles.comparisonSectionContent}>
                    <div className={styles.columnTypeMatrix}>
                      {/* Create a matrix of columns and their types across profiles */}
                      <table className={styles.comparisonTable}>
                        <thead>
                          <tr>
                            <th>Column</th>
                            {selectedProfilesData.map(profile => (
                              <th key={profile.id}>{profile.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Get all unique column names across all selected profiles */}
                          {Array.from(new Set(
                            selectedProfilesData.flatMap(profile => 
                              Object.keys(profile.columnStats || {})
                            )
                          )).map(columnName => (
                            <tr key={columnName}>
                              <td className={styles.metricHeader}>{columnName}</td>
                              {selectedProfilesData.map(profile => (
                                <td key={profile.id}>
                                  {profile.columnStats[columnName] ? (
                                    <div className={`${styles.columnTypeLabel} ${
                                      styles[profile.columnStats[columnName].type || 'unknown']
                                    }`}>
                                      {profile.columnStats[columnName].type || 'N/A'}
                                    </div>
                                  ) : (
                                    <div className={styles.missingColumn}>Not present</div>
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
                  <h4>Missing Values Comparison</h4>
                  <button className={styles.toggleButton}>
                    {expandedSections.missingValues ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
                
                {expandedSections.missingValues && (
                  <div className={styles.comparisonSectionContent}>
                    <table className={styles.comparisonTable}>
                      <thead>
                        <tr>
                          <th>Column</th>
                          {selectedProfilesData.map(profile => (
                            <th key={profile.id}>{profile.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Get all unique column names across all selected profiles */}
                        {Array.from(new Set(
                          selectedProfilesData.flatMap(profile => 
                            Object.keys(profile.columnStats || {})
                          )
                        )).map(columnName => (
                          <tr key={columnName}>
                            <td className={styles.metricHeader}>{columnName}</td>
                            {selectedProfilesData.map(profile => (
                              <td key={profile.id} className={
                                profile.columnStats[columnName]?.missingPercent > 30 ? styles.highMissingCell :
                                profile.columnStats[columnName]?.missingPercent > 10 ? styles.mediumMissingCell :
                                ''
                              }>
                                {profile.columnStats[columnName] ? (
                                  <>{(profile.columnStats[columnName].missingPercent || 0).toFixed(1)}%</>
                                ) : (
                                  <div className={styles.missingColumn}>N/A</div>
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
                  <h4>Numeric Statistics Comparison</h4>
                  <button className={styles.toggleButton}>
                    {expandedSections.statistics ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
                
                {expandedSections.statistics && (
                  <div className={styles.comparisonSectionContent}>
                    {/* Get all numeric columns across all selected profiles */}
                    {Array.from(new Set(
                      selectedProfilesData.flatMap(profile => 
                        Object.entries(profile.columnStats || {})
                          .filter(([name, stats]) => stats.type === 'numeric')
                          .map(([name]) => name)
                      )
                    )).map(columnName => (
                      <div key={columnName} className={styles.statisticsComparisonCard}>
                        <div className={styles.statisticsCardHeader}>{columnName}</div>
                        <table className={styles.comparisonTable}>
                          <thead>
                            <tr>
                              <th>Statistic</th>
                              {selectedProfilesData.map(profile => (
                                <th key={profile.id}>{profile.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {['mean', 'median', 'stdDev', 'min', 'max'].map(stat => (
                              <tr key={stat}>
                                <td className={styles.metricHeader}>
                                  {{
                                    'mean': 'Mean',
                                    'median': 'Median',
                                    'stdDev': 'Std. Deviation',
                                    'min': 'Minimum',
                                    'max': 'Maximum'
                                  }[stat]}
                                </td>
                                {selectedProfilesData.map(profile => (
                                  <td key={profile.id}>
                                    {profile.columnStats[columnName]?.type === 'numeric' ? (
                                      <>{(profile.columnStats[columnName][stat] || 0).toFixed(3)}</>
                                    ) : (
                                      <div className={styles.missingColumn}>N/A</div>
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