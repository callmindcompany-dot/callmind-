import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { User, Phone, MapPin, Briefcase, ArrowRight, ShieldCheck } from 'lucide-react-native';

interface UserInfoCollectionProps {
  onComplete: (data: {
    name: string;
    designation: string;
    phone: string;
    city: string;
    goals: string[];
  }) => void;
  onBack?: () => void;
  loading?: boolean;
}

const ROLES = [
  { id: 'Telecaller', label: 'Telecaller', desc: 'Outbound & inbound call executive' },
  { id: 'Sales Executive', label: 'Sales Executive', desc: 'Direct client acquisition & closing' },
  { id: 'Team Lead', label: 'Team Lead', desc: 'Manages sales floor & target tracking' },
];

import { useMobileAuth } from '../services/AuthContext';

export const UserInfoCollection: React.FC<UserInfoCollectionProps> = ({
  onComplete,
  loading = false,
}) => {
  const { user, profile } = useMobileAuth();
  const [name, setName] = useState(profile?.name || user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState(profile?.city || '');
  const [designation, setDesignation] = useState(profile?.designation || 'Telecaller');
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = loading || localLoading;

  const handleSubmit = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your full name');
      return;
    }

    try {
      setLocalLoading(true);
      await onComplete({
        name: trimmedName,
        designation,
        phone: phone.trim(),
        city: city.trim(),
        goals: ['Lead Management', 'Call Tracking'],
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <User size={28} color="#2563eb" strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Enter your details to set up your personal telecaller workspace.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={15}
              />
            </View>
          </View>

          {/* Role / Designation Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Role / Designation</Text>
            <View style={styles.roleList}>
              {ROLES.map(role => {
                const isSelected = designation === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleCard, isSelected && styles.roleCardActive]}
                    onPress={() => setDesignation(role.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleCardHeader}>
                      <Briefcase size={16} color={isSelected ? '#2563eb' : '#64748b'} />
                      <Text style={[styles.roleTitle, isSelected && styles.roleTitleActive]}>
                        {role.label}
                      </Text>
                      {isSelected && <View style={styles.selectedDot} />}
                    </View>
                    <Text style={styles.roleDesc}>{role.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City / Work Location</Text>
            <View style={styles.inputWrapper}>
              <MapPin size={18} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your city"
                placeholderTextColor="#94a3b8"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        {/* Error Banner if any */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Security & Privacy Note */}
        <View style={styles.trustBadge}>
          <ShieldCheck size={16} color="#16a34a" />
          <Text style={styles.trustText}>
            Your details are encrypted and private to your team workspace.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !name.trim() && styles.submitButtonDisabled,
            isBusy && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!name.trim() || isBusy}
          activeOpacity={0.85}
          accessibilityLabel="Complete Profile and Continue"
          accessibilityRole="button"
        >
          {isBusy ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Complete Profile &amp; Continue</Text>
              <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 110,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  required: {
    color: '#ef4444',
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  roleList: {
    gap: 8,
  },
  roleCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
  },
  roleCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleTitleActive: {
    color: '#2563eb',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 'auto',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    paddingLeft: 24,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 20,
  },
  trustText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
    lineHeight: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
