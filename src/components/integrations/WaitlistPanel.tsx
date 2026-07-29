import { useState } from 'react';
import { Lock, CheckCircle2, Mail } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { toast } from 'react-hot-toast';

interface WaitlistPanelProps {
  companyId: string | null;
  serviceName: string;
  serviceIcon: React.ReactNode;
  serviceDescription: string;
}

export function WaitlistPanel({ companyId, serviceName, serviceIcon, serviceDescription }: WaitlistPanelProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleJoinWaitlist = async () => {
    if (!email.includes('@') || !companyId) return;
    setSubmitting(true);
    try {
      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'WAITLIST_SIGNUP',
        category: 'integration',
        target: serviceName,
        details: `Waitlist signup email: ${email}`,
        timestamp: new Date().toISOString(),
      });
      setSubmitted(true);
      toast.success(`🎉 Priority spot reserved for ${serviceName}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center max-w-lg mx-auto">
        <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
          {serviceIcon}
        </div>
        <div>
          <Lock className="mx-auto text-gray-300 mb-3" size={28} />
          <h3 className="text-lg font-bold text-gray-900">{serviceName}</h3>
          <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">
            {serviceDescription}
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl w-full">
            <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 size={14} /> Priority spot reserved! We'll notify you when this integration is ready.
            </p>
          </div>
        ) : (
          <div className="flex gap-2 w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@company.com"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinWaitlist()}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-300"
            />
            <button
              onClick={handleJoinWaitlist}
              disabled={submitting || !email.includes('@')}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-colors uppercase tracking-wider shrink-0 disabled:opacity-50 flex items-center gap-1"
            >
              <Mail size={14} /> {submitting ? 'Submitting...' : 'Join Waitlist'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
