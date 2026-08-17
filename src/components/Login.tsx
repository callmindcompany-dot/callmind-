import React, { useState } from 'react';
import { useAuth } from '@/AuthContext';
import { FOUNDER_OWNERS, INTERNAL_TEAM, USER_PERSPECTIVE_TESTERS } from '@/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ArrowRight, ArrowLeft, AlertCircle, KeyRound, Eye, EyeOff, CheckCircle2, ShieldCheck, User as UserIcon } from 'lucide-react';

const Login = ({ defaultMode = 'login' }: { defaultMode?: 'login' | 'signup' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, signUp, sendPasswordResetEmail, isReady, isAuthenticated, onboardingStatus, hasFounderHubAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultMode);
  const [view, setView] = useState<'main' | 'forgot_password'>('main');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect intent preservation
  const from = location.state?.from?.pathname || null;

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (isReady && isAuthenticated) {
      const destination = from || (onboardingStatus === 'completed' ? (hasFounderHubAccess ? '/founder-hub' : '/dashboard') : '/onboarding');
      navigate(destination, { replace: true });
    }
  }, [isReady, isAuthenticated, onboardingStatus, hasFounderHubAccess, navigate, from]);

  // Password Validation Logic

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
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [existingAccountError, setExistingAccountError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    setActiveTab(defaultMode);
    setView('main');
    setError('');
    setSuccessMsg('');
  }, [defaultMode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      await signIn(normalizedEmail, password);
      // Removed manual navigation to allow useEffect to route based on AuthContext state resolving
    } catch (err: any) {
      const errorCode = err.code || '';
      const errMsg = (err.message || '').toLowerCase();
      
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError("You appear to be offline. Please check your internet connection and try again.");
      } else if (errMsg.includes('email not confirmed')) {
        setError("Email address is not confirmed yet. Please check your inbox for the confirmation link.");
      } else if (errMsg.includes('email provider is disabled')) {
        setError("Email login is currently unavailable. Please contact support.");
      } else if (errorCode === 'auth/too-many-requests' || errMsg.includes('too-many-requests')) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else {
        // Default truthful message for any non-existent user or credential mismatch
        setError("No account found with this email, or password is incorrect. If you don't have an account yet, please click 'Create an account' below to sign up.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!isPasswordValid) return;
    if (!isMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();
    const isFounderOwner = FOUNDER_OWNERS.includes(normalizedEmail);
    const isInternalTeam = INTERNAL_TEAM.includes(normalizedEmail);
    const isTester = USER_PERSPECTIVE_TESTERS.includes(normalizedEmail);
    const isInternal = isFounderOwner || isInternalTeam || isTester;

    if (isInternal) {
      setError("Internal team members must use the Login flow. Please select 'Login' tab above.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await signUp(normalizedEmail, password, {
        name,
        onboardingStatus: 'pending',
        role: 'founder',
        plan: 'trial'
      });

      if (res && res.user && !res.session) {
        setSuccessMsg("Account created! Please check your email inbox to confirm your address, then log in.");
        setActiveTab('login');
      }
    } catch (err: any) {
      const errMsg = (err.message || '').toLowerCase();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError("You appear to be offline. Please check your internet connection.");
      } else if (err.code === 'auth/email-already-in-use' || errMsg.includes('already registered') || errMsg.includes('already in use')) {
        setError("This email is already registered. Please login instead.");
        setExistingAccountError(true);
      } else if (err.code === 'auth/weak-password' || errMsg.includes('weak-password') || errMsg.includes('at least 6')) {
        setError("Password is too weak. Please use at least 8 characters.");
      } else if (err.code === 'auth/invalid-email' || errMsg.includes('invalid email')) {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Registration could not be completed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setIsLoading(true);
    setResetSent(false);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      await sendPasswordResetEmail(normalizedEmail);
      setResetSent(true);
    } catch (err: any) {
      // Security: Do not reveal if email exists unless it explicitly says not found or not allowed
      setError('If email exists, reset link sent.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      
      if (from) {
        navigate(from, { replace: true });
      } else if (onboardingStatus !== 'completed') {
        navigate('/onboarding', { replace: true });
      } else if (hasFounderHubAccess) {
        navigate('/founder-hub', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (e: any) {
      console.error("[Google Auth] Error:", e);
      setError(`Could not connect to Google: ${e.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Premium Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />

      <button 
        onClick={() => {
          if (view !== 'main') {
            setView('main');
            setError('');
          } else {
            navigate('/');
          }
        }} 
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center px-4 py-2 bg-white/50 hover:bg-white backdrop-blur-sm border border-slate-200/50 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-full transition-all shadow-sm z-10"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> {view === 'main' ? 'Back to Home' : 'Back'}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.1)] border border-white p-8 sm:p-12 relative overflow-hidden ring-1 ring-slate-900/5 z-10"
      >
        {/* Tabs have been removed as requested */}

        <AnimatePresence mode="wait">
          {view === 'main' && activeTab === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">Secure Access</h2>
              <p className="text-gray-500 font-medium mb-6 text-[15px]">
                Enter your details to log in.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
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

                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-[14px] font-medium"
                  >
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    <p>{successMsg}</p>
                  </motion.div>
                )}

                <div className="flex justify-between items-center px-1 pt-1 pb-2">
                  <div />
                  <button 
                    type="button"
                    onClick={() => {
                      setView('forgot_password');
                      setError('');
                    }}
                    className="text-[13px] text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 disabled:hover:bg-slate-900 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 text-[15px] group"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></>}
                </button>
              </form>

              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                  <span className="px-4 bg-white">OR</span>
                </div>
              </div>

              <button 
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-900 font-semibold rounded-2xl transition-all text-[15px] shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="pt-6 text-center border-t border-slate-100 mt-6">
                <p className="text-[14px] text-slate-600 font-medium">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-brand-600 hover:text-brand-700 font-bold hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </div>

              <div className="mt-6 text-center text-xs text-slate-500 space-y-1.5 leading-relaxed">
                <p>
                  By continuing, you agree to CallMind's{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 underline font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 underline font-medium">Privacy Policy</a>.
                </p>
                <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>DPDP Act 2023 Compliant · Data Stored in India 🇮🇳</span>
                </p>
              </div>
            </motion.div>
          )}

          {view === 'main' && activeTab === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">Create Account</h2>
              <p className="text-gray-500 font-medium mb-6 text-[15px] leading-relaxed">
                Join CallMind and start optimizing your calls today.
              </p>

              <form onSubmit={handleSignupSubmit} className="space-y-5">
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                      required
                    />
                  </div>

                  {!existingAccountError && (
                    <>
                      <div className="group">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
                            <Lock className="h-5 w-5" />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a strong password"
                            className="w-full pl-12 pr-12 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                            required={!existingAccountError}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>

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
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className={`w-full pl-12 pr-4 py-4 bg-white border-2 focus:ring-4 outline-none transition-all font-medium text-[15px] placeholder-gray-400 rounded-2xl ${
                            password && confirmPassword 
                              ? isMatch 
                                ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/10' 
                                : 'border-red-100 focus:border-red-200 focus:ring-red-500/5 hover:border-red-200'
                              : 'border-gray-100 hover:border-gray-200 focus:border-brand-500 focus:ring-brand-500/10'
                          }`}
                          required={!existingAccountError}
                        />
                      </div>
                    </>
                  )}
                </div>

                {!existingAccountError && (
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
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100/50 text-[14px] font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="shrink-0" />
                      <p>{error}</p>
                    </div>
                    {existingAccountError && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('login');
                          setName('');
                          setPassword('');
                          setConfirmPassword('');
                          setError('');
                          setExistingAccountError(false);
                        }}
                        className="mt-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                      >
                         Go to Login <ArrowRight size={16} />
                      </button>
                    )}
                  </motion.div>
                )}

                {!existingAccountError && (
                  <button 
                    type="submit"
                    disabled={isLoading || !name.trim() || !email || !isPasswordValid || !isMatch}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(var(--brand-600),0.3)] hover:-translate-y-0.5 text-[15px] group"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></>}
                  </button>
                )}
              </form>

              <div className="pt-6 text-center border-t border-slate-100 mt-6">
                <p className="text-[14px] text-slate-600 font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-brand-600 hover:text-brand-700 font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>

              <div className="mt-6 text-center text-xs text-slate-500 space-y-1.5 leading-relaxed">
                <p>
                  By creating an account, you agree to CallMind's{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 underline font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 underline font-medium">Privacy Policy</a>.
                </p>
                <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>DPDP Act 2023 Compliant · Data Stored in India 🇮🇳</span>
                </p>
              </div>
            </motion.div>
          )}

          {view === 'forgot_password' && (
            <motion.div
              key="forgot_password"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                <KeyRound size={26} strokeWidth={2.5} />
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
                      setView('main');
                      setActiveTab('login');
                      setResetSent(false);
                      setError('');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 text-[15px]"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 font-medium mb-8 text-[15px] leading-relaxed">
                    Enter your email and we'll send instructions to restore your account access.
                  </p>

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600 text-gray-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 rounded-2xl outline-none transition-all font-medium text-[15px] placeholder-slate-400 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.02)]"
                        required
                      />
                    </div>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 p-4 rounded-2xl border text-[14px] font-medium ${error.includes('sent') ? 'bg-green-50 text-green-700 border-green-100' : 'text-red-600 bg-red-50 border-red-100/50'}`}
                      >
                        {error.includes('sent') ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                        <p>{error}</p>
                      </motion.div>
                    )}
                    <button 
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-white font-semibold rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 text-[15px]"
                    >
                      {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                    </button>
                    <div className="pt-2 text-center">
                      <button 
                        type="button"
                        onClick={() => {
                          setView('main');
                          setActiveTab('login');
                          setError('');
                        }}
                        className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;
