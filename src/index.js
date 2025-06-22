require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const OvationSyncService = require('./sync-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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
  console.log(`📊 Dashboard: http://localhost:${PORT}/status`);
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
