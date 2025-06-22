const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

class OvationSyncService {
  constructor(config) {
    this.ovationConfig = config.ovationConfig;
    this.supabase = createClient(
      config.supabaseConfig.url,
      config.supabaseConfig.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    this.accessToken = null;
    this.apiKey = null;
    this.tokenExpiry = null;
    
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      errors: 0,
      lastRun: null,
      lastSuccess: null,
      surveysProcessed: 0,
      newSurveysAdded: 0
    };
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating with Ovation API...');
      
      const credentials = Buffer.from(
        `${this.ovationConfig.clientId}:${this.ovationConfig.clientSecret}`
      ).toString('base64');
      
      const response = await axios.post(`${this.ovationConfig.baseUrl}/oauth2/access-token`, {
        grant_type: 'client_credentials',
        scopes: ['admin']
      }, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'X-Ovation-Id': this.ovationConfig.partnerName,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        this.accessToken = response.data.data.access_token;
        this.apiKey = response.data.data.api_key;
        this.tokenExpiry = new Date(response.data.data.exp * 1000);
        
        console.log('✅ Authentication successful');
        console.log(`   Token expires: ${this.tokenExpiry.toLocaleString()}`);
        return true;
      }
      
      throw new Error('Authentication response was not successful');
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async makeAuthenticatedRequest(endpoint, data = {}) {
    // Check if we need to refresh token
    if (!this.accessToken || new Date() >= new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)) {
      await this.authenticate();
    }

    try {
      const response = await axios.post(`${this.ovationConfig.baseUrl}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Ovation-Id': this.ovationConfig.partnerName,
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ API request failed for ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getLatestSurveyDate() {
    try {
      const { data, error } = await this.supabase
        .from('surveys')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data?.created_at ? new Date(data.created_at) : new Date('2024-01-01');
    } catch (error) {
      console.warn('⚠️ Could not get latest survey date, using default:', error.message);
      return new Date('2024-01-01');
    }
  }

  async fetchNewSurveys() {
    try {
      const latestDate = await this.getLatestSurveyDate();
      const searchStartDate = new Date(latestDate.getTime() - 60 * 60 * 1000); // 1 hour overlap
      const now = new Date();
      
      console.log(`📊 Fetching surveys from ${searchStartDate.toISOString()} to ${now.toISOString()}`);

      const response = await this.makeAuthenticatedRequest('/surveys/list', {
        filters: {
          created_at_range: [searchStartDate.toISOString(), now.toISOString()],
          company_ids: this.ovationConfig.companyIds
        },
        limit: 200,
        skip: 0,
        sort: { created_at: 1 }
      });

      if (response.success && response.data.surveys) {
        console.log(`📥 Fetched ${response.data.surveys.length} surveys from Ovation API`);
        return response.data.surveys;
      }

      return [];
    } catch (error) {
      console.error('❌ Error fetching surveys:', error.message);
      throw error;
    }
  }

  async upsertSurvey(surveyData) {
    try {
      // Get company UUID
      const companyUuid = await this.getCompanyUUID(surveyData.company);
      const locationUuid = await this.getLocationUUID(surveyData.location);
      const customerUuid = await this.getCustomerUUID(surveyData.customer);

      const { error } = await this.supabase
        .from('surveys')
        .upsert({
          ovation_id: surveyData._id,
          company_id: companyUuid,
          location_id: locationUuid,
          customer_id: customerUuid,
          rating: surveyData.rating,
          feedback: surveyData.feedback,
          source: surveyData.source,
          response_message: surveyData.response_message,
          response_by: surveyData.response_by,
          response_time: surveyData.response_time,
          created_at: surveyData.created_at,
          local_created_at: surveyData.local_created_at || surveyData.created_at,
          processed_at: new Date().toISOString()
        }, { 
          onConflict: 'ovation_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      return true;
    } catch (error) {
      if (error.message?.includes('duplicate key')) {
        return false; // Already exists
      }
      throw error;
    }
  }

  async getCompanyUUID(ovationId) {
    if (!ovationId) return null;
    
    const { data } = await this.supabase
      .from('companies')
      .select('id')
      .eq('ovation_id', ovationId)
      .single();

    return data?.id || null;
  }

  async getLocationUUID(ovationId) {
    if (!ovationId) return null;
    
    const { data } = await this.supabase
      .from('locations')
      .select('id')
      .eq('ovation_id', ovationId)
      .single();

    return data?.id || null;
  }

  async getCustomerUUID(ovationId) {
    if (!ovationId) return null;
    
    const { data } = await this.supabase
      .from('customers')
      .select('id')
      .eq('ovation_id', ovationId)
      .single();

    return data?.id || null;
  }

  async runSync() {
    this.stats.totalRuns++;
    this.stats.lastRun = new Date().toISOString();
    
    try {
      console.log(`🔄 Starting sync run #${this.stats.totalRuns} at ${new Date().toLocaleString()}`);
      
      // Fetch new surveys
      const surveys = await this.fetchNewSurveys();
      
      let newSurveys = 0;
      let skippedSurveys = 0;
      
      // Process each survey
      for (const survey of surveys) {
        try {
          const isNew = await this.upsertSurvey(survey);
          if (isNew) {
            newSurveys++;
          } else {
            skippedSurveys++;
          }
        } catch (error) {
          console.error(`❌ Error processing survey ${survey._id}:`, error.message);
        }
      }
      
      this.stats.surveysProcessed += surveys.length;
      this.stats.newSurveysAdded += newSurveys;
      this.stats.successfulRuns++;
      this.stats.lastSuccess = new Date().toISOString();
      
      const result = {
        totalFetched: surveys.length,
        newSurveys,
        skippedSurveys,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Sync completed successfully:`);
      console.log(`   📊 Total fetched: ${surveys.length}`);
      console.log(`   ✨ New surveys: ${newSurveys}`);
      console.log(`   ⏭️ Skipped: ${skippedSurveys}`);
      
      return result;
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Sync failed:', error.message);
      throw error;
    }
  }

  async getHealthStatus() {
    const timeSinceLastSuccess = this.stats.lastSuccess 
      ? Date.now() - new Date(this.stats.lastSuccess).getTime()
      : null;
    
    const isHealthy = this.stats.successfulRuns > 0 && 
                     timeSinceLastSuccess !== null && 
                     timeSinceLastSuccess < 30 * 60 * 1000; // 30 minutes

    return {
      isHealthy,
      stats: this.stats,
      timeSinceLastSuccess: timeSinceLastSuccess ? Math.round(timeSinceLastSuccess / 1000 / 60) : null
    };
  }

  async getDetailedStatus() {
    const healthStatus = await this.getHealthStatus();
    
    // Get database stats
    const { count: totalSurveys } = await this.supabase
      .from('surveys')
      .select('*', { count: 'exact', head: true });

    const { data: latestSurvey } = await this.supabase
      .from('surveys')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      service: 'ovation-survey-sync',
      version: '1.0.0',
      uptime: process.uptime(),
      ...healthStatus,
      database: {
        totalSurveys: parseInt(totalSurveys) || 0,
        latestSurveyDate: latestSurvey?.created_at || null
      },
      ovation: {
        hasValidToken: !!this.accessToken,
        tokenExpiry: this.tokenExpiry?.toISOString() || null
      }
    };
  }

  async getSyncHistory() {
    // This would typically come from a sync_logs table
    // For now, return current stats
    return {
      recentRuns: [
        {
          timestamp: this.stats.lastRun,
          success: this.stats.lastSuccess === this.stats.lastRun,
          surveysProcessed: this.stats.newSurveysAdded
        }
      ],
      summary: this.stats
    };
  }
}

module.exports = OvationSyncService;
