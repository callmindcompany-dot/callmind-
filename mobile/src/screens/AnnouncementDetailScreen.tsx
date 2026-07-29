import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Share2, Megaphone, CheckCircle2 } from 'lucide-react-native';

interface AnnouncementDetailScreenProps {
  onBack: () => void;
  announcement?: any;
}

export const AnnouncementDetailScreen: React.FC<AnnouncementDetailScreenProps> = ({ onBack, announcement }) => {
  const item = announcement || {
    title: 'Monthly Target Update',
    date: '21 May 2024 • Posted by Admin HQ',
    body: 'Dear Telecalling Team,\n\nWe have updated the monthly targets for May 2024. All telecallers are required to achieve a minimum of 600 connected calls and maintain a conversion rate above 15%.\n\nSpecial bonuses of up to ₹5,000 will be awarded to top performers at the end of the month.',
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 6 Screen 23 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcement</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Share2 size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Banner Card */}
        <View style={styles.card}>
          <View style={styles.iconCircleBg}>
            <Megaphone size={28} color="#2563eb" />
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.dateText}>{item.date}</Text>

          <View style={styles.divider} />

          <Text style={styles.bodyText}>{item.body}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.acknowledgeBtn} onPress={onBack}>
          <CheckCircle2 size={18} color="#ffffff" />
          <Text style={styles.acknowledgeText}>Acknowledge & Mark Read</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  iconCircleBg: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  bodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  acknowledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  acknowledgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
