import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';
import { formatAuthError, ParsedAuthError } from '../services/authErrors';

interface GoogleAuthScreenProps {
  onGoogleSignIn: () => void | Promise<void>;
  onEmailSignIn?: (email: string, pass: string) => void | Promise<void>;
  onEmailSignUp?: (email: string, pass: string, name: string) => void | Promise<void>;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * 100% Pure Vector SVG: Professional Welcoming Telecaller Illustration
 */
const WelcomeBackVector = ({ size = 104 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="welcomeBgGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#eff6ff" />
        <Stop offset="100%" stopColor="#dbeafe" />
      </LinearGradient>
      <LinearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#2563eb" />
        <Stop offset="100%" stopColor="#1d4ed8" />
      </LinearGradient>
    </Defs>

    {/* Background Circle */}
    <Circle cx="50" cy="50" r="48" fill="url(#welcomeBgGrad)" />

    {/* Character Shirt / Body */}
    <Path
      d="M24 88 C24 70 34 62 50 62 C66 62 76 70 76 88 Z"
      fill="url(#shirtGrad)"
    />
    {/* Collar Accent */}
    <Path
      d="M44 62 L50 70 L56 62 Z"
      fill="#ffffff"
      opacity={0.85}
    />

    {/* Neck */}
    <Rect x="45" y="47" width="10" height="16" rx="5" fill="#fcd34d" />

    {/* Head */}
    <Circle cx="50" cy="38" r="16" fill="#fcd34d" />

    {/* Sleek Modern Dark Hair */}
    <Path
      d="M34 38 C34 26 40 20 50 20 C60 20 66 26 66 38 C66 31 63 26 50 26 C38 26 34 32 34 38 Z"
      fill="#0f172a"
    />
    <Path
      d="M34 34 C35 28 40 24 48 24 C56 24 64 27 65 34 C63 28 56 22 48 22 C40 22 35 27 34 34 Z"
      fill="#1e293b"
    />

    {/* Headset Band */}
    <Path
      d="M33 38 C33 24 67 24 67 38"
      stroke="#334155"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Headset Earcups */}
    <Rect x="31" y="34" width="4.5" height="9" rx="2.2" fill="#2563eb" />
    <Rect x="64.5" y="34" width="4.5" height="9" rx="2.2" fill="#2563eb" />

    {/* Headset Mic */}
    <Path
      d="M33 41 Q33 50 43 50"
      stroke="#334155"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx="43" cy="50" r="2.2" fill="#2563eb" />

    {/* Eyes & Smile */}
    <Circle cx="44" cy="38" r="1.6" fill="#0f172a" />
    <Circle cx="56" cy="38" r="1.6" fill="#0f172a" />
    <Path
      d="M46 44 Q50 48 54 44"
      stroke="#b45309"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />

    {/* Waving Hand / Greeting Sparkle Accent */}
    <G transform="translate(68, 16)">
      <Circle cx="10" cy="10" r="8" fill="#ffffff" opacity={0.9} />
      <Path
        d="M10 5 L11.2 8.8 L15 10 L11.2 11.2 L10 15 L8.8 11.2 L5 10 L8.8 8.8 Z"
        fill="#2563eb"
      />
    </G>
  </Svg>
);

/**
 * 100% Pure Vector SVG: Professional New Account Avatar with Plus Badge
 */
const CreateAccountVector = ({ size = 104 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="signupBgGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#eff6ff" />
        <Stop offset="100%" stopColor="#dbeafe" />
      </LinearGradient>
      <LinearGradient id="signupShirtGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#2563eb" />
        <Stop offset="100%" stopColor="#1d4ed8" />
      </LinearGradient>
    </Defs>

    {/* Background Circle */}
    <Circle cx="50" cy="50" r="48" fill="url(#signupBgGrad)" />

    {/* Character Body / Shirt */}
    <Path
      d="M24 88 C24 70 34 62 50 62 C66 62 76 70 76 88 Z"
      fill="url(#signupShirtGrad)"
    />
    <Path
      d="M44 62 L50 69 L56 62 Z"
      fill="#ffffff"
      opacity={0.85}
    />

    {/* Neck */}
    <Rect x="45" y="47" width="10" height="16" rx="5" fill="#fcd34d" />

    {/* Head */}
    <Circle cx="50" cy="38" r="16" fill="#fcd34d" />

    {/* Modern Side-Swept Hair */}
    <Path
      d="M34 38 C34 25 41 19 51 19 C61 19 66 25 66 38 C65 29 58 24 49 24 C40 24 35 30 34 38 Z"
      fill="#0f172a"
    />
    <Path
      d="M34 34 C36 27 42 22 51 22 C59 22 64 26 65 33 C62 26 56 20 49 20 C41 20 36 26 34 34 Z"
      fill="#1e293b"
    />

    {/* Eyes & Warm Smile */}
    <Circle cx="44" cy="38" r="1.6" fill="#0f172a" />
    <Circle cx="56" cy="38" r="1.6" fill="#0f172a" />
    <Path
      d="M46 44 Q50 48 54 44"
      stroke="#b45309"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />

    {/* Floating Plus Badge (Matching Finora Reference UI) */}
    <G transform="translate(64, 18)">
      <Circle cx="12" cy="12" r="11" fill="#2563eb" />
      <Path
        d="M12 7 L12 17 M7 12 L17 12"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </G>
  </Svg>
);

/** Official Multi-Color Google G Logo */
const GoogleOfficialLogo = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

export const GoogleAuthScreen: React.FC<GoogleAuthScreenProps> = ({
  onGoogleSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onBack,
  loading = false,
  error = null,
}) => {
  const [authMode, setAuthMode] = useState<'email_login' | 'email_signup'>('email_login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'password' | null>(null);

  const [localLoading, setLocalLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isBusy = loading || localLoading || isGoogleLoading;
  const rawError = localError || error;
  const parsedError: ParsedAuthError | null = rawError ? formatAuthError(rawError) : null;

  const validateInputs = (): boolean => {
    setLocalError(null);

    if (authMode === 'email_signup' && !fullName.trim()) {
      setLocalError('Please enter your full name');
      return false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address');
      return false;
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleGooglePress = async () => {
    setLocalError(null);
    try {
      setIsGoogleLoading(true);
      await onGoogleSignIn();
    } catch (e: any) {
      setLocalError(formatAuthError(e).message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!validateInputs()) return;

    try {
      setLocalLoading(true);
      if (authMode === 'email_signup') {
        if (onEmailSignUp) {
          await onEmailSignUp(email.trim(), password, fullName.trim());
        }
      } else {
        if (onEmailSignIn) {
          await onEmailSignIn(email.trim(), password);
        }
      }
    } catch (e: any) {
      setLocalError(formatAuthError(e).message);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top Bar with Safe Notch Padding */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ArrowLeft size={20} color="#0f172a" strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          {/* Top Center High-Resolution 3D Avatar (Transparent Background) */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircleBg}>
              {authMode === 'email_login' ? (
                <Image
                  source={require('../../assets/auth_welcome_sales_pro_trans.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require('../../assets/auth_signup_avatar_trans.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>

          {/* Heading and Subheading */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {authMode === 'email_login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {authMode === 'email_login'
                ? 'Log in to your account to continue.'
                : 'Sign up to get started with your dashboard.'}
            </Text>
          </View>

          {/* Form Fields matching Reference UI Layout */}
          <View style={styles.formContainer}>
            {authMode === 'email_signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'fullName' && styles.inputFocused,
                  ]}
                  placeholder="Enter your name"
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChangeText={(t) => {
                    setFullName(t);
                    if (localError) setLocalError(null);
                  }}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isBusy}
                  returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (localError) setLocalError(null);
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === 'password' && styles.inputFocused,
                  ]}
                  placeholder={authMode === 'email_login' ? 'Enter your password' : 'Create a password'}
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (localError) setLocalError(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isBusy}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((p) => !p)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Error Banner */}
          {parsedError && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorMsg}>{parsedError.message}</Text>
                {parsedError.action === 'switch_to_login' && (
                  <TouchableOpacity
                    onPress={() => {
                      setAuthMode('email_login');
                      setLocalError(null);
                    }}
                    style={styles.switchErrorBtn}
                  >
                    <Text style={styles.switchErrorText}>Switch to Sign In</Text>
                    <ArrowRight size={12} color="#2563eb" />
                  </TouchableOpacity>
                )}
                {parsedError.action === 'switch_to_signup' && (
                  <TouchableOpacity
                    onPress={() => {
                      setAuthMode('email_signup');
                      setLocalError(null);
                    }}
                    style={styles.switchErrorBtn}
                  >
                    <Text style={styles.switchErrorText}>Create New Account</Text>
                    <ArrowRight size={12} color="#2563eb" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Primary Action Button (CallMind Brand Blue #2563eb) */}
          <TouchableOpacity
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={handleEmailSubmit}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {localLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === 'email_login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Or Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Official Google Social Sign-In Button */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.googleSocialBtn}
              onPress={handleGooglePress}
              activeOpacity={0.85}
              disabled={isBusy}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <GoogleOfficialLogo size={22} />
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Switch Link */}
          <View style={styles.footerSwitch}>
            <Text style={styles.footerPrompt}>
              {authMode === 'email_login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAuthMode(authMode === 'email_login' ? 'email_signup' : 'email_login');
                setLocalError(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.footerAction}>
                {authMode === 'email_login' ? ' Sign Up' : ' Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const ProfileSetup = GoogleAuthScreen;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingHorizontal: 26,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  avatarCircleBg: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
    textAlign: 'center',
  },
  formContainer: {
    gap: 16,
    marginBottom: 22,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  errorMsg: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
    lineHeight: 18,
  },
  switchErrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  switchErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 26,
  },
  googleSocialBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  footerSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerPrompt: {
    fontSize: 14,
    color: '#64748b',
  },
  footerAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
});
