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

  /*
   * The insert's error used to be ignored entirely.
   *
   * supabase-js does not throw on a database error -- it resolves with
   * { data, error } -- so the catch below never fired for one, and a refused
   * or failed insert still set submitted and showed "Priority spot reserved!".
   * Somebody would have been told they were on a list that had no record of
   * them, which is the same fault as the WhatsApp send reporting a message it
   * had not sent.
   *
   * .select() so a write refused by RLS, which returns no error and no rows,
   * is caught as well.
   */
  const handleJoinWaitlist = async () => {
    if (!email.includes('@') || !companyId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          company_id: companyId,
          action: 'WAITLIST_SIGNUP',
          category: 'integration',
          target: serviceName,
          details: `Waitlist signup email: ${email}`,
        })
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('The request was declined. Ask an admin to add you to this list.');
      }

      setSubmitted(true);
      toast.success(`You are on the list for ${serviceName}.`);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error && err.message ? err.message : 'Could not save that. Please try again.',
      );
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
            {/* Was "Priority spot reserved! We'll notify you when this
                integration is ready." There is no priority and no queue -- the
                signup is a row in the audit log, which an admin can read on the
                Audit Log page. Saying what actually happens. */}
            <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 size={14} /> Saved. Your admins can see this request in the audit log.
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
