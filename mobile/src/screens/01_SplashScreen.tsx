import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Headphones } from 'lucide-react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      {/* Background Subtle Lines */}
      <View style={styles.content}>
        {/* Brand Icon Box matching Reference UI Image 1 */}
        <View style={styles.iconContainer}>
          <Headphones size={48} color="#ffffff" strokeWidth={2.2} />
        </View>

        {/* Brand Name */}
        <Text style={styles.title}>
          CallMind <Text style={styles.titleHighlight}>Telecaller</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.tagline}>Smart Calls. Stronger Connections. Better Results.</Text>
      </View>

      {/* Bottom Loading Indicator matching Reference UI Image 1 */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your workspace...</Text>
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
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#2563eb',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: '#2563eb',
    fontWeight: '800',
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
    maxWidth: 260,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
