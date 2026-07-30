import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Globe } from 'lucide-react-native';

interface LanguageSelectionProps {
  onSelectLanguage: (lang: string) => void;
  onBack: () => void;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionProps> = ({
  onSelectLanguage,
  onBack,
}) => {
  const [selected] = useState('en');

  const languages = [
    { code: 'en', name: 'English', native: 'English (Default System Language)' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Language</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>System Language</Text>
        <Text style={styles.subheading}>
          CallMind is standardized on English as the single system language for optimal performance and AI summary accuracy.
        </Text>

        <View style={styles.list}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.card, styles.selectedCard]}
              onPress={() => {}}
              activeOpacity={1}
            >
              <View style={[styles.iconBg, styles.selectedIconBg]}>
                <Globe size={18} color="#2563eb" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, styles.selectedName]}>
                  {lang.native}
                </Text>
              </View>
              <View style={[styles.radio, styles.radioActive]}>
                <View style={styles.radioDot} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSelectLanguage('en')}>
          <Text style={styles.saveText}>Confirm English</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  selectedCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconBg: {
    backgroundColor: '#dbeafe',
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  selectedName: {
    color: '#2563eb',
  },
  subName: {
    fontSize: 12,
    color: '#64748b',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#2563eb',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  footer: {
    paddingTop: 16,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
