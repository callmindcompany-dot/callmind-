import React from 'react';

interface FeatureGateProps {
  children: React.ReactNode;
  featureId?: string;
  phase?: 2 | 3;
}

/**
 * FeatureGate — all features unlocked for local/offline mode.
 * Simply renders children directly with no access restrictions.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ children }) => {
  return <>{children}</>;
};
