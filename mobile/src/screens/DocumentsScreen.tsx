import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { ArrowLeft, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { workspaceService, formatBytes, type DocumentRow } from '../services/workspaceService';

/**
 * The documents this agent has uploaded, and what happened to them.
 *
 * This screen used to be "Documents & Scripts", with tabs for Pitch Scripts,
 * Brochures and FAQs over four files written into the file itself -- a Hindi
 * home-loan pitch script, a rate card dated May 2024, an objection-handling
 * guide and an objection matrix, with sizes to match. None existed. The tabs
 * filtered nothing: all four rendered whichever was selected. The eye and
 * download buttons beside each had no handlers, which was just as well, because
 * there was nothing to open.
 *
 * The `documents` table is not a script library. It holds files an agent
 * uploads -- identity documents and the like -- with a review status an admin
 * sets, and that is what this shows now. A script library would need its own
 * table, and inventing one on screen did not create it.
 *
 * Viewing and downloading are not offered. Files live in Cloudflare R2 and
 * reaching one needs a presigned GET from the server, which the mobile app has
 * no route to -- it talks only to Supabase. Offering a button that cannot work
 * is what this screen was already doing.
 */

interface DocumentsScreenProps {
  onBack: () => void;
  companyId?: string | null;
  userId?: string | null;
}

const STATUS_LOOK: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', Icon: XCircle },
  pending:  { label: 'Awaiting review', color: '#b45309', bg: '#fffbeb', Icon: Clock },
};

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onBack, companyId, userId }) => {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !userId) { setDocs([]); return; }
    setError(null);
    try {
      setDocs(await workspaceService.documents(companyId, userId));
    } catch (e) {
      setDocs(null);
      setError(e instanceof Error ? e.message : 'Could not load your documents.');
    }
  }, [companyId, userId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My documents</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          />
        }
      >
        {error && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load your documents</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && docs === null && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
          </View>
        )}

        {!error && docs !== null && docs.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Nothing uploaded yet</Text>
            <Text style={styles.stateBody}>
              Documents your admin asks you for are uploaded from the web app, and their
              review status shows up here.
            </Text>
          </View>
        )}

        {docs !== null && docs.length > 0 && (
          <View style={styles.docList}>
            {docs.map((doc) => {
              const look = STATUS_LOOK[String(doc.status).toLowerCase()] ?? STATUS_LOOK.pending;
              const { Icon } = look;
              return (
                <View key={doc.id} style={styles.card}>
                  <View style={styles.iconSquare}>
                    <FileText size={22} color="#64748b" />
                  </View>

                  <View style={styles.cardMain}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.fileName}</Text>
                    <Text style={styles.docMeta}>
                      {doc.category} • {formatBytes(doc.sizeBytes)}
                      {doc.uploadedAt
                        ? ` • ${new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                        : ''}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: look.bg }]}>
                    <Icon size={13} color={look.color} />
                    <Text style={[styles.statusText, { color: look.color }]}>{look.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  docList: { gap: 12, marginTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 14,
  },
  iconSquare: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center',
  },
  cardMain: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  docMeta: { fontSize: 11.5, color: '#64748b', marginTop: 3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9,
  },
  statusText: { fontSize: 10.5, fontWeight: '800' },

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
