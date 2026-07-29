import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ArrowLeft, Camera, Smartphone } from 'lucide-react-native';
import { useMobileAuth } from '../services/AuthContext';

interface ProfileEditScreenProps {
  onBack: () => void;
  onSave: (data: { name: string; email: string; phone: string; language: string }) => void;
}

export const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ onBack, onSave }) => {
  const { user, profile, updateProfile } = useMobileAuth();
  const [name, setName] = useState(profile?.name || user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [language, setLanguage] = useState('English');
  const [defaultSim, setDefaultSim] = useState<'SIM 1' | 'SIM 2'>('SIM 1');

  const handleSave = async () => {
    await updateProfile({ name, phone });
    onSave({ name, email, phone, language });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.saveBtnTop} onPress={handleSave}>
          <Text style={styles.saveBtnTopText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {name.split(' ').map((n: string) => n[0]).join('')}
            </Text>
            <TouchableOpacity style={styles.cameraBadge}>
              <Camera size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarHint}>Tap camera to change photo</Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Enter email address"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number (Registered)</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={phone}
            editable={false}
          />
          <Text style={styles.inputSubHint}>Phone number is locked for security</Text>
        </View>

        {/* Preferred Language */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Preferred Language</Text>
          <View style={styles.pickerRow}>
            {['English', 'Hindi', 'Marathi'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.pickerChip, language === lang && styles.pickerChipActive]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[styles.pickerChipText, language === lang && styles.pickerChipTextActive]}>
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Default SIM Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Default Dialing SIM</Text>
          <View style={styles.simRow}>
            {(['SIM 1', 'SIM 2'] as const).map((sim) => (
              <TouchableOpacity
                key={sim}
                style={[styles.simCard, defaultSim === sim && styles.simCardActive]}
                onPress={() => setDefaultSim(sim)}
              >
                <Smartphone size={18} color={defaultSim === sim ? '#2563eb' : '#64748b'} />
                <Text style={[styles.simTitle, defaultSim === sim && styles.simTitleActive]}>{sim}</Text>
                <Text style={styles.simSub}>
                  {sim === 'SIM 1' ? 'Jio 5G (+91 9876...)' : 'Airtel 4G (+91 9123...)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => onSave({ name, email, phone, language })}
        >
          <Text style={styles.saveBtnText}>Save Profile Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  saveBtnTop: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: '#2563eb' },
  saveBtnTopText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  avatarText: { color: '#ffffff', fontSize: 32, fontWeight: '900' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff',
  },
  avatarHint: { fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: '500' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '600', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#64748b' },
  inputSubHint: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  pickerRow: { flexDirection: 'row', gap: 10 },
  pickerChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc',
    borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center',
  },
  pickerChipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  pickerChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  pickerChipTextActive: { color: '#2563eb' },
  simRow: { flexDirection: 'row', gap: 12 },
  simCard: {
    flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#f8fafc',
    borderWidth: 1.5, borderColor: '#e2e8f0', gap: 4,
  },
  simCardActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  simTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  simTitleActive: { color: '#2563eb' },
  simSub: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', marginTop: 10,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
