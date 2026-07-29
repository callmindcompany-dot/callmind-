import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';

interface PrivacyTermsWebViewProps {
  type?: 'privacy' | 'terms';
  onBack: () => void;
}

export const PrivacyTermsWebView: React.FC<PrivacyTermsWebViewProps> = ({ type = 'privacy', onBack }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(type);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Terms</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <ShieldCheck size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'privacy' && styles.tabChipActive]}
          onPress={() => setActiveTab('privacy')}
        >
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'terms' && styles.tabChipActive]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Last Updated: 29 July 2026</Text>

          {activeTab === 'privacy' ? (
            <View style={styles.policyBlock}>
              <Text style={styles.sectionHeading}>1. Information Collection & Usage</Text>
              <Text style={styles.paragraph}>
                CallMind collects telecalling logs (call duration, timestamp, recipient masked phone numbers) to allow business owners to monitor attendance and lead pipeline progress. We only collect data necessary to enable telecalling workflow management.
              </Text>

              <Text style={styles.sectionHeading}>2. Call Log & Contact Permissions</Text>
              <Text style={styles.paragraph}>
                Permissions are exclusively requested to detect call outcomes, auto-log durations, and allow instant dialing without leaving the CallMind interface. Contacts accessed on your device are never uploaded or shared with external parties.
              </Text>

              <Text style={styles.sectionHeading}>3. Data Security & Encryption</Text>
              <Text style={styles.paragraph}>
                All lead data and call metadata is encrypted in transit via TLS 1.3 / SSL and stored in enterprise PostgreSQL databases protected with Row Level Security (RLS) policies.
              </Text>

              <Text style={styles.sectionHeading}>4. Third-Party Data Sharing</Text>
              <Text style={styles.paragraph}>
                We do not sell, rent, or monetize your personal or workspace data. Data is only shared with authorized infrastructure providers (such as Supabase for database storage and Google OAuth for authentication) under strict confidentiality agreements.
              </Text>

              <Text style={styles.sectionHeading}>5. Data Retention & Deletion</Text>
              <Text style={styles.paragraph}>
                Call logs and profile data are retained for the duration of your workspace subscription. Upon workspace termination or explicit account deletion request, your data will be permanently purged within 30 days.
              </Text>

              <Text style={styles.sectionHeading}>6. User Rights (GDPR & Indian IT Act)</Text>
              <Text style={styles.paragraph}>
                Under the Information Technology Act 2000 (India) and applicable global privacy regulations, users retain the right to access, rectify, or request deletion of their personal data maintained in the CallMind platform.
              </Text>

              <Text style={styles.sectionHeading}>7. Cookies & Local Storage</Text>
              <Text style={styles.paragraph}>
                The CallMind mobile app uses secure local storage (AsyncStorage) solely to persist session authentication tokens and offline call queues.
              </Text>

              <Text style={styles.sectionHeading}>8. Protection of Children's Privacy</Text>
              <Text style={styles.paragraph}>
                CallMind is a B2B enterprise telecalling platform intended strictly for professional business use. We do not knowingly collect personal data from individuals under 18 years of age.
              </Text>

              <Text style={styles.sectionHeading}>9. Policy Amendments</Text>
              <Text style={styles.paragraph}>
                We may update this Privacy Policy from time to time. Any material changes will be communicated through in-app announcements or direct email notification to workspace administrators.
              </Text>

              <Text style={styles.sectionHeading}>10. Contact Information & Support</Text>
              <Text style={styles.paragraph}>
                If you have any privacy questions or requests regarding your data, please contact our Data Protection Office at support@callmind.ai.
              </Text>
            </View>
          ) : (
            <View style={styles.policyBlock}>
              <Text style={styles.sectionHeading}>1. User Authorization & Eligibility</Text>
              <Text style={styles.paragraph}>
                The CallMind mobile application is provided exclusively for authorized telecallers affiliated with an active business workspace subscription. Admin and founder accounts must access management functions via the web dashboard.
              </Text>

              <Text style={styles.sectionHeading}>2. Acceptable Use Policy</Text>
              <Text style={styles.paragraph}>
                You agree to use CallMind in compliance with all local laws and telecommunication regulations (NDNC / DND registries). Unsolicited spam, harassing calls, or inappropriate behavior towards lead contacts is strictly prohibited.
              </Text>

              <Text style={styles.sectionHeading}>3. Prohibited Activities</Text>
              <Text style={styles.paragraph}>
                Users are explicitly barred from attempting to reverse-engineer the mobile application, scraping lead datasets, bypassing role-based access controls, or sharing credentials with unauthorized third parties.
              </Text>

              <Text style={styles.sectionHeading}>4. Account Suspension & Termination</Text>
              <Text style={styles.paragraph}>
                CallMind reserves the right to immediately suspend or terminate accounts engaging in fraudulent activities, policy violations, or non-payment of workspace subscription fees.
              </Text>

              <Text style={styles.sectionHeading}>5. Intellectual Property Rights</Text>
              <Text style={styles.paragraph}>
                All brand marks, design assets, software algorithms, and UI interfaces of CallMind are the exclusive intellectual property of CallMind Technologies Inc.
              </Text>

              <Text style={styles.sectionHeading}>6. Limitation of Liability</Text>
              <Text style={styles.paragraph}>
                CallMind shall not be liable for indirect, incidental, or consequential damages arising out of telecommunication network disruptions, device hardware incompatibilities, or carrier signal failures.
              </Text>

              <Text style={styles.sectionHeading}>7. Disclaimer of Warranties</Text>
              <Text style={styles.paragraph}>
                The service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied, including merchantability or fitness for a specific telecalling outcome.
              </Text>

              <Text style={styles.sectionHeading}>8. Indemnification Clause</Text>
              <Text style={styles.paragraph}>
                You agree to indemnify and hold harmless CallMind, its officers, employees, and affiliates from any claims or legal expenses resulting from your violation of telecommunication rules or customer privacy regulations.
              </Text>

              <Text style={styles.sectionHeading}>9. Governing Law & Jurisdiction</Text>
              <Text style={styles.paragraph}>
                These Terms shall be governed by and construed in accordance with the laws of India. Courts in Pune, Maharashtra shall have exclusive jurisdiction over any legal proceedings.
              </Text>

              <Text style={styles.sectionHeading}>10. Dispute Resolution & Amendments</Text>
              <Text style={styles.paragraph}>
                Any disputes arising under these Terms shall first be attempted to be resolved through amicable negotiation. We reserve the right to amend these Terms at any time by posting updated terms in the app.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.acceptBtn} onPress={onBack}>
          <Text style={styles.acceptText}>I Accept Privacy Terms</Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 16,
  },
  policyBlock: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  paragraph: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
  },
  acceptBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
