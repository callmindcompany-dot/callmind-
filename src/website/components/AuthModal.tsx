import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, ArrowRight, AlertCircle, Mail, KeyRound, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { FOUNDER_OWNERS, INTERNAL_TEAM, USER_PERSPECTIVE_TESTERS } from '../../constants';
import { useNavigate } from 'react-router-dom';

export const AuthModal = ({ 
  isOpen, 
  onClose, 
  initialMode = 'signin' 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}) => {
  const { signUp, signIn, signInWithGoogle, checkUserExistsByEmail, updateProfile, sendPasswordResetEmail, sendVerificationEmail, onboardingStatus, hasFounderHubAccess } = useAuth();
  const [mode, setMode] = useState<'email_entry' | 'password_entry' | 'set_password' | 'forgot_password'> (
    'email_entry'
  );
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  // Password Validation Logic
  const getPasswordStats = (pass: string) => ({
    length: pass.length >= 8,
    hasUpper: /[A-Z]/.test(pass),
    hasLower: /[a-z]/.test(pass),
    hasNumber: /[0-9]/.test(pass),
    hasSpecial: /[^A-Za-z0-9]/.test(pass),
  });

  const stats = getPasswordStats(password);
  const strengthScore = Object.values(stats).filter(Boolean).length;
  const isMatch = password && confirmPassword === password;
  const isPasswordValid = Object.values(stats).every(Boolean);

  const getStrengthLabel = (score: number) => {
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500' };
    if (score === 3) return { label: 'Fair', color: 'bg-orange-500' };
    if (score === 4) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getStrengthLabel(strengthScore);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      if (onboardingStatus === 'completed' && initialMode !== 'signup') {
        onClose();
        navigate(hasFounderHubAccess ? '/founder-hub' : '/dashboard');
        return;
      }
      setMode('email_entry');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setResetSent(false);
    }
  }, [isOpen, onboardingStatus, initialMode, onClose, navigate, hasFounderHubAccess]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Since checkUserExistsByEmail throws permission-denied for unauthenticated users,
      // we navigate directly to the correct input type based on the user's intent.
      if (initialMode === 'signup') {
        setMode('set_password');
      } else {
        setMode('password_entry');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(`Connection failed: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      await signIn(normalizedEmail, password);
      onClose();
      
      // Smart Routing synchronization with Login component
      if (onboardingStatus !== 'completed') {
        navigate('/onboarding', { replace: true });
      } else if (hasFounderHubAccess) {
        navigate('/founder-hub', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const isInternal = FOUNDER_OWNERS.includes(email.toLowerCase().trim()) || 
                      INTERNAL_TEAM.includes(email.toLowerCase().trim()) || 
                      USER_PERSPECTIVE_TESTERS.includes(email.toLowerCase().trim());

      if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found') || err.message?.includes('invalid-credential') || err.code === 'auth/invalid-credential') {
        if (isInternal) {
          setMode('set_password');
          setError(null);
        } else {
          setError("No account found or invalid credentials. Please try again or sign up.");
        }
      } else if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password')) {
        setError("Invalid credentials. Please verify your password.");
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const normalizedEmail = email.toLowerCase().trim();
    const isFounderOwner = FOUNDER_OWNERS.includes(normalizedEmail);
    const isInternalTeam = INTERNAL_TEAM.includes(normalizedEmail);
    const destination = isFounderOwner ? '/founder-hub' : (isInternalTeam ? '/dashboard' : '/onboarding');
    
    try {
      if (!isPasswordValid) {
        setError('Please meet all password requirements.');
        setIsLoading(false);
        return;
      }
      
      const isTester = USER_PERSPECTIVE_TESTERS.includes(normalizedEmail);
      
      const role = isFounderOwner ? 'founder' : 'user';
      // All testing/normal users who are signing up go to pending status to do onboarding
      const status = (isFounderOwner || isInternalTeam) ? 'completed' : 'pending';

      await signUp(normalizedEmail, password, { 
        role: role,
        onboardingStatus: status,
        isInternal: isFounderOwner || isInternalTeam || isTester,
        isTester: isTester
      });

      try {
        if (status !== 'completed') {
          await sendVerificationEmail();
        }
      } catch (err) {
        console.warn("[AuthModal] Verification email failed:", err);
      }
      
      onClose();
      navigate(destination);
    } catch (err: any) {
      console.error("[AuthModal] Set password error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is not enabled in Firebase Console. Please enable it to continue.");
      } else if (err.code === 'auth/email-already-in-use') {
        // Form was filled, but account exists!
        // Immediately try to sign them in with the password they provided!
        try {
          await signIn(normalizedEmail, password);
          onClose();
          navigate(destination);
        } catch (signInErr: any) {
          setError("This account already exists. Please enter your existing password to log in.");
          setMode('password_entry');
        }
      } else if (err.code === 'auth/weak-password') {
        setError("The password is too weak. Please choose a stronger one.");
      } else if (err.message?.includes('permission-denied')) {
        setError("Management profile sync failed. Please contact your system administrator.");
      } else {
        setError(`Failed to set password: ${err.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      await sendPasswordResetEmail(normalizedEmail);
      setResetSent(true);
    } catch (err: any) {
      if (err.message?.includes('user-not-found')) {
        setError('No account found for this email address.');
      } else if (err.message?.includes('operation-not-allowed')) {
        setError('Reset service restricted for this management account. Contact IT.');
      } else {
        setError('Could not process reset request. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailEntry = () => (
    <motion.form 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={handleEmailSubmit} 
      className="space-y-5"
    >
      <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
        <Mail size={26} strokeWidth={2.5} />
      </div>
      <h2 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">
        {initialMode === 'signup' ? 'Start Free Trial' : 'Welcome Back'}
      </h2>
      <p className="text-gray-500 font-medium mb-8 text-[15px]">
        {initialMode === 'signup' 
          ? 'Enter your work email to get started.' 
          : 'Enter your email to secure access.'}
      </p>

      <div className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
            <Mail className="h-5 w-5" />
          </div>
          <input 
            type="email" 
            placeholder="name@company.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 hover:border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-gray-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-gray-400"
            required
          />
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100/50 text-[14px] font-medium mt-4"
        >
          <AlertCircle size={18} className="shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <button 
        type="submit"
        disabled={isLoading || !email}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 disabled:opacity-50 disabled:hover:bg-gray-900 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[15px] mt-4 group"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </button>

      <div className="relative py-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100"></div>
        </div>
        <div className="relative flex justify-center text-[11px] font-bold tracking-widest text-gray-400 uppercase">
          <span className="px-4 bg-white">Or</span>
        </div>
      </div>

      <button 
        type="button"
        disabled={isLoading}
        onClick={async () => {
          setIsLoading(true);
          setError(null);
          try {
            await signInWithGoogle();
            onClose();
            
            // Smart Routing synchronization with Login component
            if (onboardingStatus !== 'completed') {
              navigate('/onboarding', { replace: true });
            } else if (hasFounderHubAccess) {
              navigate('/founder-hub', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } catch (e: any) {
            console.error("[Google Auth] Error:", e);
            if (e.code === 'auth/popup-blocked') {
              setError("Sign-in popup was blocked by your browser. Please enable popups.");
            } else if (e.code === 'auth/popup-closed-by-user') {
              setError("Sign-in window was closed before completion.");
            } else if (e.code === 'auth/cancelled-popup-request') {
              setError("Authentication request was interrupted.");
            } else if (e.code === 'auth/unauthorized-domain') {
              const currentDomain = window.location.hostname;
              setError(`This domain (${currentDomain}) is not authorized for Google Sign-in. Please add it to your Firebase Console Authorized Domains.`);
            } else if (e.code === 'auth/operation-not-allowed') {
              setError("Google Sign-in is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.");
            } else {
              setError(`Google Sign-in failed: ${e.message || "Please check your connection and try again."}`);
            }
          } finally {
            setIsLoading(false);
          }
        }}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-900 font-semibold rounded-2xl transition-all text-[15px]"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>
      
      <div className="pt-4 text-center">
        <p className="text-[13px] text-gray-400">
          By continuing, you agree to our Terms and Privacy.
        </p>
      </div>
    </motion.form>
  );

  const renderPasswordEntry = () => (
    <motion.form 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={handlePasswordSubmit} 
      className="space-y-5"
    >
      <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
        <Lock size={26} strokeWidth={2.5} />
      </div>
      <h2 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">Welcome Back</h2>
      <p className="text-gray-500 font-medium mb-8 text-[15px]">
        Logging in as <span className="font-semibold text-gray-900">{email}</span>
      </p>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
          <Lock className="h-5 w-5" />
        </div>
        <input 
          type={showPassword ? "text" : "password"} 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-100 hover:border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-gray-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-gray-400"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100/50 text-[14px] font-medium"
        >
          <AlertCircle size={18} className="shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <div className="flex justify-between items-center px-1">
        <div />
        <button 
          type="button"
          onClick={() => {
            setMode('forgot_password');
            setError(null);
            setPassword('');
          }}
          className="text-[13px] text-brand-600 hover:text-brand-700 font-semibold transition-colors"
        >
          Forgot password?
        </button>
      </div>

      <button 
        type="submit"
        disabled={isLoading || !password}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 disabled:opacity-50 disabled:hover:bg-gray-900 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[15px] mt-2 group"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Sign In
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </button>
      <button 
        type="button"
        onClick={() => setMode('email_entry')}
        className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium text-[14px] transition-colors"
      >
        Back to email
      </button>
    </motion.form>
  );

  const renderSetPassword = () => (
    <motion.form 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={handleSetPassword} 
      className="space-y-5"
    >
      <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
        <KeyRound size={26} strokeWidth={2.5} />
      </div>
      <h2 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">Create Password</h2>
      <p className="text-gray-500 font-medium mb-6 text-[15px] leading-relaxed">
        Choose a secure password for <span className="font-semibold text-gray-900">{email}</span>.
      </p>

      <div className="space-y-3">
        <div className="group">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
              <Lock className="h-5 w-5" />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Create a strong password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-100 hover:border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-gray-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Strength Indicator */}
          {password && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 px-1"
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Security Strength</span>
                <span className={`text-[11px] font-bold transition-colors ${strengthScore <= 2 ? 'text-red-500' : strengthScore === 3 ? 'text-orange-500' : strengthScore === 4 ? 'text-blue-500' : 'text-green-500'}`}>
                  {strength.label}
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(strengthScore / 5) * 100}%` }}
                  className={`h-full transition-colors duration-500 ${strength.color}`}
                />
              </div>
            </motion.div>
          )}
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
            <ShieldCheck className={`h-5 w-5 ${password && confirmPassword && !isMatch ? 'text-red-400' : ''}`} />
          </div>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="Confirm your password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full pl-12 pr-4 py-4 bg-white border-2 focus:ring-4 outline-none transition-all font-medium text-[15px] placeholder-gray-400 rounded-2xl ${
              password && confirmPassword 
                ? isMatch 
                  ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/10' 
                  : 'border-red-100 focus:border-red-200 focus:ring-red-500/5 hover:border-red-200'
                : 'border-gray-100 hover:border-gray-200 focus:border-brand-500 focus:ring-brand-500/10'
            }`}
            required
          />
          {password && confirmPassword && !isMatch && (
            <div className="absolute inset-y-0 right-0 pr-5 flex items-center text-red-500">
              <AlertCircle size={18} />
            </div>
          )}
        </div>
      </div>
      
      {/* Requirements Grid */}
      <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-0.5">Requirements</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { key: 'length', label: '8+ Characters' },
            { key: 'hasUpper', label: 'Uppercase' },
            { key: 'hasLower', label: 'Lowercase' },
            { key: 'hasNumber', label: 'Number' },
            { key: 'hasSpecial', label: 'Symbol' }
          ].map((rule) => (
            <div key={rule.key} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${stats[rule.key as keyof typeof stats] ? 'bg-green-500' : 'bg-gray-200'}`}>
                <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
              </div>
              <span className={`text-[12px] font-medium transition-colors ${stats[rule.key as keyof typeof stats] ? 'text-gray-900' : 'text-gray-400'}`}>
                {rule.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100/50 text-[14px] font-medium"
        >
          <AlertCircle size={18} className="shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <button 
        type="submit"
        disabled={isLoading || !isPasswordValid || !isMatch}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-gray-900 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[15px] mt-2 group"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Complete Setup
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </button>
      <button 
        type="button"
        onClick={() => setMode('email_entry')}
        className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium text-[14px] transition-colors"
      >
        Back to email entry
      </button>
    </motion.form>
  );

  const renderForgotPassword = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
        <Mail size={26} strokeWidth={2.5} />
      </div>
      <h2 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">Reset Password</h2>
      
      {resetSent ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-green-700 bg-green-50 p-5 rounded-2xl border border-green-100 font-medium text-[15px]">
            <CheckCircle2 className="shrink-0" size={24} />
            <p>Reset link sent! Please check your inbox for instructions.</p>
          </div>
          <button 
            onClick={() => {
              setMode('password_entry');
              setResetSent(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl transition-all shadow-sm text-[15px]"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
          <p className="text-gray-500 font-medium mb-8 text-[15px] leading-relaxed">
            Enter your account email and we'll send instructions to restore your access.
          </p>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
              <Mail className="h-5 w-5" />
            </div>
            <input 
              type="email" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 hover:border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-gray-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-gray-400"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100/50 text-[14px] font-medium"
            >
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isLoading || !email}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 disabled:opacity-50 disabled:hover:bg-gray-900 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[15px] mt-2 group"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Reset Instructions <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></>}
          </button>
          <button 
            type="button"
            onClick={() => setMode('password_entry')}
            className="w-full py-2 text-gray-500 hover:text-gray-900 font-medium text-[14px] transition-colors"
          >
            Back to login
          </button>
        </form>
      )}
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-gray-100 p-8 sm:p-12"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>

            <AnimatePresence mode="wait">
              {mode === 'email_entry' && <motion.div key="email">{renderEmailEntry()}</motion.div>}
              {mode === 'password_entry' && <motion.div key="password">{renderPasswordEntry()}</motion.div>}
              {mode === 'set_password' && <motion.div key="set">{renderSetPassword()}</motion.div>}
              {mode === 'forgot_password' && <motion.div key="forgot">{renderForgotPassword()}</motion.div>}
            </AnimatePresence>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

