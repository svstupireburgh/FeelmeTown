'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DatePickerContextType {
  isDatePickerOpen: boolean;
  selectedDate: string;
  openDatePicker: () => void;
  closeDatePicker: () => void;
  setSelectedDate: (date: string) => void;
}

const DatePickerContext = createContext<DatePickerContextType | undefined>(undefined);

export function DatePickerProvider({ children }: { children: ReactNode }) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  const openDatePicker = () => setIsDatePickerOpen(true);
  const closeDatePicker = () => setIsDatePickerOpen(false);

  return (
    <DatePickerContext.Provider value={{
      isDatePickerOpen,
      selectedDate,
      openDatePicker,
      closeDatePicker,
      setSelectedDate
    }}>
      {children}
    </DatePickerContext.Provider>
  );
}

export function useDatePicker() {
  const context = useContext(DatePickerContext);
  if (context === undefined) {
    throw new Error('useDatePicker must be used within a DatePickerProvider');
  }
  return context;
}
