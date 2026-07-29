import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Target, Clock, BarChart3, MessageSquare, AlertTriangle, Phone } from 'lucide-react-native';

interface AILeadInsightScreenProps {
  leadName: string;
  leadScore: number;
  onBack: () => void;
  onStartCall: () => void;
}

export const AILeadInsightScreen: React.FC<AILeadInsightScreenProps> = ({
  leadName,
  leadScore,
  onBack,
  onStartCall,
}) => {
  const getScoreColor = (score: number) => (score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Intelligence</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Lead Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.leadName}>{leadName}</Text>
              <Text style={styles.scoreSub}>AI Predicted Intent Analysis</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(leadScore) }]}>
              <Text style={styles.scoreNumber}>{leadScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
          <View style={styles.scoreBarTrack}>
            <View style={[styles.scoreBarFill, { width: `${leadScore}%`, backgroundColor: getScoreColor(leadScore) }]} />
          </View>
        </View>

        {/* Predictive Insights */}
        <View style={styles.sectionTitleRow}>
          <Target size={16} color="#2563eb" />
          <Text style={styles.sectionTitle}>Conversion Predictions</Text>
        </View>

        <View style={styles.insightGrid}>
          <View style={styles.insightBox}>
            <Clock size={18} color="#2563eb" />
            <Text style={styles.insightLabel}>Best Time to Call</Text>
            <Text style={styles.insightValue}>11:30 AM - 01:00 PM</Text>
          </View>

          <View style={styles.insightBox}>
            <BarChart3 size={18} color="#16a34a" />
            <Text style={styles.insightLabel}>Conversion Chance</Text>
            <Text style={[styles.insightValue, { color: '#16a34a' }]}>88% High Probability</Text>
          </View>
        </View>

        {/* Recommended Strategy */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <MessageSquare size={16} color="#2563eb" />
            <Text style={styles.cardHeading}>Recommended Pitch Strategy</Text>
          </View>
          <Text style={styles.strategyText}>
            Lead has queried low interest rates on Home Loans. Pitch the 8.4% limited period scheme first. Focus on zero processing fee offer.
          </Text>
        </View>

        {/* Anticipated Objections */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <AlertTriangle size={16} color="#d97706" />
            <Text style={styles.cardHeading}>Predicted Objections & Answers</Text>
          </View>

          <View style={styles.objectionRow}>
            <Text style={styles.objectionQ}>"Competitor rate is lower"</Text>
            <Text style={styles.objectionA}>→ Highlight zero foreclosure charges and quick 48-hr approval.</Text>
          </View>

          <View style={styles.objectionRow}>
            <Text style={styles.objectionQ}>"Need time to decide"</Text>
            <Text style={styles.objectionA}>→ Inform about scheme expiry by end of current week.</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.callBtn} onPress={onStartCall}>
          <Phone size={16} color="#ffffff" />
          <Text style={styles.callBtnText}>Call Now with AI Pitch Guidance</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  scoreCard: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, marginBottom: 24 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  leadName: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  scoreSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  scoreNumber: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  scoreMax: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  scoreBarTrack: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  insightGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  insightBox: { flex: 1, backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  insightLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  insightValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  card: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardHeading: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  strategyText: { fontSize: 13, color: '#334155', lineHeight: 20, fontWeight: '500' },
  objectionRow: { marginBottom: 10 },
  objectionQ: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  objectionA: { fontSize: 12, color: '#475569', marginTop: 2, fontWeight: '500' },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  callBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
