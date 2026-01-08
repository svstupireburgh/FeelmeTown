// DISABLED: Blob storage no longer used - all data in GoDaddy SQL
// This file exists only to prevent build errors from old imports

export const ExportsStorage = {
  readArray: async (filename: string): Promise<any[]> => {
    console.warn(`⚠️ ExportsStorage.readArray('${filename}') called but blob storage is disabled`);
    return [];
  },
  
  readRaw: async (filename: string): Promise<any> => {
    console.warn(`⚠️ ExportsStorage.readRaw('${filename}') called but blob storage is disabled`);
    return null;
  },
  
  writeArray: async (filename: string, data: any[]): Promise<void> => {
    console.warn(`⚠️ ExportsStorage.writeArray('${filename}') called but blob storage is disabled`);
  },
  
  writeRaw: async (filename: string, data: any): Promise<void> => {
    console.warn(`⚠️ ExportsStorage.writeRaw('${filename}') called but blob storage is disabled`);
  },
  
  appendToArray: async (filename: string, item: any): Promise<void> => {
    console.warn(`⚠️ ExportsStorage.appendToArray('${filename}') called but blob storage is disabled`);
  },
  
  readManual: async (filename: string): Promise<any> => {
    console.warn(`⚠️ ExportsStorage.readManual('${filename}') called but blob storage is disabled`);
    return { manualBookings: [] };
  }
};
