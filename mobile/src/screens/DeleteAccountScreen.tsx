import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { ChevronLeft, AlertTriangle, Trash2, Building2, Scale, ShieldAlert } from 'lucide-react-native';
import { accountService, deletionBlockOf, type DeletionPreview } from '../services/accountService';
import { ENTITY } from '../config/legal';

interface DeleteAccountScreenProps {
  onBack: () => void;
  /** Called once the account is gone, to tear down the session and return to sign-in. */
  onDeleted: () => void;
}

/**
 * Deleting your own account.
 *
 * Required by the Play Store of any app that creates accounts. There was no
 * path before this: the privacy policy told people to email the grievance
 * address, which does not pass review.
 *
 * The counts on this screen come from account_deletion_preview() rather than
 * being described in the abstract, because "some of your data" is not something
 * anyone can make a decision about. If the query fails the screen says so and
 * refuses to arm the button -- showing zeroes would tell an agent they have
 * nothing to lose, which is the one thing this screen must never get wrong.
 *
 * There is no grace period and the screen does not pretend there is one.
 * pg_cron is not installed on this database, so "your account will be deleted in
 * 7 days" would be a promise with nothing behind it to keep. Typing the word is
 * the guard instead.
 */

const CONFIRM_WORD = 'DELETE';

export const DeleteAccountScreen: React.FC<DeleteAccountScreenProps> = ({ onBack, onDeleted }) => {
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await accountService.preview();
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            (e as { message?: string })?.message ??
            'Could not check what would be deleted. Try again when you have a connection.',
          );
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await accountService.deleteAccount(typed.trim());
      onDeleted();
    } catch (e) {
      const block = deletionBlockOf(e);
      setDeleteError(
        block === 'LAST_ADMIN'
          ? (e as { message?: string })?.message ?? 'You are the only administrator of this workspace.'
          : (e as { message?: string })?.message ?? 'Deletion failed. Nothing was removed.',
      );
      setDeleting(false);
    }
  };

  const blockedAsLastAdmin = preview?.blocked === 'LAST_ADMIN';
  const armed = preview !== null && !blockedAsLastAdmin && typed.trim() === CONFIRM_WORD && !deleting;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete account</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.warnBanner}>
          <AlertTriangle size={18} color="#b91c1c" />
          <Text style={styles.warnText}>
            This removes your account straight away. There is no undo and no waiting period.
          </Text>
        </View>

        {loadError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not check your data</Text>
            <Text style={styles.errorBody}>{loadError}</Text>
          </View>
        )}

        {!preview && !loadError && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.loadingText}>Checking what would be deleted…</Text>
          </View>
        )}

        {blockedAsLastAdmin && (
          <View style={styles.blockCard}>
            <ShieldAlert size={20} color="#b45309" />
            <View style={styles.blockMain}>
              <Text style={styles.blockTitle}>You cannot delete this account yet</Text>
              <Text style={styles.blockBody}>
                You are the only administrator of a workspace with {preview?.otherMembers}{' '}
                other {preview?.otherMembers === 1 ? 'member' : 'members'}. If you go, nobody can
                approve joins, reassign leads or pay for the workspace.
                {'\n\n'}
                Make someone else an administrator on the web app first, then come back.
              </Text>
            </View>
          </View>
        )}

        {preview && (
          <>
            <Text style={styles.sectionLabel}>Signed in as</Text>
            <View style={styles.plainCard}>
              <Text style={styles.emailText}>{preview.email}</Text>
              {!!preview.role && <Text style={styles.roleText}>{preview.role}</Text>}
            </View>

            <Text style={styles.sectionLabel}>What gets deleted</Text>
            <View style={styles.groupCard}>
              <View style={styles.groupHead}>
                <Trash2 size={16} color="#b91c1c" />
                <Text style={styles.groupTitle}>Yours, and removed</Text>
              </View>
              <Text style={styles.groupBody}>
                Your profile and sign-in. Your notification settings, saved and recent searches,
                support chat, and read receipts.
              </Text>
              {preview.attendanceDays > 0 && (
                <Text style={styles.groupNote}>
                  Also your {preview.attendanceDays} attendance{' '}
                  {preview.attendanceDays === 1 ? 'record' : 'records'} — your employer will not be
                  able to see them afterwards.
                </Text>
              )}
            </View>

            <View style={styles.groupCard}>
              <View style={styles.groupHead}>
                <Building2 size={16} color="#2563eb" />
                <Text style={styles.groupTitle}>Your company's, and kept</Text>
              </View>
              <Text style={styles.groupBody}>
                Work you did belongs to the company you work for, so it stays — with your name
                taken off it.
              </Text>
              <View style={styles.countRow}>
                <View style={styles.countBox}>
                  <Text style={styles.countNum}>{preview.leadsToReturn}</Text>
                  <Text style={styles.countLabel}>
                    {preview.leadsToReturn === 1 ? 'lead goes back' : 'leads go back'} to your team
                  </Text>
                </View>
                <View style={styles.countBox}>
                  <Text style={styles.countNum}>{preview.callsKept}</Text>
                  <Text style={styles.countLabel}>
                    call {preview.callsKept === 1 ? 'record stays' : 'records stay'}, unnamed
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.groupCard}>
              <View style={styles.groupHead}>
                <Scale size={16} color="#64748b" />
                <Text style={styles.groupTitle}>Kept because the law requires it</Text>
              </View>
              <Text style={styles.groupBody}>
                Invoices and billing records, for as long as Indian tax law requires, and the
                security audit log. Neither carries your name after this.
              </Text>
            </View>

            <Text style={styles.rightsNote}>
              Under the Digital Personal Data Protection Act 2023 you can also ask for a copy of
              your data or have it corrected. Write to {ENTITY.grievanceEmail}.
            </Text>

            {!blockedAsLastAdmin && (
              <>
                <Text style={styles.sectionLabel}>Confirm</Text>
                <Text style={styles.confirmHint}>
                  Type <Text style={styles.confirmWord}>{CONFIRM_WORD}</Text> to turn on the button.
                </Text>
                <TextInput
                  style={styles.input}
                  value={typed}
                  onChangeText={setTyped}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={CONFIRM_WORD}
                  placeholderTextColor="#cbd5e1"
                  editable={!deleting}
                />

                {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}

                <TouchableOpacity
                  style={[styles.deleteBtn, !armed && styles.deleteBtnOff]}
                  disabled={!armed}
                  onPress={handleDelete}
                  activeOpacity={0.85}
                >
                  {deleting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Trash2 size={16} color={armed ? '#ffffff' : '#94a3b8'} />
                      <Text style={[styles.deleteBtnText, !armed && styles.deleteBtnTextOff]}>
                        Delete my account
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={onBack} disabled={deleting}>
          <Text style={styles.cancelText}>Keep my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  warnBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  warnText: { flex: 1, fontSize: 13, color: '#991b1b', fontWeight: '600', lineHeight: 19 },

  loadingBox: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  loadingText: { fontSize: 13, color: '#64748b' },

  errorCard: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 16, padding: 14, marginBottom: 16,
  },
  errorTitle: { fontSize: 14, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  errorBody: { fontSize: 12.5, color: '#a16207', lineHeight: 18 },

  blockCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 18, padding: 16, marginBottom: 20,
  },
  blockMain: { flex: 1 },
  blockTitle: { fontSize: 14, fontWeight: '800', color: '#92400e', marginBottom: 6 },
  blockBody: { fontSize: 13, color: '#a16207', lineHeight: 19 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 8,
  },
  plainCard: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16,
    padding: 14, marginBottom: 12,
  },
  emailText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  roleText: { fontSize: 12, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },

  groupCard: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18,
    padding: 16, marginBottom: 12,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  groupBody: { fontSize: 13, color: '#475569', lineHeight: 19 },
  groupNote: {
    fontSize: 12.5, color: '#b45309', lineHeight: 18, marginTop: 8,
    backgroundColor: '#fffbeb', padding: 10, borderRadius: 10,
  },

  countRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  countBox: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  countNum: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  countLabel: { fontSize: 11.5, color: '#64748b', marginTop: 2, lineHeight: 16 },

  rightsNote: {
    fontSize: 12, color: '#94a3b8', lineHeight: 18, marginTop: 4, marginBottom: 8,
  },

  confirmHint: { fontSize: 13, color: '#475569', marginBottom: 10 },
  confirmWord: { fontWeight: '900', color: '#0f172a' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    fontWeight: '700', color: '#0f172a', letterSpacing: 1, marginBottom: 14,
  },
  deleteError: { fontSize: 12.5, color: '#b91c1c', marginBottom: 12, lineHeight: 18 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#dc2626', paddingVertical: 15, borderRadius: 16,
  },
  deleteBtnOff: { backgroundColor: '#f1f5f9' },
  deleteBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  deleteBtnTextOff: { color: '#94a3b8' },

  cancelBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
});
