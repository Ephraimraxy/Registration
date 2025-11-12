import { useEffect } from 'react';
import { startPendingAssignmentMonitor } from '@/lib/flexible-registration-utils';

/**
 * Hook to start monitoring for pending room and tag assignments
 * This will automatically assign resources to users when they become available
 */
export function usePendingAssignments() {
  useEffect(() => {
    const cleanup = startPendingAssignmentMonitor();
    
    return () => {
      cleanup();
    };
  }, []);
}
