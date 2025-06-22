// src/index.js - Complete Ovation Survey Sync Service with Dashboard
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const path = require('path');
const OvationSyncService = require('./sync-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Initialize sync service
const syncService = new OvationSyncService({
  ovationConfig: {
    baseUrl: process.env.OVATION_BASE_URL || 'https://partner.ovationup.com/partner-services/v2',
    clientId: process.env.OVATION_CLIENT_ID,
    clientSecret: process.env.OVATION_CLIENT_SECRET,
    partnerName: process.env.OVATION_PARTNER_ID,
    companyIds: process.env.OVATION_COMPANY_IDS?.split(',') || []
  },
  supabaseConfig: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
});

// Dashboard route - Main page
// Fixed Dashboard Route for src/index.js
// Replace the app.get('/', ...) route with this corrected version

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🍞 Ovation Survey Sync</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            header {
                text-align: center;
                color: white;
                margin-bottom: 30px;
            }
            
            h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .subtitle {
                opacity: 0.9;
                font-size: 1.2rem;
            }
            
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .card {
                background: white;
                border-radius: 10px;
                padding: 25px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
            }
            
            .card h2 {
                font-size: 1.3rem;
                margin-bottom: 20px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            
            .stat-item {
                text-align: center;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .stat-value {
                font-size: 2rem;
                font-weight: bold;
                color: #667eea;
            }
            
            .stat-label {
                color: #666;
                font-size: 0.9rem;
                margin-top: 5px;
            }
            
            button {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 5px;
            }
            
            button:hover:not(:disabled) {
                background: #5a67d8;
            }
            
            button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 0.8s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .status-indicator {
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
            }
            
            .status-indicator.healthy {
                background: #4CAF50;
                box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
            }
            
            .status-indicator.warning {
                background: #ff9800;
                box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.2);
            }
            
            .status-indicator.error {
                background: #f44336;
                box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
            }
            
            .error-message {
                background: #ffebee;
                color: #c62828;
                padding: 15px;
                border-radius: 6px;
                margin: 10px 0;
            }
            
            .last-updated {
                text-align: center;
                color: white;
                opacity: 0.8;
                font-size: 0.9rem;
            }
            
            .button-group {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>📦 Great Harvest Crown Point</h1>
                <div class="subtitle">Survey Sync Service Dashboard</div>
            </header>
            
            <div class="dashboard-grid">
                <div class="card">
                    <h2>🔄 Service Status</h2>
                    <div id="status">
                        <div class="loading"></div> Loading status...
                    </div>
                    <div class="button-group">
                        <button id="refreshBtn" onclick="refreshStatus()">🔄 Refresh Status</button>
                        <button id="syncBtn" onclick="triggerSync()">🚀 Trigger Sync</button>
                    </div>
                </div>
                
                <div class="card">
                    <h2>📊 Statistics</h2>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value" id="totalRuns">-</div>
                            <div class="stat-label">Total Runs</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="successfulRuns">-</div>
                            <div class="stat-label">Successful</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="surveysProcessed">-</div>
                            <div class="stat-label">Processed</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="newSurveysAdded">-</div>
                            <div class="stat-label">New Added</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h2>💾 Database</h2>
                    <div style="text-align: center; padding: 20px;">
                        <div class="stat-value" id="totalSurveys">-</div>
                        <div class="stat-label">Total Surveys in Database</div>
                    </div>
                </div>
            </div>
            
            <div class="last-updated">
                Last updated: <span id="lastUpdated">Loading...</span>
            </div>
        </div>
        
        <script>
        // Fixed Dashboard JavaScript with hang prevention
        let isRefreshing = false;
        let isSyncing = false;
        let refreshInterval = null;

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🍞 Dashboard loaded, fetching status...');
            refreshStatus();
            
            // Auto-refresh every 30 seconds with proper cleanup
            refreshInterval = setInterval(() => {
                // Only refresh if not already refreshing or syncing
                if (!isRefreshing && !isSyncing) {
                    refreshStatus();
                }
            }, 30000);
        });

        // Clean up interval on page unload
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        });

        // Helper function for fetch with timeout
        async function fetchWithTimeout(url, options = {}, timeout = 10000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - server not responding');
                }
                throw error;
            }
        }

        async function refreshStatus() {
            if (isRefreshing || isSyncing) {
                console.log('⏳ Already busy, skipping refresh...');
                return;
            }
            
            isRefreshing = true;
            const refreshBtn = document.getElementById('refreshBtn');
            const statusDiv = document.getElementById('status');
            
            try {
                // Update button state
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<div class="loading"></div> Refreshing...';
                
                console.log('📊 Fetching status from /status endpoint...');
                
                const response = await fetchWithTimeout('/status', {}, 10000);
                console.log('📞 Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                const data = await response.json();
                console.log('📦 Received data:', data);
                
                if (data.success && data.data) {
                    updateDashboard(data.data);
                    console.log('✅ Dashboard updated successfully');
                } else {
                    throw new Error(data.error || 'Invalid response format');
                }
                
                // Success feedback
                refreshBtn.innerHTML = '✅ Updated!';
                setTimeout(() => {
                    refreshBtn.innerHTML = '🔄 Refresh Status';
                    refreshBtn.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('❌ Error refreshing status:', error);
                
                // Use textContent for error message to prevent XSS
                statusDiv.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = '<strong>❌ Error loading status:</strong><br>';
                const errorText = document.createElement('span');
                errorText.textContent = error.message;
                errorDiv.appendChild(errorText);
                statusDiv.appendChild(errorDiv);
                
                refreshBtn.innerHTML = '❌ Error';
                setTimeout(() => {
                    refreshBtn.innerHTML = '🔄 Refresh Status';
                    refreshBtn.disabled = false;
                }, 3000);
            } finally {
                isRefreshing = false;
                updateTimestamp();
            }
        }

        function updateDashboard(status) {
            const isHealthy = status.isHealthy;
            const stats = status.stats || {};
            const database = status.database || {};
            const ovation = status.ovation || {};
            
            // Update main status display using DOM manipulation for safety
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = ''; // Clear existing content
            
            // Status indicator
            const statusClass = isHealthy ? 'healthy' : (stats.errors > stats.successfulRuns ? 'error' : 'warning');
            const statusText = isHealthy ? '✅ Service Healthy' : 
                              (stats.errors > stats.successfulRuns ? '❌ Service Error' : '⚠️ Service Warning');
            
            const mainStatus = document.createElement('div');
            mainStatus.style.fontSize = '1.2rem';
            mainStatus.style.marginBottom = '15px';
            mainStatus.innerHTML = \`<span class="status-indicator \${statusClass}"></span><strong>\${statusText}</strong>\`;
            statusDiv.appendChild(mainStatus);
            
            // Create grid container
            const gridContainer = document.createElement('div');
            gridContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem;';
            
            // Add grid items safely
            const gridItems = [
                { label: 'Last Run', value: stats.lastRun ? new Date(stats.lastRun).toLocaleString() : 'Never' },
                { label: 'Last Success', value: stats.lastSuccess ? new Date(stats.lastSuccess).toLocaleString() : 'None' },
                { label: 'Token Valid', value: ovation.hasValidToken ? '✅ Yes' : '❌ No' },
                { label: 'Token Expires', value: ovation.tokenExpiry ? new Date(ovation.tokenExpiry).toLocaleString() : 'N/A' },
                { label: 'Uptime', value: \`\${Math.round((status.uptime || 0) / 60)} minutes\` },
                { label: 'Success Rate', value: \`\${Math.round(((stats.successfulRuns || 0) / Math.max(stats.totalRuns || 1, 1)) * 100)}%\` }
            ];
            
            gridItems.forEach(item => {
                const div = document.createElement('div');
                const strong = document.createElement('strong');
                strong.textContent = \`\${item.label}: \`;
                div.appendChild(strong);
                div.appendChild(document.createTextNode(item.value));
                gridContainer.appendChild(div);
            });
            
            statusDiv.appendChild(gridContainer);
            
            // Update statistics safely
            const statElements = {
                'totalRuns': stats.totalRuns || 0,
                'successfulRuns': stats.successfulRuns || 0,
                'surveysProcessed': stats.surveysProcessed || 0,
                'newSurveysAdded': stats.newSurveysAdded || 0,
                'totalSurveys': (database.totalSurveys || 0).toLocaleString()
            };
            
            Object.entries(statElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }

        async function triggerSync() {
            if (isSyncing || isRefreshing) {
                console.log('⏳ Another operation in progress, skipping sync...');
                showNotification('Another operation is in progress. Please wait...', 'warning');
                return;
            }
            
            isSyncing = true;
            const syncBtn = document.getElementById('syncBtn');
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<div class="loading"></div> Syncing...';
            
            try {
                console.log('🚀 Triggering manual sync...');
                
                const response = await fetchWithTimeout('/sync', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }, 30000); // 30 second timeout for sync
                
                const data = await response.json();
                console.log('📦 Sync response:', data);
                
                if (data.success) {
                    syncBtn.innerHTML = '✅ Sync Complete!';
                    
                    // Use non-blocking notification instead of alert
                    const message = \`✅ Sync completed successfully!\\n\\nFetched: \${data.data?.totalFetched || 0} surveys\\nNew: \${data.data?.newSurveys || 0} surveys\`;
                    showNotification(message, 'success');
                    
                    // Refresh status after successful sync
                    setTimeout(() => {
                        if (!isRefreshing) {
                            refreshStatus();
                        }
                    }, 1000);
                } else {
                    throw new Error(data.error || 'Sync failed');
                }
                
            } catch (error) {
                console.error('❌ Sync error:', error);
                syncBtn.innerHTML = '❌ Sync Failed';
                showNotification(\`❌ Sync failed: \${error.message}\`, 'error');
            } finally {
                setTimeout(() => {
                    syncBtn.innerHTML = '🚀 Trigger Sync';
                    syncBtn.disabled = false;
                    isSyncing = false;
                }, 3000);
            }
        }

        function updateTimestamp() {
            const element = document.getElementById('lastUpdated');
            if (element) {
                element.textContent = new Date().toLocaleString();
            }
        }

        // Non-blocking notification system
        function showNotification(message, type = 'info') {
            // Remove any existing notifications
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // Create new notification
            const notification = document.createElement('div');
            notification.className = \`notification notification-\${type}\`;
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: \${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                max-width: 300px;
                white-space: pre-line;
                animation: slideIn 0.3s ease-out;
            \`;
            notification.textContent = message;
            
            // Add CSS animation if not already present
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = \`
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                \`;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }
        </script>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const status = await syncService.getHealthStatus();
    res.json({
      status: 'healthy',
      service: 'ovation-survey-sync',
      timestamp: new Date().toISOString(),
      details: status
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Status dashboard endpoint
app.get('/status', async (req, res) => {
  try {
    const status = await syncService.getDetailedStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual sync trigger
app.post('/sync', async (req, res) => {
  try {
    console.log('🚀 Manual sync triggered via API');
    const result = await syncService.runSync();
    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync history endpoint
app.get('/sync-history', async (req, res) => {
  try {
    const history = await syncService.getSyncHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Ovation Survey Sync Service running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  
  // Start automated sync
  startAutomatedSync();
});

function startAutomatedSync() {
  console.log('⏰ Setting up automated sync every 15 minutes...');
  
  // Run sync every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('⏰ Automated sync starting...');
      await syncService.runSync();
    } catch (error) {
      console.error('❌ Automated sync failed:', error.message);
    }
  });
  
  // Run initial sync after 30 seconds
  setTimeout(async () => {
    try {
      console.log('🚀 Running initial sync...');
      await syncService.runSync();
    } catch (error) {
      console.error('❌ Initial sync failed:', error.message);
    }
  }, 30000);
}
