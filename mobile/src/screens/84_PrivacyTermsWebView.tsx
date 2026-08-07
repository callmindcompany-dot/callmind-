import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, ShieldCheck, ExternalLink, Check } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, ENTITY, OPERATOR_NAME, type LegalSlug } from '../config/legal';

/**
 * The legal documents, in the app.
 *
 * This screen used to carry its own copy of the text — a fourth version, which
 * disagreed with the three on the web. It described call-log and contacts
 * permissions the app does not request, said nothing about the location it does
 * collect at attendance, named the operator as "CallMind Technologies Inc."
 * while placing jurisdiction in Pune, and pointed at support@callmind.ai, which
 * is not our address.
 *
 * It also had no refund policy tab, and its "I Accept" button called onBack and
 * recorded nothing, while the web app has a user_acceptances table and a
 * re-acceptance flow built on it.
 *
 * The words now come from src/config/legal.ts, generated into
 * mobile/src/config/legal.ts. The full version is also linked on the web, which
 * is what the Play Store listing points at.
 */

interface PrivacyTermsWebViewProps {
  type?: LegalSlug;
  onBack: () => void;
  /** Set when the screen is shown to obtain acceptance rather than to inform. */
  requireAcceptance?: boolean;
  onAccepted?: () => void;
}

export const PrivacyTermsWebView: React.FC<PrivacyTermsWebViewProps> = ({
  type = 'privacy',
  onBack,
  requireAcceptance = false,
  onAccepted,
}) => {
  const [activeTab, setActiveTab] = useState<LegalSlug>(type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const doc = LEGAL_DOCUMENTS[activeTab];

  const formattedDate = new Date(doc.effectiveDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  /**
   * Records the acceptance against the version that was on screen.
   *
   * The button used to just close the screen. user_acceptances is what
   * useLegalCompliance checks to decide whether a user must re-accept after a
   * document changes, so an acceptance that writes nothing means the user is
   * asked again on every sign-in — or, worse, is treated as having agreed to
   * something no record exists of.
   */
  const handleAccept = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) throw new Error('You are signed out. Sign in and try again.');

      const rows = LEGAL_SLUGS.map((slug) => ({
        user_id: user.id,
        company_id: (user.app_metadata as Record<string, unknown> | undefined)?.company_id ?? null,
        page_slug: slug,
        version: LEGAL_DOCUMENTS[slug].version,
        accepted_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from('user_acceptances').insert(rows);
      if (insertError) throw insertError;

      setAccepted(true);
      onAccepted?.();
      onBack();
    } catch (e: unknown) {
      // Shown, not swallowed. If the record did not save, the user should not
      // be told it did.
      setError(e instanceof Error ? e.message : 'Could not save your acceptance.');
    } finally {
      setSaving(false);
    }
  };

  const openOnWeb = () => {
    Linking.openURL(`${ENTITY.website}/legal/${activeTab}`).catch(() =>
      setError('Could not open the browser.'),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} accessibilityLabel="Go back">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={openOnWeb} accessibilityLabel="Open on the web">
          <ExternalLink size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {LEGAL_SLUGS.map((slug) => (
          <TouchableOpacity
            key={slug}
            style={[styles.tabChip, activeTab === slug && styles.tabChipActive]}
            onPress={() => setActiveTab(slug)}
          >
            <Text style={[styles.tabText, activeTab === slug && styles.tabTextActive]}>
              {slug === 'privacy' ? 'Privacy' : slug === 'terms' ? 'Terms' : 'Refunds'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.docTitle}>{doc.title}</Text>
          <Text style={styles.lastUpdated}>
            Version {doc.version} · Last updated {formattedDate}
          </Text>
          <Text style={styles.summary}>{doc.summary}</Text>

          <View style={styles.policyBlock}>
            {doc.sections.map((section, index) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionHeading}>
                  {index + 1}. {section.title}
                </Text>
                {section.body.map((paragraph, i) => (
                  <Text key={i} style={styles.paragraph}>
                    {paragraph}
                  </Text>
                ))}
                {section.bullets?.map((bullet, i) => (
                  <Text key={`b${i}`} style={styles.bullet}>
                    {'•'}  {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.webLink} onPress={openOnWeb}>
          <ExternalLink size={14} color="#2563eb" />
          <Text style={styles.webLinkText}>Read the full version on {ENTITY.website.replace('https://', '')}</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Only shown when the screen is asking for consent. Previously it was
            always there, and always did nothing. */}
        {requireAcceptance && (
          <TouchableOpacity
            style={[styles.acceptBtn, (saving || accepted) && styles.acceptBtnDisabled]}
            onPress={handleAccept}
            disabled={saving || accepted}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                {accepted && <Check size={16} color="#ffffff" />}
                <Text style={styles.acceptText}>
                  {accepted ? 'Accepted' : 'I accept all three documents'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <ShieldCheck size={13} color="#94a3b8" />
          <Text style={styles.footerText}>
            {ENTITY.brand} is a product of {ENTITY.business}, operated by {OPERATOR_NAME}.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
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
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabChipActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  docTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  lastUpdated: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 10 },
  summary: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 18,
  },
  policyBlock: { gap: 20 },
  section: { gap: 8 },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  paragraph: { fontSize: 13, color: '#475569', lineHeight: 20, fontWeight: '500' },
  bullet: { fontSize: 13, color: '#475569', lineHeight: 20, fontWeight: '500', paddingLeft: 4 },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 12,
  },
  webLinkText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, color: '#b91c1c', fontWeight: '600' },
  acceptBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 18,
  },
  footerText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});
