import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, ClipboardList, Calendar } from 'lucide-react-native';

/**
 * Shown after the post-call form, to say where the lead went.
 *
 * This file was imported by App.tsx and never rendered, so nothing answered the
 * one question an agent has when they come back from a call: is that person
 * still on my list?
 *
 * It used to take a `simUsed` prop and print it beside the duration. The app
 * dials with `tel:` through the system dialler and never learns which SIM the
 * phone chose, so that value could only ever have been made up -- App.tsx was
 * passing the literal string "SIM 1". It is gone; `summary` says what actually
 * happened to the lead instead, which is worth the space.
 */

interface CallCompletedCardProps {
  leadName: string;
  leadPhone: string;
  duration: string;
  /** Where the lead went, from describeOutcome in callOutcome.ts. */
  summary: string;
  /** Closed leads leave the queue, so the card offers no follow-up for them. */
  closed: boolean;
  onLogFeedback: () => void;
  onScheduleCallback: () => void;
  onDone: () => void;
}

export const CallCompletedCard: React.FC<CallCompletedCardProps> = ({
  leadName,
  leadPhone,
  duration,
  summary,
  closed,
  onLogFeedback,
  onScheduleCallback,
  onDone,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.successBadge}>
          <Check size={32} color="#ffffff" strokeWidth={3} />
        </View>

        <Text style={styles.title}>Call Completed</Text>
        <Text style={styles.subtitle}>with {leadName}</Text>
        <Text style={styles.phone}>{leadPhone}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DIALLER TIME</Text>
            <Text style={styles.statValue}>{duration}</Text>
          </View>
        </View>

        <Text style={styles.summaryText}>{summary}</Text>

        <View style={styles.btnStack}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onDone}>
            <Text style={styles.primaryBtnText}>Next lead</Text>
          </TouchableOpacity>

          {/*
            No point offering a follow-up on a lead that has just been closed --
            it has left the queue and nothing would bring it back.
          */}
          {!closed && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onScheduleCallback}>
              <Calendar size={16} color="#2563eb" />
              <Text style={styles.secondaryBtnText}>Set a follow-up</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.tertiaryBtn} onPress={onLogFeedback}>
            <ClipboardList size={14} color="#64748b" />
            <Text style={styles.tertiaryBtnText}>Change what I recorded</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, zIndex: 9999,
  },
  card: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  successBadge: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#16a34a',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 2 },
  phone: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  statsRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#f8fafc',
    borderRadius: 16, padding: 16, marginVertical: 20, alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  summaryText: {
    fontSize: 13.5, color: '#334155', textAlign: 'center',
    lineHeight: 20, marginBottom: 20, paddingHorizontal: 4,
  },
  btnStack: { width: '100%', gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 14 },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '800' },
  tertiaryBtn: { paddingVertical: 12, alignItems: 'center' },
  tertiaryBtnText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
});
