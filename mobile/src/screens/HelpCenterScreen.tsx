import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { ArrowLeft, Search, Mail, ChevronDown, ChevronUp } from 'lucide-react-native';
import { workspaceService, type FaqRow } from '../services/workspaceService';
import { ENTITY } from '../config/legal';

/**
 * Help, from the help_faqs table.
 *
 * The four questions here used to be written into the file, and each answered
 * with instructions for something that does not exist:
 *
 *   "How to resolve SIM 1 connection error?" — go to Call & SIM Settings.
 *   There is no such screen, and the app cannot see which SIM is used.
 *
 *   "When are weekly incentive payouts processed?" — every Sunday midnight,
 *   paid Monday afternoon. There is no incentive system anywhere in this
 *   product: no table, no column, nothing that could ever pay it.
 *
 *   "How to request a lead reassignment?" — via a three-dots menu on lead
 *   detail. That menu had no handler and no such request exists.
 *
 *   "What if my punch out fails due to GPS?" — tap Refresh Location. No such
 *   button.
 *
 * An agent following any of them would be looking for controls that were never
 * built. Four category tiles above them had no handlers either, one of them
 * labelled Incentives.
 *
 * The two support buttons at the bottom -- Call Support and WhatsApp -- had no
 * handlers and no number behind them. There is one real support address, in
 * src/config/legal.ts, and it is what the privacy policy publishes.
 */

interface HelpCenterScreenProps {
  onBack: () => void;
  companyId?: string | null;
}

export const HelpCenterScreen: React.FC<HelpCenterScreenProps> = ({ onBack, companyId }) => {
  const [query, setQuery] = useState('');
  const [faqs, setFaqs] = useState<FaqRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setFaqs(await workspaceService.faqs(companyId ?? ''));
    } catch (e) {
      setFaqs(null);
      setError(e instanceof Error ? e.message : 'Could not load help articles.');
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const term = query.trim().toLowerCase();
  const shown = (faqs ?? []).filter(
    (f) => !term || f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load help</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && faqs === null && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
          </View>
        )}

        {!error && faqs !== null && shown.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {term ? 'Nothing matches that' : 'No help articles yet'}
            </Text>
            <Text style={styles.stateBody}>
              {term
                ? 'Try a different word, or write to us below.'
                : 'Articles your admin writes will show up here. Until then, write to us below.'}
            </Text>
          </View>
        )}

        {shown.length > 0 && (
          <View style={styles.faqList}>
            {shown.map((faq) => {
              const open = openId === faq.id;
              return (
                <TouchableOpacity
                  key={faq.id}
                  style={styles.faqCard}
                  activeOpacity={0.8}
                  onPress={() => setOpenId(open ? null : faq.id)}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    {open
                      ? <ChevronUp size={16} color="#64748b" />
                      : <ChevronDown size={16} color="#64748b" />}
                  </View>
                  {open && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Still stuck?</Text>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => Linking.openURL(`mailto:${ENTITY.supportEmail}`).catch(() => {})}
        >
          <Mail size={16} color="#ffffff" />
          <Text style={styles.supportBtnText}>Email {ENTITY.supportEmail}</Text>
        </TouchableOpacity>
        <Text style={styles.supportNote}>
          Tell us what you were doing and what happened. It reaches a person.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 8,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', padding: 0 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 28, marginBottom: 10,
  },

  faqList: { gap: 10, marginTop: 4 },
  faqCard: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 15,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  faqAnswer: { fontSize: 13, color: '#64748b', lineHeight: 20, marginTop: 10 },

  supportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', paddingVertical: 15, borderRadius: 16,
  },
  supportBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  supportNote: {
    fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 10, lineHeight: 18,
  },

  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  stateCard: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18,
    padding: 24, alignItems: 'center', marginTop: 12,
  },
  stateTitle: {
    fontSize: 15, fontWeight: '800', color: '#0f172a',
    marginBottom: 6, textAlign: 'center',
  },
  stateBody: { fontSize: 13, color: '#64748b', lineHeight: 19, textAlign: 'center' },
  retryBtn: {
    marginTop: 14, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#eff6ff',
  },
  retryText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
});
