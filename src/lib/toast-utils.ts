/**
 * Global Toast Utilities for FeelME Town
 * Use these utilities throughout the app for consistent toast notifications
 */

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast configuration
export const TOAST_CONFIG = {
  duration: 4000,
  position: {
    top: '2rem',
    right: '2rem',
  },
  animation: {
    duration: 400,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Toast color schemes
export const TOAST_COLORS = {
  success: {
    background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.25) 0%, rgba(40, 167, 69, 0.15) 100%)',
    border: 'rgba(40, 167, 69, 0.4)',
    text: '#ffffff',
    shadow: 'rgba(40, 167, 69, 0.3)',
  },
  error: {
    background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.25) 0%, rgba(220, 53, 69, 0.15) 100%)',
    border: 'rgba(220, 53, 69, 0.4)',
    text: '#ffffff',
    shadow: 'rgba(220, 53, 69, 0.3)',
  },
  warning: {
    background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%)',
    border: 'rgba(255, 193, 7, 0.4)',
    text: '#1a1a1a',
    shadow: 'rgba(255, 193, 7, 0.3)',
  },
  info: {
    background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.25) 0%, rgba(13, 110, 253, 0.15) 100%)',
    border: 'rgba(13, 110, 253, 0.4)',
    text: '#ffffff',
    shadow: 'rgba(13, 110, 253, 0.3)',
  },
} as const;

// Common toast messages
export const TOAST_MESSAGES = {
  // Success messages
  success: {
    saved: 'Data saved successfully!',
    updated: 'Data updated successfully!',
    deleted: 'Data deleted successfully!',
    created: 'Created successfully!',
    login: 'Login successful!',
    logout: 'Logged out successfully!',
    profileUpdated: 'Profile updated successfully!',
    passwordChanged: 'Password changed successfully!',
    bookingConfirmed: 'Booking confirmed successfully!',
    theaterAdded: 'Theater added successfully!',
    timeSlotAdded: 'Time slot added successfully!',
  },
  
  // Error messages
  error: {
    saveFailed: 'Failed to save data',
    updateFailed: 'Failed to update data',
    deleteFailed: 'Failed to delete data',
    createFailed: 'Failed to create',
    loginFailed: 'Login failed',
    networkError: 'Network error occurred',
    serverError: 'Server error occurred',
    validationError: 'Please check your input',
    unauthorized: 'Unauthorized access',
    notFound: 'Resource not found',
    bookingFailed: 'Booking failed',
    theaterDeleteFailed: 'Failed to delete theater',
  },
  
  // Warning messages
  warning: {
    unsavedChanges: 'You have unsaved changes',
    sessionExpired: 'Session expired, please login again',
    dataLoss: 'This action may cause data loss',
    confirmationRequired: 'Please confirm this action',
    fileTooLarge: 'File size is too large',
  },
  
  // Info messages
  info: {
    loading: 'Loading...',
    processing: 'Processing your request...',
    maintenanceMode: 'System is under maintenance',
    newFeature: 'New feature available!',
    updateAvailable: 'Update available',
  },
} as const;

// Toast helper functions
export const createToastMessage = (type: ToastType, key: string, customMessage?: string): string => {
  if (customMessage) return customMessage;
  
  const messages = TOAST_MESSAGES[type];
  return messages[key as keyof typeof messages] || `${type} message`;
};

// Export commonly used toast messages
export const {
  success: successMessages,
  error: errorMessages,
  warning: warningMessages,
  info: infoMessages,
} = TOAST_MESSAGES;
