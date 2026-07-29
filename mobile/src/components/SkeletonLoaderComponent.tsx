import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

export type SkeletonType = 'dashboard' | 'leads' | 'profile' | 'full';

interface SkeletonLoaderProps {
  type: SkeletonType;
}

export const SkeletonLoaderComponent: React.FC<SkeletonLoaderProps> = ({ type }) => {
  if (type === 'full') {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Syncing your workspace...</Text>
      </View>
    );
  }

  if (type === 'leads') {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.cardSkeleton}>
            <View style={styles.avatarSkeleton} />
            <View style={styles.linesStack}>
              <View style={styles.lineLong} />
              <View style={styles.lineShort} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.boxSkeleton} />
      <View style={styles.rowSkeleton}>
        <View style={styles.halfBox} />
        <View style={styles.halfBox} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  cardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    gap: 12,
  },
  avatarSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  linesStack: {
    flex: 1,
    gap: 8,
  },
  lineLong: {
    width: '70%',
    height: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  lineShort: {
    width: '40%',
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  boxSkeleton: {
    height: 140,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  rowSkeleton: {
    flexDirection: 'row',
    gap: 12,
  },
  halfBox: {
    flex: 1,
    height: 90,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
});
