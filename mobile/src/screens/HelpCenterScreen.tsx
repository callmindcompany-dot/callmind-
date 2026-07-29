import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ArrowLeft, Search, Phone, RotateCcw, Calendar, Award, ChevronDown, MessageSquare } from 'lucide-react-native';

interface HelpCenterScreenProps {
  onBack: () => void;
}

export const HelpCenterScreen: React.FC<HelpCenterScreenProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    { q: 'How to resolve SIM 1 connection error?', a: 'Go to Settings > Call & SIM Settings and make sure SIM 1 is selected as default.' },
    { q: 'When are weekly incentive payouts processed?', a: 'Incentives are calculated every Sunday midnight and processed on Monday afternoon.' },
    { q: 'How to request a lead reassignment?', a: 'Open lead details, tap the 3-dots menu and select Request Lead Transfer.' },
    { q: 'What if my punch out fails due to GPS?', a: 'Make sure Location services are enabled in App Permissions, then tap Refresh Location.' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 5 Screen 19 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Search size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help topics or questions..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Grid */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryGrid}>
          <TouchableOpacity style={styles.categoryCard}>
            <View style={[styles.categoryIconBg, { backgroundColor: '#eff6ff' }]}>
              <Phone size={20} color="#2563eb" />
            </View>
            <Text style={styles.categoryTitle}>Call Issues</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.categoryCard}>
            <View style={[styles.categoryIconBg, { backgroundColor: '#f0fdf4' }]}>
              <RotateCcw size={20} color="#16a34a" />
            </View>
            <Text style={styles.categoryTitle}>Lead Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.categoryCard}>
            <View style={[styles.categoryIconBg, { backgroundColor: '#fef3c7' }]}>
              <Calendar size={20} color="#d97706" />
            </View>
            <Text style={styles.categoryTitle}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.categoryCard}>
            <View style={[styles.categoryIconBg, { backgroundColor: '#f3e8ff' }]}>
              <Award size={20} color="#9333ea" />
            </View>
            <Text style={styles.categoryTitle}>Incentives</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {faqs.map((faq, i) => (
            <View key={i} style={styles.faqCard}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <ChevronDown size={16} color="#64748b" />
              </View>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </View>

        {/* Direct Contact Support */}
        <Text style={styles.sectionTitle}>Need More Help?</Text>
        <View style={styles.supportRow}>
          <TouchableOpacity style={styles.callSupportBtn}>
            <Phone size={16} color="#ffffff" />
            <Text style={styles.supportBtnText}>Call Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.whatsappSupportBtn}>
            <MessageSquare size={16} color="#ffffff" />
            <Text style={styles.supportBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  faqList: {
    gap: 10,
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 18,
  },
  supportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callSupportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  whatsappSupportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  supportBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
