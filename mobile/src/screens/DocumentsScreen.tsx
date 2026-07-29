import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ArrowLeft, Search, FileText, Download, Eye } from 'lucide-react-native';

interface DocumentsScreenProps {
  onBack: () => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'scripts' | 'brochures' | 'faqs'>('scripts');
  const [searchQuery, setSearchQuery] = useState('');

  const docs = [
    { id: '1', title: 'Home Loan Pitch Script (Hindi)', type: 'PDF', size: '1.2 MB', category: 'scripts', bgColor: '#FEE2E2', iconColor: '#EF4444' },
    { id: '2', title: 'Product Rate Card May 2024', type: 'PDF', size: '850 KB', category: 'brochures', bgColor: '#DBEAFE', iconColor: '#2563eb' },
    { id: '3', title: 'Objection Handling FAQ Guide', type: 'DOCX', size: '2.1 MB', category: 'faqs', bgColor: '#FEF3C7', iconColor: '#D97706' },
    { id: '4', title: 'Customer Objection Matrix', type: 'DOCX', size: '1.5 MB', category: 'scripts', bgColor: '#DCFCE7', iconColor: '#16A34A' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 5 Screen 18 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents & Scripts</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Search size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sales scripts, PDFs, brochures..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'scripts' && styles.tabChipActive]}
          onPress={() => setActiveTab('scripts')}
        >
          <Text style={[styles.tabText, activeTab === 'scripts' && styles.tabTextActive]}>
            Pitch Scripts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'brochures' && styles.tabChipActive]}
          onPress={() => setActiveTab('brochures')}
        >
          <Text style={[styles.tabText, activeTab === 'brochures' && styles.tabTextActive]}>
            Brochures
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'faqs' && styles.tabChipActive]}
          onPress={() => setActiveTab('faqs')}
        >
          <Text style={[styles.tabText, activeTab === 'faqs' && styles.tabTextActive]}>
            FAQs
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.docList}>
          {docs.map((doc) => (
            <View key={doc.id} style={styles.card}>
              <View style={[styles.iconSquare, { backgroundColor: doc.bgColor }]}>
                <FileText size={22} color={doc.iconColor} />
              </View>

              <View style={styles.cardMain}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <Text style={styles.docMeta}>{doc.type} • {doc.size}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Eye size={16} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Download size={16} color="#16a34a" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  docList: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconSquare: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  docMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
});
