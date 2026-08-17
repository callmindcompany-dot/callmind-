import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, AlertCircle, ArrowRight, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useAuth, UserProfile } from '@/AuthContext';
import CallMindLoader from './CallMindLoader';

interface OnboardingFormProps {
  onComplete: () => void;
}

interface OnboardingFormData {
  name: string;
  phoneNumber: string;
  designation: string;
  companyName: string;
  companyIndustry: string;
  companySize: string;
}

const RECOVERY_KEY = 'onboarding_form_recovery';

export const OnboardingForm = ({ onComplete }: OnboardingFormProps) => {
  const {
    user,
    profile,
    completeOnboarding,
    updateProfile,
  } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: '',
    phoneNumber: '',
    designation: 'Founder / CEO',
    companyName: '',
    companyIndustry: '',
    companySize: '1-10',
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore onboarding recovery state
  useEffect(() => {
    try {
      const recovered = localStorage.getItem(RECOVERY_KEY);
      if (recovered) {
        const parsed = JSON.parse(recovered);
        if (parsed.formData) setFormData(parsed.formData);
      } else if (profile || user) {
        setFormData(prev => ({
          ...prev,
          name: profile?.name || user?.displayName || prev.name,
          phoneNumber: profile?.phoneNumber || prev.phoneNumber,
          designation: profile?.designation || 'Founder / CEO',
          companyName: profile?.companyName || prev.companyName,
          companyIndustry: profile?.companyIndustry || prev.companyIndustry,
          companySize: profile?.companySize || prev.companySize || '1-10',
        }));
      }
    } catch (e) {
      console.warn("Failed to restore onboarding recovery state", e);
    }
  }, [profile, user]);

  const handleDataChange = (updates: Partial<OnboardingFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(RECOVERY_KEY, JSON.stringify({ formData: updated }));
      return updated;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.companyIndustry.trim()) newErrors.companyIndustry = 'Industry is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const userId = user?.id || user?.uid;
    if (!userId) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // 1. Sync User Profile in 'users' table
      const finalProfileData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        designation: formData.designation,
        companyName: formData.companyName,
        companyIndustry: formData.companyIndustry,
        companySize: formData.companySize,
        companyId: userId,
        role: 'founder'
      };
      await completeOnboarding(finalProfileData);

      // 2. Inject company_id + role into Supabase Auth app_metadata
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${baseUrl}/api/auth/sync-app-metadata`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ companyId: userId, role: 'founder' }),
          });
          await supabase.auth.refreshSession();
        }
      } catch (metaErr) {
        console.warn('[Onboarding] app_metadata sync notice:', metaErr);
      }

      // 3. Upsert 'companies' table
      const { error: companyErr } = await supabase
        .from('companies')
        .upsert({
          id: userId,
          name: formData.companyName,
          category: formData.companyIndustry,
          size: formData.companySize,
          email: user?.email || '',
          admin_name: formData.name,
          phone: formData.phoneNumber,
          updated_at: new Date().toISOString(),
        });

      if (companyErr) throw companyErr;

      // 4. Upsert default 'team_settings' table
      const { error: teamErr } = await supabase
        .from('team_settings')
        .upsert({
          company_id: userId,
          require_approval: true,
          assignment_mode: 'round_robin',
          rotting_threshold: 5,
          hide_phone_numbers: false,
          device_limit: 2,
          leads_statuses: ['New', 'In Progress', 'Closed', 'Hot', 'Cold'],
          default_stage: 'New',
          updated_at: new Date().toISOString(),
        });

      if (teamErr) throw teamErr;

      localStorage.removeItem(RECOVERY_KEY);
      setIsSubmitting(false);
      setStep(2); // Success step

      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error: any) {
      console.error("[Onboarding] Setup failed:", error);
      setSubmitError(error.message || 'Failed to setup workspace. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkipForNow = async () => {
    const userId = user?.id || user?.uid;
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const fallbackCompanyName = formData.companyName || `${formData.name || 'My'} Company`;
      
      await supabase
        .from('companies')
        .upsert({
          id: userId,
          name: fallbackCompanyName,
          category: 'General',
          admin_name: formData.name || user?.email?.split('@')[0] || 'Admin',
          phone: formData.phoneNumber || '',
          updated_at: new Date().toISOString()
        });

      await supabase
        .from('team_settings')
        .upsert({
          company_id: userId,
          require_approval: true,
          assignment_mode: 'round_robin',
          rotting_threshold: 5,
          hide_phone_numbers: false,
          device_limit: 2,
          default_stage: 'New',
          updated_at: new Date().toISOString()
        });

      await updateProfile({ companyId: userId, role: 'founder', onboardingStatus: 'completed' });
      localStorage.removeItem(RECOVERY_KEY);
      onComplete();
    } catch (err) {
      console.error("Skip failed:", err);
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputError = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs font-bold"
      >
        <AlertCircle size={12} />
        <span className="uppercase tracking-tight">{error}</span>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-100/50 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-[540px] bg-white rounded-[40px] shadow-[0_20px_60px_-12px_rgba(15,23,42,0.1)] p-8 sm:p-12 border border-slate-100 relative group"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-50 rounded-t-[40px] overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${step === 1 ? 50 : 100}%` }}
            className={`h-full ${step === 2 ? 'bg-emerald-500' : 'bg-blue-600'} transition-all duration-700 ease-out`}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Building2 size={18} />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Quick Workspace Setup</span>
                </div>
                <h2 className="text-[28px] font-black text-slate-900 tracking-tight leading-tight">Welcome to CallMind</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Setup your company workspace identity in 30 seconds.</p>
              </div>

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-500 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Legal Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rahul Sharma" 
                    value={formData.name} 
                    onChange={(e) => handleDataChange({ name: e.target.value })} 
                    className={`w-full h-[52px] px-4 bg-slate-50 border-2 ${errors.name ? 'border-red-300' : 'border-slate-100 focus:border-blue-600'} rounded-2xl outline-none font-bold text-sm transition-all`} 
                  />
                  <InputError error={errors.name} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Designation / Role *</label>
                    <select 
                      value={formData.designation} 
                      onChange={(e) => handleDataChange({ designation: e.target.value })} 
                      className="w-full h-[52px] px-4 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl outline-none font-bold text-sm transition-all appearance-none"
                    >
                      <option value="Founder / CEO">Founder / CEO</option>
                      <option value="Owner / Director">Owner / Director</option>
                      <option value="Sales Leader / VP">Sales Leader / VP</option>
                      <option value="Operations Lead">Operations Lead</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Direct Phone *</label>
                    <input 
                      type="tel" 
                      placeholder="+91 9876543210" 
                      value={formData.phoneNumber} 
                      onChange={(e) => {
                        let val = e.target.value;
                        if (/^\d{10}$/.test(val)) val = '+91' + val;
                        handleDataChange({ phoneNumber: val });
                      }} 
                      className={`w-full h-[52px] px-4 bg-slate-50 border-2 ${errors.phoneNumber ? 'border-red-300' : 'border-slate-100 focus:border-blue-600'} rounded-2xl outline-none font-bold text-sm transition-all`} 
                    />
                    <InputError error={errors.phoneNumber} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Company Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CallMind Technologies" 
                    value={formData.companyName} 
                    onChange={(e) => handleDataChange({ companyName: e.target.value })} 
                    className={`w-full h-[52px] px-4 bg-slate-50 border-2 ${errors.companyName ? 'border-red-300' : 'border-slate-100 focus:border-blue-600'} rounded-2xl outline-none font-bold text-sm transition-all`} 
                  />
                  <InputError error={errors.companyName} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Market Industry *</label>
                    <input 
                      id="company-industry-input"
                      type="text" 
                      placeholder="e.g. Coaching / Classes, Logistics, Agriculture..." 
                      value={formData.companyIndustry} 
                      onChange={(e) => handleDataChange({ companyIndustry: e.target.value })} 
                      className={`w-full h-[52px] px-4 bg-slate-50 border-2 ${errors.companyIndustry ? 'border-red-300' : 'border-slate-100 focus:border-blue-600'} rounded-2xl outline-none font-bold text-sm transition-all`} 
                    />
                    <InputError error={errors.companyIndustry} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Team Size</label>
                    <select 
                      value={formData.companySize} 
                      onChange={(e) => handleDataChange({ companySize: e.target.value })} 
                      className="w-full h-[52px] px-4 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl outline-none font-bold text-sm transition-all appearance-none"
                    >
                      <option value="1-10">1-10 callers</option>
                      <option value="11-50">11-50 callers</option>
                      <option value="51-200">51-200 callers</option>
                      <option value="201+">201+ callers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions:</label>
                    <span className="text-[10px] text-slate-400 font-medium">Or type custom industry above</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '🎓 Coaching & Classes',
                      '🏠 Real Estate',
                      '☀️ Solar & Energy',
                      '📞 Telecalling Agency',
                      '🏭 Manufacturing',
                      '💼 Financial Services',
                      '🏥 Healthcare & Clinic',
                      '🚗 Automobile',
                      '🌾 Agriculture',
                      '📦 Logistics & Transport',
                      '✍️ Other / Custom'
                    ].map((ind) => {
                      if (ind === '✍️ Other / Custom') {
                        return (
                          <button
                            key={ind}
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById('company-industry-input');
                              if (inputEl) {
                                inputEl.focus();
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 bg-white"
                          >
                            {ind}
                          </button>
                        );
                      }
                      const cleanName = ind.replace(/^[^\w\s]+\s*/, '');
                      const isSelected = formData.companyIndustry.toLowerCase() === cleanName.toLowerCase();
                      return (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => handleDataChange({ companyIndustry: cleanName })}
                          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200/70 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {ind}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-[60px] bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-slate-900/10 group/btn"
                >
                  {isSubmitting ? (
                    <CallMindLoader size="xs" text="Building Workspace..." />
                  ) : (
                    <>
                      <span>Launch Workspace</span>
                      <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button 
                    onClick={handleSkipForNow}
                    disabled={isSubmitting}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-10 space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
                <ShieldCheck className="text-emerald-500" size={50} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-[30px] font-black text-slate-900 tracking-tight leading-tight">Workspace Secured</h2>
                <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto mt-2 leading-relaxed">
                  Your enterprise environment is provisioned and ready. Launching control center...
                </p>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-full">
                <CallMindLoader size="xs" text="Opening Dashboard..." />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
