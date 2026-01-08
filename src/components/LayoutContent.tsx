'use client';

import { useDatePicker } from '@/contexts/DatePickerContext';
import GlobalDatePicker from './GlobalDatePicker';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isDatePickerOpen, selectedDate, closeDatePicker, setSelectedDate } = useDatePicker();

  return (
    <>
      {children}
      <GlobalDatePicker
        isOpen={isDatePickerOpen}
        onClose={closeDatePicker}
        onDateSelect={setSelectedDate}
        selectedDate={selectedDate}
      />
    </>
  );
}
