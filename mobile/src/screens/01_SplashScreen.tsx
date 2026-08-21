import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Headphones, ShieldCheck } from 'lucide-react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      {/* Top Subtle Brand Tag */}
      <View style={styles.topHeader}>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>ENTERPRISE CRM</Text>
        </View>
      </View>

      {/* Main Center Brand Visual */}
      <View style={styles.content}>
        {/* Glowing Brand Icon Container */}
        <View style={styles.iconContainer}>
          <View style={styles.iconInnerGlow}>
            <Headphones size={44} color="#ffffff" strokeWidth={2.2} />
          </View>
        </View>

        {/* Brand Name */}
        <Text style={styles.brandTitle}>
          CallMind <Text style={styles.brandTitleAccent}>Telecaller</Text>
        </Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Smart Calling • Instant Lead Follow-ups • High Conversion
        </Text>
      </View>

      {/* Bottom Loading Indicator */}
      <View style={styles.footer}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Securing telecaller workspace...</Text>
        </View>

        <View style={styles.encryptionRow}>
          <ShieldCheck size={13} color="#94a3b8" />
          <Text style={styles.encryptionText}>End-to-End Encrypted</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 56 : 46,
    paddingHorizontal: 24,
  },
  topHeader: {
    alignItems: 'center',
  },
  versionBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  versionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  iconInnerGlow: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  brandTitleAccent: {
    color: '#2563eb',
    fontWeight: '900',
  },
  tagline: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
    maxWidth: 280,
    lineHeight: 19,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  encryptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  encryptionText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
