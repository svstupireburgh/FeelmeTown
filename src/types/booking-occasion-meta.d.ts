// Global type for occasion metadata used in bookings.
// Placed in a .d.ts file so it is automatically included by TypeScript without needing explicit imports.

declare type BookingOccasionMeta = {
  fieldLabels: Record<string, string>;
  requiredFields: string[];
};
