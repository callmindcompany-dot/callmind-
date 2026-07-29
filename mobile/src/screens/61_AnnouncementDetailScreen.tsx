import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Announcement } from './59_InboxScreen';

interface AnnouncementDetailProps {
  announcement: Announcement;
  onBack: () => void;
}

export const AnnouncementDetailScreen: React.FC<AnnouncementDetailProps> = ({
  announcement,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.senderRow}>
            <View style={styles.iconBg}>
              <Text style={styles.iconText}>
                {announcement.type === 'broadcast' ? '📢' : announcement.type === 'lead_assigned' ? '👥' : '🎉'}
              </Text>
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{announcement.sender}</Text>
              <Text style={styles.timestamp}>{announcement.time}</Text>
            </View>
          </View>

          <Text style={styles.title}>{announcement.title}</Text>

          <View style={styles.divider} />

          <Text style={styles.contentBody}>{announcement.content}</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBack}>
          <Text style={styles.backHomeText}>Back to Inbox</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  contentBody: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    fontWeight: '500',
  },
  backHomeBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  backHomeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
});
