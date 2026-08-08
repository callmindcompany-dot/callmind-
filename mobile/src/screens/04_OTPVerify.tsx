import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';

interface OTPVerifyProps {
  phoneNumber: string;
  onVerify: (otp: string) => void;
  onBack: () => void;
}

export const OTPVerify: React.FC<OTPVerifyProps> = ({ phoneNumber, onVerify, onBack }) => {
  const [otp] = useState(['4', '2', '7', '9', '1', '6']);

  const handleVerify = () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit OTP.');
      return;
    }
    onVerify(fullOtp);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <ArrowLeft size={20} color="#0f172a" strokeWidth={2.2} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.heading}>Enter OTP</Text>
        <Text style={styles.subheading}>
          We have sent a 6-digit code to{'\n'}
          <Text style={styles.phoneHighlight}>{phoneNumber ? `+91 ${phoneNumber}` : 'your number'}</Text>
        </Text>

        {/* 6 OTP Input Boxes matching Reference UI Image 1 Screen 4 */}
        <View style={styles.otpGrid}>
          {otp.map((digit, i) => (
            <View key={i} style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}>
              <Text style={styles.otpDigit}>{digit}</Text>
            </View>
          ))}
        </View>

        {/* Resend Timer */}
        <View style={styles.resendContainer}>
          <Text style={styles.timerText}>Resend OTP in <Text style={styles.timerBold}>00:28</Text></Text>
          <TouchableOpacity style={styles.resendCard}>
            <Text style={styles.resendPrompt}>Didn't receive OTP? </Text>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Verify & Continue</Text>
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <Lock size={13} color="#94a3b8" />
          <Text style={styles.securityText}>
            Your OTP is valid for 10 minutes.
          </Text>
        </View>
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
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#2563eb',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  otpBoxFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  resendContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  timerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  timerBold: {
    fontWeight: '700',
    color: '#2563eb',
  },
  resendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  resendPrompt: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  footer: {
    gap: 16,
  },
  verifyButton: {
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
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
