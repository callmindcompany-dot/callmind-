import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Lightbulb, Copy } from 'lucide-react-native';

interface AICallSummaryCardProps {
  leadName: string;
  callDuration: string;
  summaryText: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keyTakeaways: string[];
  suggestedNextStep: string;
  onCopySummary?: () => void;
  onClose?: () => void;
}

export const AICallSummaryCard: React.FC<AICallSummaryCardProps> = ({
  leadName,
  callDuration,
  summaryText,
  sentiment,
  keyTakeaways,
  suggestedNextStep,
  onCopySummary,
  onClose,
}) => {
  const sentimentColor =
    sentiment === 'positive' ? '#16a34a' : sentiment === 'negative' ? '#dc2626' : '#f59e0b';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.aiBadge}>
          <Sparkles size={14} color="#2563eb" />
          <Text style={styles.aiBadgeText}>AI Call Summary</Text>
        </View>
        <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '18' }]}>
          <Text style={[styles.sentimentText, { color: sentimentColor }]}>
            {sentiment.toUpperCase()} SENTIMENT
          </Text>
        </View>
      </View>

      {/* Meta Info */}
      <Text style={styles.metaText}>
        Call with <Text style={styles.metaBold}>{leadName}</Text> • Duration: {callDuration}
      </Text>

      {/* Main AI Summary Box */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryContent}>{summaryText}</Text>
      </View>

      {/* Key Takeaways */}
      <Text style={styles.sectionHeading}>Key Takeaways</Text>
      <View style={styles.takeawaysList}>
        {keyTakeaways.map((item, index) => (
          <View key={index} style={styles.takeawayRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.takeawayText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* AI Suggested Action */}
      <View style={styles.actionBox}>
        <View style={styles.actionHeaderRow}>
          <Lightbulb size={14} color="#16a34a" />
          <Text style={styles.actionHeader}>Recommended Next Step</Text>
        </View>
        <Text style={styles.actionText}>{suggestedNextStep}</Text>
      </View>

      {/* Footer CTAs */}
      <View style={styles.footerRow}>
        {onCopySummary && (
          <TouchableOpacity style={styles.copyBtn} onPress={onCopySummary}>
            <Copy size={14} color="#334155" />
            <Text style={styles.copyBtnText}>Copy Summary</Text>
          </TouchableOpacity>
        )}
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginVertical: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  sentimentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sentimentText: { fontSize: 10, fontWeight: '900' },
  metaText: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  metaBold: { fontWeight: '700', color: '#0f172a' },
  summaryBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14 },
  summaryContent: { fontSize: 13, color: '#334155', lineHeight: 19, fontWeight: '500' },
  sectionHeading: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  takeawaysList: { gap: 6, marginBottom: 14 },
  takeawayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  bullet: { fontSize: 14, color: '#2563eb', fontWeight: '900' },
  takeawayText: { flex: 1, fontSize: 13, color: '#0f172a', fontWeight: '600' },
  actionBox: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 14 },
  actionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  actionHeader: { fontSize: 12, fontWeight: '800', color: '#16a34a' },
  actionText: { fontSize: 13, color: '#15803d', fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  closeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2563eb' },
  closeBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
});
