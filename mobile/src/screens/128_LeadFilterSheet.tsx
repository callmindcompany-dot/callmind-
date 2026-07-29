import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Filter, RotateCcw, Sparkles } from 'lucide-react-native';

interface LeadFilterSheetProps {
  onApply: (filters: FilterState) => void;
  onDismiss: () => void;
  onReset: () => void;
}

export interface FilterState {
  status: string[];
  source: string[];
  tag: string[];
  sortBy: string;
}

export const LeadFilterSheet: React.FC<LeadFilterSheetProps> = ({ onApply, onDismiss, onReset }) => {
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    source: [],
    tag: [],
    sortBy: 'newest',
  });

  const statusOptions = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Not Interested', 'DND'];
  const sourceOptions = ['IndiaMART', 'TradeIndia', 'Facebook', 'Google Ads', 'Website', 'Manual', 'WhatsApp'];
  const tagOptions = ['Hot', 'Warm', 'Cold'];
  const sortOptions = [
    { key: 'newest', label: 'Newest First' },
    { key: 'oldest', label: 'Oldest First' },
    { key: 'ai_score', label: 'AI Score (High → Low)' },
    { key: 'name_az', label: 'Name A → Z' },
  ];

  const toggleOption = (category: keyof FilterState, value: string) => {
    if (category === 'sortBy') {
      setFilters(prev => ({ ...prev, sortBy: value }));
      return;
    }
    setFilters(prev => {
      const arr = prev[category] as string[];
      return {
        ...prev,
        [category]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const activeCount = filters.status.length + filters.source.length + filters.tag.length;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Filter size={20} color="#2563eb" />
            <Text style={styles.title}>Filter & Sort Leads</Text>
          </View>
          {activeCount > 0 && (
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <RotateCcw size={12} color="#dc2626" />
              <Text style={styles.resetText}>Reset All ({activeCount})</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          {/* Status */}
          <Text style={styles.sectionLabel}>Lead Status</Text>
          <View style={styles.chipGrid}>
            {statusOptions.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, filters.status.includes(s) && styles.chipActive]}
                onPress={() => toggleOption('status', s)}
              >
                <Text style={[styles.chipText, filters.status.includes(s) && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Source */}
          <Text style={styles.sectionLabel}>Lead Source</Text>
          <View style={styles.chipGrid}>
            {sourceOptions.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, filters.source.includes(s) && styles.chipActive]}
                onPress={() => toggleOption('source', s)}
              >
                <Text style={[styles.chipText, filters.source.includes(s) && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tag */}
          <Text style={styles.sectionLabel}>Intent Tag</Text>
          <View style={styles.chipGrid}>
            {tagOptions.map(t => {
              const tagColor = t === 'Hot' ? '#ef4444' : t === 'Warm' ? '#f59e0b' : '#64748b';
              const isActive = filters.tag.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagChip, { borderColor: isActive ? tagColor : '#e2e8f0', backgroundColor: isActive ? tagColor + '15' : '#f8fafc' }]}
                  onPress={() => toggleOption('tag', t)}
                >
                  <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
                  <Text style={[styles.tagChipText, { color: isActive ? tagColor : '#334155' }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sort */}
          <Text style={styles.sectionLabel}>Sort By</Text>
          <View style={styles.sortList}>
            {sortOptions.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortRow, filters.sortBy === s.key && styles.sortRowActive]}
                onPress={() => toggleOption('sortBy', s.key)}
              >
                <View style={[styles.radio, filters.sortBy === s.key && styles.radioActive]}>
                  {filters.sortBy === s.key && <View style={styles.radioDot} />}
                </View>

                {s.key === 'ai_score' && <Sparkles size={14} color="#2563eb" />}
                <Text style={[styles.sortLabel, filters.sortBy === s.key && styles.sortLabelActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(filters)}>
            <Text style={styles.applyText}>
              Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end', zIndex: 9999 },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  scrollContent: { maxHeight: 420 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: 10, marginTop: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#2563eb', fontWeight: '700' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagChipText: { fontSize: 13, fontWeight: '700' },
  sortList: { gap: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#f8fafc' },
  sortRowActive: { backgroundColor: '#eff6ff' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#2563eb' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' },
  sortLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  sortLabelActive: { color: '#2563eb', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  applyBtn: { flex: 2, paddingVertical: 16, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  applyText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
