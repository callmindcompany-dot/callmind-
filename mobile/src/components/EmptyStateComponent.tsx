import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type EmptyStateType =
  | 'no_leads'
  | 'no_calls'
  | 'no_callbacks'
  | 'no_notifications'
  | 'empty_inbox'
  | 'no_internet'
  | 'no_search'
  | 'no_data';

interface EmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  actionText?: string;
}

export const EmptyStateComponent: React.FC<EmptyStateProps> = ({ type, onAction, actionText }) => {
  const emptyConfigs: Record<EmptyStateType, { icon: string; title: string; sub: string }> = {
    no_leads: {
      icon: '👥',
      title: 'No Leads Assigned Yet',
      sub: 'Your queue is clean! Ask your admin or wait for new leads to be distributed.',
    },
    no_calls: {
      icon: '📞',
      title: 'No Call Activity Today',
      sub: 'You haven\'t logged any calls yet today. Tap "Get Next Lead" to start dialing!',
    },
    no_callbacks: {
      icon: '🔄',
      title: 'No Callbacks Scheduled',
      sub: 'No follow-up calls due right now. Schedule callback during post-call feedback.',
    },
    no_notifications: {
      icon: '🔔',
      title: 'No Notifications',
      sub: 'You are all caught up! Important alerts and announcements will appear here.',
    },
    empty_inbox: {
      icon: '📬',
      title: 'Inbox is Empty',
      sub: 'No company broadcasts or lead assignment alerts in your inbox.',
    },
    no_internet: {
      icon: '📡',
      title: 'No Internet Connection',
      sub: 'Don\'t worry! You can still call leads offline. Calls will auto-sync when online.',
    },
    no_search: {
      icon: '🔍',
      title: 'No Matching Leads Found',
      sub: 'We couldn\'t find any lead matching your search query. Try searching by phone or name.',
    },
    no_data: {
      icon: '📊',
      title: 'No Data Available',
      sub: 'Performance stats will update once you make your first few calls today.',
    },
  };

  const config = emptyConfigs[type];

  return (
    <View style={styles.container}>
      <View style={styles.iconBg}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.sub}>{config.sub}</Text>

      {onAction && actionText && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
