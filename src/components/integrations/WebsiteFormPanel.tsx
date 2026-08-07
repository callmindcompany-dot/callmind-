import { useState, useCallback } from 'react';
import { Copy } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { toast } from 'react-hot-toast';

interface WebsiteFormPanelProps {
  companyId: string | null;
}

interface FormFields {
  name: boolean;
  phone: boolean;
  email: boolean;
  budget: boolean;
  propertyPreference: boolean;
  remarks: boolean;
}

export function WebsiteFormPanel({ companyId }: WebsiteFormPanelProps) {
  // Form Builder config
  const [formTitle, setFormTitle] = useState('Register Your Interest');
  const [formFields, setFormFields] = useState<FormFields>({
    name: true, phone: true, email: true,
    budget: true, propertyPreference: false, remarks: false,
  });
  const [formBtnColor, setFormBtnColor] = useState('brand');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Preview form inputs
  const [previewName, setPreviewName] = useState('');
  const [previewPhone, setPreviewPhone] = useState('');
  const [previewEmail, setPreviewEmail] = useState('');
  const [previewBudget, setPreviewBudget] = useState('');
  const [previewProp, setPreviewProp] = useState('');
  const [previewRemarks, setPreviewRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getEmbedCode = useCallback(() => {
    const fields = Object.entries(formFields)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    return `<iframe
  src="https://app.callmind.app/forms/embed?cid=${companyId}&fields=${fields}&theme=${formBtnColor}"
  width="100%" height="600"
  style="border:none; border-radius:24px;"
  title="${formTitle}"
></iframe>`;
  }, [companyId, formFields, formBtnColor, formTitle]);

  const handleCopyEmbedCode = useCallback(() => {
    navigator.clipboard.writeText(getEmbedCode());
    toast.success('📋 Embed code copied!');
  }, [getEmbedCode]);

  const handleSubmitFormLead = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('leads').insert({
        name: previewName.trim(),
        phone: previewPhone.trim(),
        email: previewEmail.trim() || null,
        estimated_budget: previewBudget || null,
        description: [previewProp, previewRemarks].filter(Boolean).join('. ') || null,
        source: 'Website Embed Form',
        status: 'New Lead',
        company_id: companyId,
        assigned_to: 'unassigned',
        is_deleted: false,
        is_unseen: true,
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'WEBSITE_FORM_LEAD_CREATED',
        category: 'integration',
        target: 'Website Forms',
        details: `Form test: ${previewName} (${previewPhone})`,
      });

      toast.success('🎉 Test lead created from form simulator!');
      setPreviewName(''); setPreviewPhone(''); setPreviewEmail('');
      setPreviewBudget(''); setPreviewProp(''); setPreviewRemarks('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create test lead.');
    } finally {
      setIsSubmitting(false);
    }
  }, [companyId, previewName, previewPhone, previewEmail, previewBudget, previewProp, previewRemarks]);

  const btnThemeClass = formBtnColor === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
    formBtnColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
    formBtnColor === 'dark' ? 'bg-slate-900 hover:bg-slate-800' :
    'bg-brand-600 hover:bg-brand-700';

  return (
    <div className="col-span-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Form Builder (Left) */}
      <div className="lg:col-span-4 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">Customize Widget</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Form Header Title</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-indigo-200 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Form Elements Enabled</label>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 opacity-60">
                <input type="checkbox" checked disabled className="rounded border-gray-300 text-indigo-600" />
                <span>Full Customer Name (Required)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 opacity-60">
                <input type="checkbox" checked disabled className="rounded border-gray-300 text-indigo-600" />
                <span>Contact Phone Number (Required)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={formFields.email} onChange={(e) => setFormFields({ ...formFields, email: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Email Address field</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={formFields.budget} onChange={(e) => setFormFields({ ...formFields, budget: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Budget scope drop</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={formFields.propertyPreference} onChange={(e) => setFormFields({ ...formFields, propertyPreference: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Property interest drop</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={formFields.remarks} onChange={(e) => setFormFields({ ...formFields, remarks: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Additional remarks textarea</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Action Button Theme</label>
            <select value={formBtnColor} onChange={(e) => setFormBtnColor(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-transparent text-xs font-bold focus:border-indigo-200 outline-none">
              <option value="brand">Brand Magenta</option>
              <option value="emerald">Emerald Green</option>
              <option value="indigo">Indigo Blue</option>
              <option value="dark">Slate Black</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Preview / Embed Code (Right) */}
      <div className="lg:col-span-8 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col min-h-[500px]">
        <div className="flex border-b border-gray-100 pb-3 mb-6 items-center justify-between">
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('preview')} className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-colors ${activeTab === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}>
              Live Form Simulator
            </button>
            <button onClick={() => setActiveTab('code')} className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-colors ${activeTab === 'code' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}>
              Integrator HTML Embed Code
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {activeTab === 'preview' ? (
            <div className="max-w-md mx-auto w-full border border-gray-100 rounded-3xl p-6 shadow-sm bg-gray-50/30">
              <h4 className="text-sm font-bold text-gray-800 text-center mb-6">{formTitle}</h4>

              <form onSubmit={handleSubmitFormLead} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Name *</label>
                  <input type="text" required placeholder="Client Full Name" value={previewName} onChange={(e) => setPreviewName(e.target.value)} className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mobile *</label>
                  <input type="text" required placeholder="e.g. 9876543210" value={previewPhone} onChange={(e) => setPreviewPhone(e.target.value)} className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-400" />
                </div>
                {formFields.email && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                    <input type="email" placeholder="customer@domain.com" value={previewEmail} onChange={(e) => setPreviewEmail(e.target.value)} className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-400" />
                  </div>
                )}
                {formFields.budget && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Investment Limit</label>
                    <select value={previewBudget} onChange={(e) => setPreviewBudget(e.target.value)} className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-400">
                      <option value="">Choose bracket...</option>
                      <option value="₹50 L - ₹1 Cr">50 L - 1 Cr</option>
                      <option value="₹1 Cr - ₹2 Cr">1 Cr - 2 Cr</option>
                      <option value="₹2 Cr - ₹5 Cr">2 Cr - 5 Cr</option>
                    </select>
                  </div>
                )}
                {formFields.propertyPreference && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Property Type</label>
                    <select value={previewProp} onChange={(e) => setPreviewProp(e.target.value)} className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-400">
                      <option value="">Select preference...</option>
                      <option value="2 BHK residential">2 BHK Flat</option>
                      <option value="3 BHK residential">3 BHK Flat</option>
                      <option value="Commercial plot">Commercial Storefront</option>
                    </select>
                  </div>
                )}
                {formFields.remarks && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Additional Notes</label>
                    <textarea placeholder="Describe property parameters..." value={previewRemarks} onChange={(e) => setPreviewRemarks(e.target.value)} className="w-full p-3 bg-white rounded-lg border border-gray-200 text-xs font-medium outline-none focus:border-indigo-400 min-h-[60px]" />
                  </div>
                )}
                <button type="submit" disabled={isSubmitting} className={`w-full py-2.5 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-sm ${btnThemeClass}`}>
                  {isSubmitting ? 'Generating pipeline link...' : 'Test Form Submit'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Add this copy-paste block directly into your index.html layout or landing page.</p>
                <button onClick={handleCopyEmbedCode} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
                  <Copy size={12} /> Copy Code
                </button>
              </div>
              <pre className="max-h-[300px] overflow-y-auto bg-slate-900 text-slate-300 p-6 rounded-2xl text-[10px] leading-relaxed font-mono select-all">
                {getEmbedCode()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
