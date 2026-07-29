import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Mic, Radio } from 'lucide-react-native';

interface VoiceNotesModalProps {
  leadName: string;
  onSaveNote: (transcription: string) => void;
  onDismiss: () => void;
}

export const VoiceNotesModal: React.FC<VoiceNotesModalProps> = ({
  leadName,
  onSaveNote,
  onDismiss,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(
    'Client mentioned that they are interested in Home Loan of ₹40 Lakhs. Pre-approved loan from HDFC available. Callback scheduled for tomorrow 5 PM.'
  );

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />

        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Mic size={22} color="#2563eb" />
            <Text style={styles.title}>Voice Note Transcriber</Text>
          </View>
          <Text style={styles.sub}>{leadName}</Text>
        </View>

        {/* Mic Pulse Button */}
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            onPress={toggleRecording}
          >
            <Mic size={32} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.micLabelRow}>
            {isRecording && <Radio size={14} color="#dc2626" />}
            <Text style={[styles.micLabel, isRecording && { color: '#dc2626' }]}>
              {isRecording ? 'Recording... Speak now' : 'Tap Mic to Start Voice Note'}
            </Text>
          </View>
        </View>

        {/* Real-time Transcription Box */}
        <Text style={styles.sectionLabel}>AI Transcription</Text>
        <TextInput
          style={styles.transcriptInput}
          multiline
          numberOfLines={4}
          value={transcript}
          onChangeText={setTranscript}
        />

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={() => onSaveNote(transcript)}>
            <Text style={styles.saveText}>Save Note to Lead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  sub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  micContainer: {
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  micBtnActive: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
  },
  micLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  transcriptInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
