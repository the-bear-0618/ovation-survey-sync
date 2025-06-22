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
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 20px; 
                margin: 0;
                min-height: 100vh;
            }
            .container { 
                max-width: 900px; 
                margin: 0 auto; 
                text-align: center; 
            }
            .header {
                margin-bottom: 30px;
            }
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .status-card {
                background: rgba(255,255,255,0.95);
                color: #333;
                border-radius: 15px;
                padding: 25px;
                margin: 20px 0;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            }
            .btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 24px;
                margin: 10px;
                cursor: pointer;
                font-size: 16px;
                text-decoration: none;
                display: inline-block;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .btn:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            #status { 
                font-size: 16px; 
                margin: 20px 0; 
                text-align: left;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                min-height: 120px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            .stat-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                text-align: center;
            }
            .stat-value {
                font-size: 1.8rem;
                font-weight: bold;
                color: #333;
            }
            .stat-label {
                font-size: 0.9rem;
                color: #666;
                margin-top: 5px;
            }
            .status-indicator {
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
            }
            .healthy { background: #27ae60; }
            .warning { background: #f39c12; }
            .error { background: #e74c3c; }
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #ccc;
                border-radius: 50%;
                border-top-color: #667eea;
                animation: spin 1s ease-in-out infinite;
                margin-right: 10px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .last-updated {
                color: rgba(255,255,255,0.8);
                font-size: 0.9rem;
                margin-bottom: 20px;
            }
            .error-message {
                background: #ffe6e6;
                color: #c0392b;
                padding: 15px;
                border-radius: 10px;
                margin: 15px 0;
                border-left: 4px solid #e74c3c;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍞 Great Harvest Crown Point</h1>
                <h2>Survey Sync Service Dashboard</h2>
            </div>
            
            <div class="last-updated">
                Last updated: <span id="lastUpdated">Loading...</span>
            </div>
            
            <div class="status-card">
                <h3>🔄 Service Status</h3>
                <div id="status">
                    <div class="loading"></div> Loading status...
                </div>
                <button class="btn" onclick="refreshStatus()" id="refreshBtn">🔄 Refresh Status</button>
                <button class="btn" onclick="triggerSync()" id="syncBtn">🚀 Trigger Sync</button>
            </div>
            
            <div class="status-card">
                <h3>📊 Sync Statistics</h3>
                <div class="stats-grid" id="statsGrid">
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
                        <div class="stat-label">Surveys Processed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="newSurveysAdded">-</div>
                        <div class="stat-label">New Surveys Added</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="totalSurveys">-</div>
                        <div class="stat-label">Total Surveys in DB</div>
                    </div>
                </div>
            </div>
            
            <div class="status-card">
                <h3>🔗 Quick Links</h3>
                <a href="/health" class="btn" target="_blank">💚 Health Check</a>
                <a href="/status" class="btn" target="_blank">📊 Raw Status Data</a>
                <a href="https://ovation-monitor-simple-production.up.railway.app" target="_blank" class="btn">
                    📈 Main Analytics Dashboard
                </a>
            </div>
        </div>

        <script>
            let isRefreshing = false;
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {
                console.log('🍞 Dashboard loaded, fetching status...');
                refreshStatus();
                
                // Auto-refresh every 30 seconds
                setInterval(refreshStatus, 30000);
            });
            
            async function refreshStatus() {
                if (isRefreshing) {
                    console.log('⏳ Already refreshing, skipping...');
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
                    
                    const response = await fetch('/status');
                    console.log('📞 Response status:', response.status);
                    
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
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
                    
                    statusDiv.innerHTML = '<div class="error-message"><strong>❌ Error loading status:</strong><br>' + error.message + '</div>';
                    
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
                
                // Update main status display
                const statusClass = isHealthy ? 'healthy' : (stats.errors > stats.successfulRuns ? 'error' : 'warning');
                const statusText = isHealthy ? '✅ Service Healthy' : 
                                  (stats.errors > stats.successfulRuns ? '❌ Service Error' : '⚠️ Service Warning');
                
                document.getElementById('status').innerHTML = 
                    '<div style="font-size: 1.2rem; margin-bottom: 15px;">' +
                        '<span class="status-indicator ' + statusClass + '"></span>' +
                        '<strong>' + statusText + '</strong>' +
                    '</div>' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem;">' +
                        '<div><strong>Last Run:</strong> ' + (stats.lastRun ? new Date(stats.lastRun).toLocaleString() : 'Never') + '</div>' +
                        '<div><strong>Last Success:</strong> ' + (stats.lastSuccess ? new Date(stats.lastSuccess).toLocaleString() : 'None') + '</div>' +
                        '<div><strong>Token Valid:</strong> ' + (ovation.hasValidToken ? '✅ Yes' : '❌ No') + '</div>' +
                        '<div><strong>Token Expires:</strong> ' + (ovation.tokenExpiry ? new Date(ovation.tokenExpiry).toLocaleString() : 'N/A') + '</div>' +
                        '<div><strong>Uptime:</strong> ' + Math.round((status.uptime || 0) / 60) + ' minutes</div>' +
                        '<div><strong>Success Rate:</strong> ' + Math.round(((stats.successfulRuns || 0) / Math.max(stats.totalRuns || 1, 1)) * 100) + '%</div>' +
                    '</div>';
                
                // Update statistics
                document.getElementById('totalRuns').textContent = stats.totalRuns || 0;
                document.getElementById('successfulRuns').textContent = stats.successfulRuns || 0;
                document.getElementById('surveysProcessed').textContent = stats.surveysProcessed || 0;
                document.getElementById('newSurveysAdded').textContent = stats.newSurveysAdded || 0;
                document.getElementById('totalSurveys').textContent = (database.totalSurveys || 0).toLocaleString();
            }
            
            async function triggerSync() {
                const syncBtn = document.getElementById('syncBtn');
                syncBtn.disabled = true;
                syncBtn.innerHTML = '<div class="loading"></div> Syncing...';
                
                try {
                    console.log('🚀 Triggering manual sync...');
                    
                    const response = await fetch('/sync', { 
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    console.log('📦 Sync response:', data);
                    
                    if (data.success) {
                        syncBtn.innerHTML = '✅ Sync Complete!';
                        alert('✅ Sync completed successfully!\\n\\nFetched: ' + (data.data?.totalFetched || 0) + ' surveys\\nNew: ' + (data.data?.newSurveys || 0) + ' surveys');
                        
                        // Refresh status after successful sync
                        setTimeout(() => {
                            refreshStatus();
                        }, 1000);
                    } else {
                        throw new Error(data.error || 'Sync failed');
                    }
                    
                } catch (error) {
                    console.error('❌ Sync error:', error);
                    syncBtn.innerHTML = '❌ Sync Failed';
                    alert('❌ Sync failed: ' + error.message);
                } finally {
                    setTimeout(() => {
                        syncBtn.innerHTML = '🚀 Trigger Sync';
                        syncBtn.disabled = false;
                    }, 3000);
                }
            }
            
            function updateTimestamp() {
                document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
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
