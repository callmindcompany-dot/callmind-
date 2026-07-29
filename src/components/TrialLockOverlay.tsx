import React from 'react';

interface TrialLockOverlayProps {
  limitType?: "leads" | "aiDrafts" | "teamSeats" | "automation" | "general";
  isExpired?: boolean;
}

/**
 * TrialLockOverlay — fully disabled for local/offline mode.
 * All features are accessible by default.
 */
export const TrialLockOverlay: React.FC<TrialLockOverlayProps> = () => {
  // Always return null — subscription walls are removed for local operation.
  return null;
};
