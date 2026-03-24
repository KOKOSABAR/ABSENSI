import { ShiftSchedule } from './types';

export const SHIFTS: Record<string, ShiftSchedule> = {
  PAGI: {
    name: 'SHIFT PAGI',
    startTime: '07:45:00',
    endTime: '09:45:00',
  },
  SIANG: {
    name: 'SHIFT SIANG',
    startTime: '11:45:00',
    endTime: '12:45:00',
  },
  SORE: {
    name: 'SHIFT SORE',
    startTime: '13:45:00',
    endTime: '17:45:00',
  },
  MALAM: {
    name: 'SHIFT MALAM',
    startTime: '19:45:00',
    endTime: '23:45:00',
  },
};
