import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface LeadImportScreenProps {
  onBack: () => void;
}

export const LeadImportScreen: React.FC<LeadImportScreenProps> = ({ onBack }) => {
  const recentImports = [
    { id: '1', fileName: 'Facebook_Leads_May21.csv', count: '150 Leads', date: '21 May 2024', status: 'Success' },
    { id: '2', fileName: 'IndiaMART_Hot_Batch2.xlsx', count: '300 Leads', date: '19 May 2024', status: 'Success' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header matching Reference UI Image 6 Screen 22 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Leads</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <UploadCloud size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Upload Box Container */}
        <View style={styles.uploadArea}>
          <View style={styles.iconCircleBg}>
            <FileSpreadsheet size={32} color="#2563eb" />
          </View>
          <Text style={styles.uploadTitle}>Upload CSV / Excel File</Text>
          <Text style={styles.uploadSub}>Tap to browse files from your device (Max 10MB)</Text>

          <TouchableOpacity style={styles.browseBtn}>
            <Text style={styles.browseBtnText}>Select File</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Format Guidelines */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import Guidelines</Text>
          <View style={styles.guideItem}>
            <CheckCircle2 size={16} color="#16a34a" />
            <Text style={styles.guideText}>Required Columns: Name, Phone Number, City, Source</Text>
          </View>
          <View style={styles.guideItem}>
            <CheckCircle2 size={16} color="#16a34a" />
            <Text style={styles.guideText}>Supported Formats: .csv, .xlsx, .xls</Text>
          </View>
          <View style={styles.guideItem}>
            <AlertCircle size={16} color="#f59e0b" />
            <Text style={styles.guideText}>Max Batch Limit: Up to 5,000 leads per file</Text>
          </View>
        </View>

        {/* Recent Import Batches */}
        <Text style={styles.sectionTitle}>Recent Import History</Text>
        <View style={styles.importList}>
          {recentImports.map((item) => (
            <View key={item.id} style={styles.importCard}>
              <FileSpreadsheet size={20} color="#64748b" />
              <View style={styles.importMain}>
                <Text style={styles.fileNameText}>{item.fileName}</Text>
                <Text style={styles.fileMetaText}>{item.count} • {item.date}</Text>
              </View>
              <View style={styles.successBadge}>
                <Text style={styles.successText}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action CTA */}
        <TouchableOpacity style={styles.importSubmitBtn}>
          <Text style={styles.importSubmitText}>Upload & Import Leads</Text>
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
  uploadArea: {
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleBg: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  uploadSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  browseBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 4,
  },
  importList: {
    gap: 10,
    marginBottom: 20,
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  importMain: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  fileMetaText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  successBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  successText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  importSubmitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  importSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
