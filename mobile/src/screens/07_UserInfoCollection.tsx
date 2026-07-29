import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, User, Phone, MapPin, Target, CheckCircle2, ChevronRight, Briefcase } from 'lucide-react-native';

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

export const UserInfoCollection: React.FC<UserInfoCollectionProps> = ({
  onComplete,
  onBack,
  loading = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState<'Telecaller' | 'Team Lead' | 'Floor Manager'>('Telecaller');

  // Step 2 State
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  // Step 3 State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['Lead Management']);

  const designations = [
    { id: 'Telecaller', label: 'Telecaller', desc: 'Outbound & inbound call executive' },
    { id: 'Team Lead', label: 'Team Lead', desc: 'Manages telecalling team & targets' },
    { id: 'Floor Manager', label: 'Floor Manager', desc: 'Oversees daily sales operations' },
  ];

  const availableGoals = [
    { id: 'Lead Management', label: 'Lead Management', desc: 'Organize and track prospective clients' },
    { id: 'Call Tracking', label: 'Call Tracking', desc: 'Log calls, recordings and analytics' },
    { id: 'Team Performance', label: 'Team Performance', desc: 'Monitor KPIs and leaderboards' },
    { id: 'All', label: 'All of the Above', desc: 'Full suite of CallMind sales tools' },
  ];

  const toggleGoal = (goalId: string) => {
    if (goalId === 'All') {
      setSelectedGoals(['Lead Management', 'Call Tracking', 'Team Performance', 'All']);
      return;
    }
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goalId && g !== 'All'));
    } else {
      setSelectedGoals([...selectedGoals.filter(g => g !== 'All'), goalId]);
    }
  };

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      onComplete({
        name: name.trim(),
        designation,
        phone: phone.trim(),
        city: city.trim(),
        goals: selectedGoals,
      });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handlePrevStep} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <Text style={styles.stepBadge}>Step {step} of 3</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Basic Details</Text>
            <Text style={styles.subtitle}>Enter your full name and select your role in the team</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Designation Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Designation</Text>
              {designations.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.roleCard, designation === item.id && styles.roleCardActive]}
                  onPress={() => setDesignation(item.id as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.roleHeader}>
                    <Briefcase size={18} color={designation === item.id ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.roleLabel, designation === item.id && styles.roleLabelActive]}>
                      {item.label}
                    </Text>
                  </View>
                  <Text style={styles.roleDesc}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Contact & Location</Text>
            <Text style={styles.subtitle}>Add your contact phone and work location city</Text>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* City Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City / Location</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={18} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mumbai, Bengaluru, Delhi"
                  placeholderTextColor="#94a3b8"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Primary Goals</Text>
            <Text style={styles.subtitle}>What will you primarily use CallMind for?</Text>

            <View style={styles.goalsGrid}>
              {availableGoals.map(goal => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, isSelected && styles.goalCardActive]}
                    onPress={() => toggleGoal(goal.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.goalHeader}>
                      <Target size={18} color={isSelected ? '#2563eb' : '#64748b'} />
                      <Text style={[styles.goalTitle, isSelected && styles.goalTitleActive]}>
                        {goal.label}
                      </Text>
                      {isSelected && <CheckCircle2 size={16} color="#2563eb" style={{ marginLeft: 'auto' }} />}
                    </View>
                    <Text style={styles.goalDesc}>{goal.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (step === 1 && !name.trim()) && styles.continueBtnDisabled,
            loading && styles.continueBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={(step === 1 && !name.trim()) || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>
                {step === 3 ? 'Save & Continue' : 'Next Step'}
              </Text>
              <ChevronRight size={18} color="#ffffff" />
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
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#f1f5f9',
    width: '100%',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  roleCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
  },
  roleCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleLabelActive: {
    color: '#2563eb',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    paddingLeft: 26,
  },
  goalsGrid: {
    gap: 10,
  },
  goalCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
  },
  goalCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  goalTitleActive: {
    color: '#2563eb',
  },
  goalDesc: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    paddingLeft: 26,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
