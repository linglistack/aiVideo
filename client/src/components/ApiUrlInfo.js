import React from 'react';
import config from '../services/config';

/**
 * Component to display current API URL configuration
 * Only use in development or for debugging
 */
const ApiUrlInfo = ({ showInProduction = false }) => {
  // Don't show in production unless explicitly enabled
  if (config.isProduction && !showInProduction) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      backgroundColor: '#f0f0f0',
      padding: '8px', 
      borderRadius: '4px', 
      fontSize: '12px',
      zIndex: 9999,
      border: '1px solid #ccc',
      maxWidth: '300px'
    }}>
      <div><strong>API Mode:</strong> {config.isProduction ? 'Production' : 'Development'}</div>
      <div><strong>API URL:</strong> {config.apiBaseUrl}</div>
    </div>
  );
};

export default ApiUrlInfo; 