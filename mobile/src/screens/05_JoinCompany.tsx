import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Building2, QrCode, ArrowLeft, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useMobileAuth } from '../services/AuthContext';

interface JoinCompanyProps {
  onJoinSuccess: () => void;
  onBack: () => void;
}

interface FoundCompany {
  id: string;
  name: string;
  inviteId?: string;
  industry?: string;
  location?: string;
}

export const JoinCompany: React.FC<JoinCompanyProps> = ({ onJoinSuccess, onBack }) => {
  const { user, profile, refreshProfile } = useMobileAuth();
  const [joinCode, setJoinCode] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [scanning, setScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [foundCompany, setFoundCompany] = useState<FoundCompany | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Start Live Camera QR Scanning
   */
  const handleStartScan = async () => {
    setErrorMessage(null);
    try {
      const { granted } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(granted);
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your phone settings to scan team QR codes.'
        );
        return;
      }
      setScanning(true);
    } catch (e) {
      console.error('[JoinCompany] Camera permission error:', e);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  /**
   * Handle QR Code Scanned
   */
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanning || !data) return;
    setScanning(false);

    // Extract code from full URL (e.g., https://callmind.app/join/849201) or raw text
    let parsedCode = data.trim();
    if (parsedCode.includes('/join/')) {
      parsedCode = parsedCode.split('/join/').pop()?.split('?')[0] || parsedCode;
    } else if (parsedCode.includes('code=')) {
      const match = parsedCode.match(/code=([a-zA-Z0-9]+)/);
      if (match) parsedCode = match[1];
    }

    setJoinCode(parsedCode.toUpperCase());
    verifyCompanyCode(parsedCode.toUpperCase());
  };

  /**
   * Verify 6-digit Code / Token against Supabase `invites` & `companies`
   */
  const verifyCompanyCode = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || joinCode).trim().toUpperCase();
    setErrorMessage(null);

    if (targetCode.length < 4) {
      setErrorMessage('Please enter a valid company join code (at least 4-6 characters).');
      return;
    }

    setVerifying(true);
    try {
      // 1. Search in `invites` table for active invite with this code/token
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('id, company_id, join_code, status, expires_at, max_uses, used_count')
        .or(`join_code.ilike.${targetCode},token.ilike.${targetCode},id.ilike.${targetCode}`)
        .eq('status', 'active')
        .maybeSingle();

      if (inviteError) {
        console.error('[JoinCompany] Invite lookup error:', inviteError);
      }

      let companyId = inviteData?.company_id;

      // 2. If not found in invites, check direct company id matching
      if (!companyId) {
        const { data: directCompany } = await supabase
          .from('companies')
          .select('id, name')
          .ilike('id', targetCode)
          .maybeSingle();

        if (directCompany) {
          companyId = directCompany.id;
        }
      }

      if (!companyId) {
        setErrorMessage('No active company workspace found with this code. Please verify with your team admin.');
        setVerifying(false);
        return;
      }

      // 3. Fetch real company profile from Supabase `companies`
      const { data: company, error: compError } = await supabase
        .from('companies')
        .select('id, name, plan, plan_status')
        .eq('id', companyId)
        .single();

      if (compError || !company) {
        setErrorMessage('Workspace found, but company details could not be loaded.');
        setVerifying(false);
        return;
      }

      setFoundCompany({
        id: company.id,
        name: company.name || 'Company Workspace',
        inviteId: inviteData?.id,
        industry: 'Sales & Telecalling',
        location: 'Verified Workspace',
      });
      setStep('preview');
    } catch (e: any) {
      console.error('[JoinCompany] Verification error:', e);
      setErrorMessage(e.message || 'Failed to verify company code. Check your network.');
    } finally {
      setVerifying(false);
    }
  };

  /**
   * Submit Real Join Request to Supabase `join_requests` table / RPC
   */
  const handleSendJoinRequest = async () => {
    if (!foundCompany || !user) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        company_id: foundCompany.id,
        user_id: user.id,
        name: profile?.name || user.user_metadata?.full_name || 'Telecaller',
        email: user.email || '',
        phone: profile?.phone || '',
        city: profile?.city || '',
        language: 'en',
        join_code: joinCode.trim().toUpperCase(),
      };

      // Try RPC `submit_join_request`
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_join_request', {
        p_company_id: payload.company_id,
        p_user_id: payload.user_id,
        p_name: payload.name,
        p_email: payload.email,
        p_phone: payload.phone,
        p_city: payload.city,
        p_language: payload.language,
        p_join_code: payload.join_code,
      });

      if (rpcErr) {
        console.warn('[JoinCompany] RPC submit_join_request failed, falling back to table insert:', rpcErr);
        // Fallback: direct insert to `join_requests` table
        const { error: insertErr } = await supabase.from('join_requests').insert({
          company_id: payload.company_id,
          user_id: payload.user_id,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          city: payload.city,
          language: payload.language,
          join_code: payload.join_code,
          status: 'pending',
          requested_via: 'join_code',
        });
        if (insertErr) throw insertErr;
      }

      // Refresh profile to reflect pending state
      await refreshProfile();

      Alert.alert(
        'Request Sent! 🎉',
        `Your request to join "${foundCompany.name}" has been sent to the administrator.`,
        [{ text: 'OK', onPress: onJoinSuccess }]
      );
    } catch (e: any) {
      console.error('[JoinCompany] Submit request error:', e);
      setErrorMessage(e.message || 'Could not submit join request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── CAMERA QR SCANNER VIEW ─────────────────────────────────
  if (scanning) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        {/* Scanner Overlay UI */}
        <View style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.closeScanBtn} onPress={() => setScanning(false)}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scannerHint}>Align team QR code inside frame</Text>
        </View>
      </View>
    );
  }

  // ─── STANDARD FORM & PREVIEW VIEW ───────────────────────────
  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={step === 'preview' ? () => setStep('input') : onBack}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'input' ? 'Join Company' : 'Company Details'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'input' ? (
        <View style={styles.content}>
          <View style={styles.headerIconContainer}>
            <Building2 size={32} color="#2563eb" strokeWidth={2.2} />
          </View>

          <Text style={styles.heading}>Connect to Team</Text>
          <Text style={styles.subheading}>
            Ask your manager for the 6-digit company join code or scan their admin QR code.
          </Text>

          {/* Error Message Box */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color="#ef4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Code Input */}
          <View style={styles.inputCard}>
            <Text style={styles.label}>Enter 6-Digit Company Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="e.g. 849201"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={(t) => {
                setJoinCode(t);
                setErrorMessage(null);
              }}
              maxLength={12}
            />
          </View>

          {/* Scan QR Button */}
          <TouchableOpacity style={styles.qrOptionButton} onPress={handleStartScan} activeOpacity={0.8}>
            <QrCode size={20} color="#2563eb" />
            <Text style={styles.qrOptionText}>Scan Admin QR Code Instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.headerIconContainer, { backgroundColor: '#dcfce7' }]}>
            <CheckCircle2 size={32} color="#16a34a" strokeWidth={2.2} />
          </View>

          <Text style={styles.heading}>Company Found</Text>
          <Text style={styles.subheading}>
            Verify workspace details before sending your join request.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color="#ef4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Real Company Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.companyHeader}>
              <Text style={styles.companyName}>{foundCompany?.name}</Text>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={14} color="#15803d" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company ID</Text>
              <Text style={styles.detailValue}>{foundCompany?.id?.substring(0, 14)}...</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Join Code</Text>
              <Text style={styles.detailValue}>{joinCode.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Role</Text>
              <Text style={styles.detailValue}>{profile?.designation || 'Telecaller'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.footer}>
        {step === 'input' ? (
          <TouchableOpacity
            style={[styles.primaryButton, (!joinCode.trim() || verifying) && styles.primaryButtonDisabled]}
            onPress={() => verifyCompanyCode()}
            disabled={!joinCode.trim() || verifying}
            activeOpacity={0.85}
          >
            {verifying ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSendJoinRequest}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Send Join Request</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeScanBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 260,
    height: 260,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'relative',
    borderRadius: 24,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#3b82f6',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  scannerHint: {
    marginTop: 28,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerRow: {
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
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 3,
  },
  qrOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  qrOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  detailsCard: {
    backgroundColor: '#f8fafc',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
