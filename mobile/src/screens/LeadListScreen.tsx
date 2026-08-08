import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Search, SlidersHorizontal, Phone, MessageSquare, FileText, Plus, ChevronDown } from 'lucide-react-native';
import { EmptyStateComponent } from '../components/EmptyStateComponent';

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  city: string;
  tag: string;
  time: string;
  color: string;
  bgColor: string;
  initials: string;
  branch?: string;
  status?: string;
  email?: string;
  priority?: string;
  address?: string;
  comment?: string;
  /** ISO created_at. `time` is a display label and does not parse. */
  createdAt?: string;
}

interface LeadListScreenProps {
  onSelectLead: (leadId: string) => void;
  onCallLead?: (lead: LeadItem) => void;
  onBack: () => void;
  leads?: LeadItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const LeadListScreen: React.FC<LeadListScreenProps> = ({
  onSelectLead,
  onCallLead,
  onBack,
  leads = [],
  refreshing = false,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = ['All', 'New', 'Contacted', 'Interested', 'Follow-up'];

  const filteredLeads = leads.filter((lead) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchPhone = lead.phone.toLowerCase().includes(q);
      const matchCity = lead.city.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCity) return false;
    }

    // Tab filter
    if (activeTab === 'All') return true;
    if (activeTab === 'New') return lead.tag === 'New' || lead.status === 'New';
    if (activeTab === 'Contacted') return lead.tag === 'Contacted' || lead.status === 'Contacted';
    if (activeTab === 'Interested') return lead.tag === 'Interested' || lead.status === 'Interested';
    if (activeTab === 'Follow-up') return lead.tag === 'Follow-up' || lead.status === 'Call Back' || lead.status === 'Call Back Later';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 2 Screen 6 */}
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Search size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <SlidersHorizontal size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Input */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or city"
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={{ paddingRight: 24 }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab ? styles.activeTabButton : null]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab ? styles.activeTabText : null]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Row */}
      <View style={styles.sortRow}>
        <TouchableOpacity style={styles.sortDropdown}>
          <Text style={styles.sortText}>Sort by: <Text style={styles.sortBold}>Latest</Text></Text>
          <ChevronDown size={14} color="#0f172a" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortIconBtn}>
          <SlidersHorizontal size={14} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Lead Cards List */}
      <ScrollView
        contentContainerStyle={styles.leadListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          ) : undefined
        }
      >
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <TouchableOpacity key={lead.id} style={styles.card} onPress={() => onSelectLead(lead.id)} activeOpacity={0.75}>
              <View style={[styles.cardAvatar, { backgroundColor: lead.bgColor }]}>
                <Text style={[styles.avatarText, { color: lead.color }]}>{lead.initials}</Text>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{lead.name}</Text>
                  <View style={[styles.tagBadge, { backgroundColor: lead.color + '15' }]}>
                    <Text style={[styles.tagText, { color: lead.color }]}>{lead.tag}</Text>
                  </View>
                </View>
                <Text style={styles.cardPhone}>{lead.phone}</Text>
                <Text style={styles.cardCity}>{lead.city}{lead.branch ? ` • 📍 ${lead.branch}` : ''}</Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.cardTime}>{lead.time}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#eff6ff' }]}
                    onPress={() => onCallLead ? onCallLead(lead) : onSelectLead(lead.id)}
                  >
                    <Phone size={14} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]}>
                    <MessageSquare size={14} color="#16a34a" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f8fafc' }]}>
                    <FileText size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyStateComponent type={searchQuery ? 'no_search' : 'no_leads'} />
        )}
      </ScrollView>

      {/* Floating Action Add Plus Button */}
      <TouchableOpacity style={styles.fabBtn} activeOpacity={0.85}>
        <Plus size={24} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
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
    paddingLeft: 20,
    maxHeight: 40,
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeTabButton: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 13,
    color: '#64748b',
  },
  sortBold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  sortIconBtn: {
    padding: 4,
  },
  leadListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardPhone: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  cardCity: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 85,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
