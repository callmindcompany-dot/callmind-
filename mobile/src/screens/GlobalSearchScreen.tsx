import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Search, X, Clock, UserCheck, PhoneCall, CreditCard, CheckSquare, ShieldAlert, FileText, ChevronRight } from 'lucide-react-native';

export interface MobileSearchResultItem {
  id: string;
  module: 'leads' | 'calls' | 'invoices' | 'tasks' | 'tickets' | 'documents';
  title: string;
  subtitle: string;
  badge?: string;
  actionUrl: string;
}

interface GlobalSearchScreenProps {
  onBack: () => void;
  onSelectResult: (item: MobileSearchResultItem) => void;
  results?: MobileSearchResultItem[];
  isLoading?: boolean;
}

export const GlobalSearchScreen: React.FC<GlobalSearchScreenProps> = ({
  onBack,
  onSelectResult,
  results = [],
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Rahul Sharma',
    '',  // was a hardcoded number in a demo result list
    'INV-101',
    'Follow up callback'
  ]);

  const filteredResults = results.filter((r) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'leads') return r.module === 'leads';
    if (activeCategory === 'calls') return r.module === 'calls';
    if (activeCategory === 'financials') return r.module === 'invoices';
    if (activeCategory === 'tasks') return r.module === 'tasks';
    return true;
  });

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'leads':
        return UserCheck;
      case 'calls':
        return PhoneCall;
      case 'invoices':
        return CreditCard;
      case 'tasks':
        return CheckSquare;
      default:
        return FileText;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search leads, phone (+91), calls, bills..."
            placeholderTextColor="#94a3b8"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.categoriesRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {[
            { id: 'all', label: 'All' },
            { id: 'leads', label: 'Leads' },
            { id: 'calls', label: 'Calls' },
            { id: 'financials', label: 'Financials' },
            { id: 'tasks', label: 'Tasks' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, activeCategory === cat.id && styles.chipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.chipText, activeCategory === cat.id && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results or Recent Searches Body */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Searching CRM records...</Text>
          </View>
        ) : query.length >= 2 ? (
          filteredResults.length > 0 ? (
            <View style={styles.resultsGroup}>
              {filteredResults.map((item) => {
                const IconComponent = getModuleIcon(item.module);
                return (
                  <TouchableOpacity
                    key={`${item.module}-${item.id}`}
                    style={styles.card}
                    onPress={() => onSelectResult(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.iconCircle}>
                      <IconComponent size={18} color="#2563eb" />
                    </View>
                    <View style={styles.cardMain}>
                      <View style={styles.titleRow}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No matching records</Text>
              <Text style={styles.emptySubtitle}>Try searching by phone number or lead name.</Text>
            </View>
          )
        ) : (
          /* Recent Search Chips */
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Clock size={14} color="#64748b" />
              <Text style={styles.recentTitle}>Recent Searches</Text>
            </View>
            <View style={styles.recentWrap}>
              {recentSearches.map((term, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.recentChip}
                  onPress={() => setQuery(term)}
                >
                  <Text style={styles.recentText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
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
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  categoriesRow: {
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  resultsGroup: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardMain: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  recentSection: {
    paddingTop: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  recentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
