import { useContext } from 'react';
import { CourseContext } from '../context/CourseContext';

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourse must be used inside CourseProvider');
  return ctx;
}
