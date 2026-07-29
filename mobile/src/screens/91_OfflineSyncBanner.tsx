import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface OfflineSyncBannerProps {
  isOffline: boolean;
  pendingCount: number;
  onSyncNow: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOffline,
  pendingCount,
  onSyncNow,
}) => {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <View style={[styles.banner, isOffline ? styles.offlineBg : styles.syncingBg]}>
      <View style={styles.left}>
        <Text style={styles.icon}>{isOffline ? '📡' : '🔄'}</Text>
        <View>
          <Text style={styles.title}>
            {isOffline ? 'Offline Mode Active' : `${pendingCount} Call Logs Pending Sync`}
          </Text>
          <Text style={styles.sub}>
            {isOffline
              ? 'Calls and feedback will be saved locally in SQLite.'
              : 'Auto-syncing to cloud database once connection stabilizes.'}
          </Text>
        </View>
      </View>

      {!isOffline && pendingCount > 0 && (
        <TouchableOpacity style={styles.syncBtn} onPress={onSyncNow}>
          <Text style={styles.syncText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineBg: {
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  syncingBg: {
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  sub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  syncBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
