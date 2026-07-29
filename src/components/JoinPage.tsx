import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Phone, 
  UserCheck, 
  AlertCircle, 
  KeyRound, 
  Briefcase, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ValidationResult {
  valid: boolean;
  companyName: string | null;
  maxUses?: number | null;
  usedCount?: number | null;
  error?: string;
}

interface ActiveInviteInfo {
  maxUses: number | null;
  usedCount: number;
}

export const JoinPage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL Parameter parsing
  const urlCompanyId = searchParams.get('id') || '';
  const urlJoinCode = searchParams.get('code') || '';
  const urlToken = searchParams.get('token') || '';

  // Input states
  const [companyId, setCompanyId] = useState<string>(urlCompanyId);
  const [joinCode, setJoinCode] = useState<string>(urlJoinCode || urlToken);
  const [name, setName] = useState<string>(profile?.name || profile?.displayName || '');
  const [phone, setPhone] = useState<string>(profile?.phoneNumber || profile?.phone || '');
  const [city, setCity] = useState<string>('');
  const [language, setLanguage] = useState<string>('English');

  // Debounced input states (to prevent high-frequency validation calls)
  const [debouncedCompanyId, setDebouncedCompanyId] = useState<string>(urlCompanyId);
  const [debouncedJoinCode, setDebouncedJoinCode] = useState<string>(urlJoinCode || urlToken);

  // Status and details states
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [activeInvite, setActiveInvite] = useState<ActiveInviteInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCompanyId(companyId);
      setDebouncedJoinCode(joinCode);
    }, 300);

    return () => clearTimeout(timer);
  }, [companyId, joinCode]);

  // Sync profile data once loaded
  useEffect(() => {
    if (profile) {
      const profileName = profile.name || profile.displayName || '';
      const profilePhone = profile.phoneNumber || profile.phone || '';
      if (profileName && !name) setName(profileName);
      if (profilePhone && !phone) setPhone(profilePhone);
    }
  }, [profile]);

  // Handle dynamic validation when companyId and code/token are filled and debounced
  useEffect(() => {
    const validateRequestDetails = async () => {
      if (!debouncedCompanyId || !debouncedJoinCode) {
        setCompanyName(null);
        setActiveInvite(null);
        setValidationError(null);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const { data, error } = await supabase.functions.invoke<ValidationResult>('validate-join', {
          body: {
            companyId: debouncedCompanyId,
            joinCode: debouncedJoinCode,
            userId: user?.id || user?.uid || ''
          }
        });

        if (error) throw error;

        if (data) {
          if (data.valid) {
            setCompanyName(data.companyName);
            setActiveInvite({
              maxUses: data.maxUses ?? null,
              usedCount: data.usedCount ?? 0
            });
            setValidationError(null);
          } else {
            setCompanyName(null);
            setActiveInvite(null);
            setValidationError(data.error || 'This invitation code is either invalid, revoked, or has expired.');
          }
        }
      } catch (err: unknown) {
        console.error('[JoinFlow] Validation Error:', err);
        setValidationError('Failed to inspect team registration codes. Try reloading.');
        setCompanyName(null);
        setActiveInvite(null);
      } finally {
        setIsValidating(false);
      }
    };

    validateRequestDetails();
  }, [debouncedCompanyId, debouncedJoinCode, user]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Final defensive validation checks
    if (!companyId.trim()) {
      toast.error('Please enter a team hub ID.');
      return;
    }
    if (!joinCode.trim()) {
      toast.error('Invitation code or QR token is required.');
      return;
    }
    if (validationError || !activeInvite) {
      toast.error('Cannot request join: invitation signature is invalid.');
      return;
    }
    if (!name.trim() || !phone.trim() || !city.trim()) {
      toast.error('Please provide all applicant credentials.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; requestId?: string; error?: string }>('submit-join-request', {
        body: {
          companyId: companyId.trim(),
          userId: user.id || user.uid,
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          language: language.trim(),
          joinCode: joinCode.trim()
        }
      });

      if (error) throw error;

      if (data) {
        if (data.success) {
          setSubmitSuccess(true);
          toast.success('Registration request submitted! Awaiting administrator approval.', { duration: 4000 });
          
          // Auto-redirect to onboarding/waiting lobby
          setTimeout(() => {
            navigate('/preview/loader');
          }, 3500);
        } else {
          toast.error(data.error || 'Onboarding request failed.');
        }
      }
    } catch (err: unknown) {
      console.error('[JoinFlow] Request creation failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Please check internet connection.';
      toast.error(`Onboarding request failed. ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#F8FAFC] to-[#F1F5F9] flex flex-col md:flex-row items-stretch overflow-hidden">
      
      {/* Visual left brand rail */}
      <div className="hidden md:flex md:w-5/12 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_60%)]" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-brand-500/20">
            CM
          </div>
          <div>
            <h4 className="font-sans font-bold leading-none tracking-tight">CallMind</h4>
            <p className="text-[9px] font-black tracking-widest text-[#2563EB] uppercase mt-0.5">Telecaller CRM</p>
          </div>
        </div>

        <div className="relative z-10 my-auto space-y-6 max-w-sm">
          <Briefcase className="w-12 h-12 text-brand-500" />
          <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
            Team Member Onboarding Hub
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Scan QR, use dynamic codes, or follow Direct Links to connect securely with your manager’s hub. Immediate seat reservation starts upon approval.
          </p>
          
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Seat Allocation Safeguards</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Real-Time Audit Trail Logging</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Device-Limit Scoping Included</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-slate-800 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-black">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate max-w-[140px]">{user?.email}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Applicant Workspace</p>
            </div>
          </div>
          <button 
            onClick={() => signOut().then(() => navigate('/login'))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 hover:border-red-900 border border-transparent rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <LogOut size={12} /> Log Out
          </button>
        </div>
      </div>

      {/* Main user form context */}
      <div className="flex-1 p-6 md:p-16 flex flex-col justify-center overflow-y-auto max-h-screen">
        <div className="w-full max-w-lg mx-auto">
          
          {/* Back link when not on success screen */}
          {!submitSuccess && (
            <button 
              onClick={() => navigate('/')} 
              className="mb-8 flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
              ← Back to main site
            </button>
          )}

          <AnimatePresence mode="wait">
            {submitSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-emerald-950 border border-emerald-900 p-8 rounded-[40px] text-center space-y-6 shadow-xl"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <UserCheck size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Request Submitted!</h2>
                  <p className="text-sm text-emerald-400 font-medium">
                    Your request was successfully filed under the <strong>{companyName || 'Hub'}</strong> namespace.
                  </p>
                </div>
                
                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 flex items-start gap-3 text-left">
                  <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    An admin has been notified. We are holding your seat placeholder temporarily. Once approved, your CallMind account becomes live with access to the agent platform dashboard.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest pt-2">
                  <Loader2 className="animate-spin text-brand-500" size={16} />
                  <span>Syncing team profile...</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">Join a Secure Team Hub</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Enter Company and Invitation Codes to register as an active Telecaller.
                  </p>
                </div>

                <form onSubmit={handleJoinSubmit} className="space-y-6">
                  
                  {/* Part 1: Scope Validation */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-50 pb-3">
                      <KeyRound size={14} className="text-brand-500" />
                      Invitation Gate credentials
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Company Hub ID
                        </label>
                        <input 
                          type="text"
                          required
                          value={companyId}
                          onChange={(e) => setCompanyId(e.target.value.trim())}
                          placeholder="e.g. comp_xyz123"
                          disabled={!!urlCompanyId}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 placeholder-gray-400 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60 disabled:bg-gray-100 font-mono text-[13px] font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Onboarding Code
                        </label>
                        <input 
                          type="text"
                          required
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          placeholder="e.g. QR-XZY / A1B2C3"
                          disabled={!!urlJoinCode || !!urlToken}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 placeholder-gray-400 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60 disabled:bg-gray-100 font-mono text-[13px] font-bold"
                        />
                      </div>
                    </div>

                    {/* Dynamic Real-Time Feedback Segment */}
                    {isValidating && (
                      <div className="flex items-center gap-2 text-xs font-black bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                        <span>Validating credentials structure...</span>
                      </div>
                    )}

                    {!isValidating && companyName && activeInvite && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex items-start gap-3"
                      >
                        <Building2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">Hub Confirmed: {companyName}</p>
                          <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mt-0.5">
                            Active invite code ({activeInvite.maxUses !== null ? activeInvite.maxUses - activeInvite.usedCount : '∞'} slots left)
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {!isValidating && validationError && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3"
                      >
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold leading-relaxed">{validationError}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Part 2: Applicant Information */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">
                      Applicant Profile credentials
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Full Name
                        </label>
                        <input 
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your real full name"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-brand-500 transition-all font-semibold text-gray-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+91 XXXXX XXXXX"
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-brand-500 transition-all font-mono font-semibold text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            City / Region (locale)
                          </label>
                          <div className="relative">
                            <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text"
                              required
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="e.g. Pune, Maharashtra"
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-brand-500 transition-all font-semibold text-gray-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Primary Communication Language
                        </label>
                        <div className="relative">
                          <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-brand-500 transition-all font-bold text-gray-900 appearance-none"
                          >
                            <option value="Hindi">Hindi / हिन्दी</option>
                            <option value="English">English</option>
                            <option value="Marathi">Marathi / मराठी</option>
                            <option value="Bengali">Bengali / বাংলা</option>
                            <option value="Telugu">Telugu / తెలుగు</option>
                            <option value="Tamil">Tamil / தமிழ்</option>
                            <option value="Gujarati">Gujarati / ગુજરાતી</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission and disclaimer CTA */}
                  <div className="space-y-3">
                    <button 
                      type="submit"
                      disabled={isSubmitting || isValidating || !!validationError || !activeInvite}
                      className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Onboarding Request</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                    
                    <p className="text-[9.5px] text-gray-400 text-center font-medium leading-relaxed px-4">
                      By submitting, you align with your team hub’s onboarding scoping rules. Duplicate requests are ignored to ensure audit and database integrity.
                    </p>
                  </div>

                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};
