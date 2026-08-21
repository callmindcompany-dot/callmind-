import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { Users, PhoneCall, TrendingUp, Phone, BarChart2 } from 'lucide-react-native';

interface OnboardingProps {
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingSlides: React.FC<OnboardingProps> = ({ onNext, onSkip }) => {
  const features = [
    {
      IconComponent: Users,
      bgColor: '#4F46E5',
      iconColor: '#ffffff',
      title: 'Manage Leads',
      description: 'Access and manage leads anytime, anywhere.',
    },
    {
      IconComponent: PhoneCall,
      bgColor: '#16A34A',
      iconColor: '#ffffff',
      title: 'Call & Log Instantly',
      description: 'Make calls and log feedback in just a few taps.',
    },
    {
      IconComponent: TrendingUp,
      bgColor: '#F59E0B',
      iconColor: '#ffffff',
      title: 'Track Performance',
      description: 'Monitor your progress and achieve your daily targets.',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header with Skip Button */}
      <View style={styles.header}>
        <View />
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} accessibilityLabel="Skip onboarding" accessibilityRole="button">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Heading */}
        <Text style={styles.heading}>
          Work smarter,{'\n'}
          <Text style={styles.headingHighlight}>achieve more</Text>
        </Text>

        <Text style={styles.subheading}>
          Everything you need to manage leads, calls and performance right from your pocket.
        </Text>

        {/* 🎨 High-End 3D Character & Live Analytics Graphic */}
        <View style={styles.illustrationHeroCard}>
          <Image
            source={require('../../assets/onboarding_telecaller_3d.jpg')}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        {/* Feature Cards List matching Reference UI Image 1 Screen 2 */}
        <View style={styles.featureList}>
          {features.map((feat, i) => {
            const Icon = feat.IconComponent;
            return (
              <View key={i} style={styles.featureCard}>
                <View style={[styles.featureIconCircle, { backgroundColor: feat.bgColor }]}>
                  <Icon size={20} color={feat.iconColor} strokeWidth={2.2} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDescription}>{feat.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={onNext}
          activeOpacity={0.85}
          accessibilityLabel="Get Started with CallMind"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Pagination Dots matching Reference UI Image 1 Screen 2 */}
        <View style={styles.paginationDots}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 34,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headingHighlight: {
    color: '#3b82f6',
    fontWeight: '800',
  },
  subheading: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 16,
  },
  illustrationHeroCard: {
    height: 220,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  featureList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
  footer: {
    gap: 16,
    marginTop: 10,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  activeDot: {
    width: 8,
    backgroundColor: '#3b82f6',
  },
  getStartedButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
