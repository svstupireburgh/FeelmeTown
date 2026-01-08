// Frontend JSON client for reading/writing JSON files via API routes
// This follows the proper Next.js pattern: Frontend → API Route → File System

export class JSONClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // Read JSON file from public/data/exports/
  async readJSON(fileName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/data/exports/${fileName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to read ${fileName}: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Successfully read ${fileName}`);
      return data;
    } catch (error) {
      console.error(`❌ Error reading ${fileName}:`, error);
      throw error;
    }
  }

  // Read pricing data
  async getPricing(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pricing`);
      
      if (!response.ok) {
        throw new Error(`Failed to get pricing: ${response.status}`);
      }
      
      const result = await response.json();
      return result.pricing;
    } catch (error) {
      console.error('❌ Error getting pricing:', error);
      throw error;
    }
  }

  // Update pricing data (via admin API)
  async updatePricing(pricingData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pricingData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update pricing: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Successfully updated pricing');
      return result;
    } catch (error) {
      console.error('❌ Error updating pricing:', error);
      throw error;
    }
  }

  // Read AI memory data
  async getAIMemory(type?: string): Promise<any> {
    try {
      const url = type 
        ? `${this.baseUrl}/api/ai-memory/read?type=${type}`
        : `${this.baseUrl}/api/ai-memory/read`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get AI memory: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error getting AI memory:', error);
      throw error;
    }
  }

  // Read counters data
  async getCounters(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/dashboard-stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to get counters: ${response.status}`);
      }
      
      const result = await response.json();
      return result.counters;
    } catch (error) {
      console.error('❌ Error getting counters:', error);
      throw error;
    }
  }

  // Read cancel reasons
  async getCancelReasons(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cancel-reasons`);
      
      if (!response.ok) {
        throw new Error(`Failed to get cancel reasons: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error getting cancel reasons:', error);
      throw error;
    }
  }

  // Generic method to read any JSON file
  async readFile(fileName: string): Promise<any> {
    // Ensure .json extension
    const jsonFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    return this.readJSON(jsonFileName);
  }
}

// Export singleton instance
export const jsonClient = new JSONClient();

// Export individual functions for convenience
export const {
  readJSON,
  getPricing,
  updatePricing,
  getAIMemory,
  getCounters,
  getCancelReasons,
  readFile
} = jsonClient;
