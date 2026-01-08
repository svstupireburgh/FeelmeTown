#!/usr/bin/env node

/**
 * Cleanup Expired Bookings Script
 * This script automatically deletes bookings where the date and time have already passed
 * 
 * Usage:
 * node scripts/cleanup-expired-bookings.js
 * 
 * Or add to cron job:
 * 0 6 * * * node /path/to/scripts/cleanup-expired-bookings.js
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function cleanupExpiredBookings() {
  try {
    
    
    
    // Call the automatic cleanup API
    const response = await fetch(`${BASE_URL}/api/auto-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      
      
      
      
      
      
      
      if (result.deletedBookings && result.deletedBookings.length > 0) {
        
        result.deletedBookings.forEach(booking => {
          
        });
      }
    } else {
      
    }
    
  } catch (error) {
    
  }
}

// Run the cleanup
cleanupExpiredBookings();
