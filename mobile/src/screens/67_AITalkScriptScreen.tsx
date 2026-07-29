import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Sparkles, Megaphone, ShieldAlert, Target, Lightbulb } from 'lucide-react-native';

interface AITalkScriptProps {
  leadName: string;
  productInterest: string;
  onBack: () => void;
}

export const AITalkScriptScreen: React.FC<AITalkScriptProps> = ({
  leadName,
  productInterest,
  onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<'pitch' | 'objections' | 'closing'>('pitch');

  const pitchPoints = [
    { title: '1. Opening Hook', content: `Hello ${leadName}, this is Ravi calling from CallMind regarding your inquiry for ${productInterest}. Is now a good time to speak for 2 minutes?` },
    { title: '2. Value Proposition', content: 'Our platform automates lead distribution and call logging with zero audio storage overhead, giving your team 3x more talk time.' },
    { title: '3. Qualification Question', content: 'What is your current team size and how are you managing lead assignments right now?' },
  ];

  const objections = [
    { title: 'Price is too high', response: 'Highlight our 18% GST invoice compliance, zero infrastructure cost, and 30-day ROI guarantee.' },
    { title: 'We already use Excel / Manual logs', response: 'Point out that manual logs lose 40% of follow-ups. CallMind logs call durations automatically via Android system API.' },
    { title: 'Need to consult partner', response: 'Offer to schedule a 10-minute web demo with their partner tomorrow at 4 PM.' },
  ];

  const closingTips = [
    { title: 'Trial Close', content: 'Shall I set up your company account with 5 free telecaller licenses today?' },
    { title: 'Urgency Push', content: 'Our special 18% GST launch pricing ends this week. We can lock in your tier now.' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerRow}>
            <Sparkles size={18} color="#2563eb" />
            <Text style={styles.headerTitle}>AI Talk Script</Text>
          </View>
          <Text style={styles.headerSubtitle}>{leadName} • {productInterest}</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'pitch' && styles.activeTabBtn]}
          onPress={() => setActiveCategory('pitch')}
        >
          <Megaphone size={14} color={activeCategory === 'pitch' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeCategory === 'pitch' && styles.activeTabBtnText]}>
            Elevator Pitch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'objections' && styles.activeTabBtn]}
          onPress={() => setActiveCategory('objections')}
        >
          <ShieldAlert size={14} color={activeCategory === 'objections' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeCategory === 'objections' && styles.activeTabBtnText]}>
            Objections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'closing' && styles.activeTabBtn]}
          onPress={() => setActiveCategory('closing')}
        >
          <Target size={14} color={activeCategory === 'closing' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeCategory === 'closing' && styles.activeTabBtnText]}>
            Closing
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeCategory === 'pitch' && (
          <View style={styles.cardsStack}>
            {pitchPoints.map((item, i) => (
              <View key={i} style={styles.scriptCard}>
                <Text style={styles.cardHeader}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.content}</Text>
              </View>
            ))}
          </View>
        )}

        {activeCategory === 'objections' && (
          <View style={styles.cardsStack}>
            {objections.map((item, i) => (
              <View key={i} style={[styles.scriptCard, styles.objectionCard]}>
                <Text style={styles.objectionTitle}>"{item.title}"</Text>
                <View style={styles.responseBox}>
                  <View style={styles.responseLabelRow}>
                    <Lightbulb size={14} color="#15803d" />
                    <Text style={styles.responseLabel}>Suggested Response:</Text>
                  </View>
                  <Text style={styles.responseText}>{item.response}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeCategory === 'closing' && (
          <View style={styles.cardsStack}>
            {closingTips.map((item, i) => (
              <View key={i} style={[styles.scriptCard, styles.closingCard]}>
                <Text style={styles.closingTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.content}</Text>
              </View>
            ))}
          </View>
        )}
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
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  activeTabBtn: {
    backgroundColor: '#2563eb',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabBtnText: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  cardsStack: {
    gap: 16,
  },
  scriptCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563eb',
  },
  cardBody: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  objectionCard: {
    borderColor: '#fef08a',
    backgroundColor: '#fefce8',
  },
  objectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#854d0e',
  },
  responseBox: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  responseLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  responseText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  closingCard: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  closingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
});
