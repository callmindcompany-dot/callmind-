import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { ArrowLeft, Moon, Type, Bell, PhoneCall, ChevronRight } from 'lucide-react-native';

interface ThemeToggleScreenProps {
  onBack: () => void;
}

export const ThemeToggleScreen: React.FC<ThemeToggleScreenProps> = ({ onBack }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [leadAlerts, setLeadAlerts] = useState(true);
  const [callbackReminders, setCallbackReminders] = useState(true);
  const [targetAlerts, setTargetAlerts] = useState(true);
  const [autoDial, setAutoDial] = useState(false);
  const [recWarning, setRecWarning] = useState(true);

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 4 Screen 16 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance & Theme */}
        <Text style={styles.sectionTitle}>Appearance & Theme</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Moon size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
              thumbColor={darkMode ? '#2563eb' : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Type size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Font Size</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValText}>Medium</Text>
              <ChevronRight size={16} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Lead Assignment Alerts</Text>
            </View>
            <Switch
              value={leadAlerts}
              onValueChange={setLeadAlerts}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={leadAlerts ? '#16a34a' : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Callback Reminders</Text>
            </View>
            <Switch
              value={callbackReminders}
              onValueChange={setCallbackReminders}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={callbackReminders ? '#16a34a' : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Target Achievement Alerts</Text>
            </View>
            <Switch
              value={targetAlerts}
              onValueChange={setTargetAlerts}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={targetAlerts ? '#16a34a' : '#ffffff'}
            />
          </View>
        </View>

        {/* Call & SIM Settings */}
        <Text style={styles.sectionTitle}>Call & SIM Settings</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <PhoneCall size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Default SIM</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValText}>SIM 1 (Jio)</Text>
              <ChevronRight size={16} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <PhoneCall size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Auto-dial Next Lead</Text>
            </View>
            <Switch
              value={autoDial}
              onValueChange={setAutoDial}
              trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
              thumbColor={autoDial ? '#2563eb' : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <PhoneCall size={18} color="#64748b" />
              <Text style={styles.rowLabel}>Call Recording Warning</Text>
            </View>
            <Switch
              value={recWarning}
              onValueChange={setRecWarning}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={recWarning ? '#16a34a' : '#ffffff'}
            />
          </View>
        </View>

        {/* Save Preferences Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={onBack}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
