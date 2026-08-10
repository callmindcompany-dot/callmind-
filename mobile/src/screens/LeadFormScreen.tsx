import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ArrowLeft, User, Phone, Mail, MapPin, MessageSquare, AlertTriangle } from 'lucide-react-native';
import { leadService } from '../services/leadService';
import type { LeadItem } from './LeadListScreen';

/**
 * Adding a lead, and correcting one.
 *
 * Neither was possible from the phone. Leads arrived by webhook or by the admin
 * importing a file, so a telecaller handed a number by a customer, a colleague
 * or a walk-in had nowhere to put it -- it went on paper, and the call they made
 * from it never reached the CRM. And every Edit control on LeadDetailScreen had
 * no handler, so an agent who learned the correct spelling of a name or a
 * working email on a call could not record it; the next person to ring dialled
 * the same wrong number.
 *
 * One screen, two modes. The fields are the ones a telecaller can actually know
 * from a conversation. Status is not among them -- that is set by the post-call
 * form, beside the call that justifies it, so the pipeline keeps meaning
 * something.
 */

interface LeadFormScreenProps {
  companyId?: string | null;
  userId?: string | null;
  /** Present for edit; absent for add. */
  lead?: LeadItem | null;
  onBack: () => void;
  /** Called with the lead id once it is saved. */
  onSaved: (leadId: string) => void;
}

const PRIORITIES = ['High', 'Medium', 'Low'] as const;

/** Postgres raises P0001 with a JSON DETAIL when the plan's lead limit is hit. */
function planLimitMessage(error: unknown): string | null {
  const details = (error as { details?: string } | null)?.details;
  if (typeof details !== 'string' || !details.includes('PLAN_LIMIT')) return null;
  return (error as { message?: string }).message
    ?? 'Your plan has no room for another lead. Ask your admin to upgrade.';
}

export const LeadFormScreen: React.FC<LeadFormScreenProps> = ({
  companyId,
  userId,
  lead,
  onBack,
  onSaved,
}) => {
  const editing = !!lead;

  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [city, setCity] = useState(lead?.address ?? '');
  const [comment, setComment] = useState(lead?.comment ?? '');
  const [priority, setPriority] = useState<string>(lead?.priority ?? 'Medium');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  const digits = phone.replace(/\D/g, '').length;
  const canSave = name.trim().length > 0 && digits >= 10 && !saving;

  const save = async () => {
    if (!companyId || !userId) {
      setError('You are not signed in to a workspace.');
      return;
    }
    setSaving(true);
    setError(null);
    setLimitHit(false);
    try {
      if (editing && lead) {
        await leadService.updateLeadDetails(companyId, lead.id, {
          name, phone, email, city, comment, priority,
        });
        onSaved(lead.id);
      } else {
        const id = await leadService.createLead({
          companyId, userId, name, phone, email, city, comment, priority,
        });
        onSaved(id);
      }
    } catch (e) {
      const plan = planLimitMessage(e);
      if (plan) {
        setLimitHit(true);
        setError(plan);
      } else {
        setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      }
      setSaving(false);
    }
  };

  const field = (
    label: string,
    Icon: React.ElementType,
    value: string,
    onChange: (t: string) => void,
    opts: { placeholder?: string; keyboardType?: 'default' | 'phone-pad' | 'email-address'; multiline?: boolean; required?: boolean } = {},
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
        {opts.required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={[styles.inputRow, opts.multiline && styles.inputRowTall]}>
        <Icon size={17} color="#94a3b8" />
        <TextInput
          style={[styles.input, opts.multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChange}
          placeholder={opts.placeholder}
          placeholderTextColor="#cbd5e1"
          keyboardType={opts.keyboardType ?? 'default'}
          multiline={opts.multiline}
          autoCapitalize={opts.keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          editable={!saving}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack} disabled={saving}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit lead' : 'Add a lead'}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!editing && (
          <Text style={styles.intro}>
            For a number somebody gave you — a referral, a walk-in, a call you took.
            It goes straight onto your list.
          </Text>
        )}

        {field('Name', User, name, setName, { placeholder: 'Who is this?', required: true })}
        {field('Phone', Phone, phone, setPhone, {
          placeholder: '10-digit mobile number',
          keyboardType: 'phone-pad',
          required: true,
        })}
        {field('Email', Mail, email, setEmail, { placeholder: 'Optional', keyboardType: 'email-address' })}
        {field('City', MapPin, city, setCity, { placeholder: 'Optional' })}
        {field('Notes', MessageSquare, comment, setComment, {
          placeholder: 'What do they want? Anything worth remembering.',
          multiline: true,
        })}

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
                onPress={() => setPriority(p)}
                disabled={saving}
              >
                <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldHint}>
            This decides where the lead sits in your call order.
          </Text>
        </View>

        {error && (
          <View style={[styles.errorCard, limitHit && styles.errorCardLimit]}>
            <AlertTriangle size={16} color={limitHit ? '#b45309' : '#b91c1c'} />
            <Text style={[styles.errorText, limitHit && styles.errorTextLimit]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
          onPress={save}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextOff]}>
              {editing ? 'Save changes' : 'Add to my list'}
            </Text>
          )}
        </TouchableOpacity>
        {!canSave && !saving && (
          <Text style={styles.footerHint}>A name and a 10-digit number are needed.</Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 4,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  intro: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 20 },

  fieldBlock: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  required: { color: '#dc2626' },
  fieldHint: { fontSize: 11.5, color: '#94a3b8', marginTop: 8, lineHeight: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputRowTall: { alignItems: 'flex-start', paddingTop: 14 },
  input: { flex: 1, fontSize: 15, color: '#0f172a', padding: 0 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },

  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  priorityChipActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  priorityText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  priorityTextActive: { color: '#2563eb' },

  errorCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 14, padding: 14, marginTop: 4,
  },
  errorCardLimit: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  errorText: { flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 19 },
  errorTextLimit: { color: '#92400e' },

  footer: { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  saveBtn: {
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center',
  },
  saveBtnOff: { backgroundColor: '#f1f5f9' },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  saveTextOff: { color: '#94a3b8' },
  footerHint: { fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: 10 },
});
