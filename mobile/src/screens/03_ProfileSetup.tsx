import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldCheck, Lock, Globe } from 'lucide-react-native';

interface GoogleAuthScreenProps {
  onGoogleSignIn: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}

export const GoogleAuthScreen: React.FC<GoogleAuthScreenProps> = ({
  onGoogleSignIn,
  onBack,
  loading = false,
  error = null,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <ArrowLeft size={20} color="#0f172a" strokeWidth={2.2} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.heading}>Sign In to CallMind</Text>
        <Text style={styles.subheading}>
          Use your Google account to get started as a Telecaller
        </Text>

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={onGoogleSignIn}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <View style={styles.googleIconCircle}>
              <Globe size={20} color="#4285F4" strokeWidth={2.2} />
            </View>
          )}
          <Text style={styles.googleButtonText}>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Security Info Card */}
        <View style={styles.infoCard}>
          <ShieldCheck size={20} color="#2563eb" strokeWidth={2} />
          <Text style={styles.infoText}>
            Your Google account is used for secure sign-in only. We never access your personal data, contacts, or emails.
          </Text>
        </View>

        {/* Role Notice */}
        <View style={styles.roleNotice}>
          <Text style={styles.roleTitle}>Telecaller App</Text>
          <Text style={styles.roleDesc}>
            This app is designed for telecallers. If you're an admin or business owner, please use the CallMind web dashboard.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.securityNote}>
          <Lock size={13} color="#94a3b8" />
          <Text style={styles.securityText}>
            Secured by Supabase Authentication with enterprise-grade encryption.
          </Text>
        </View>
      </View>
    </View>
  );
};

export const ProfileSetup = GoogleAuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  content: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 32,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    lineHeight: 18,
  },
  roleNotice: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 18,
  },
  footer: {
    gap: 16,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
