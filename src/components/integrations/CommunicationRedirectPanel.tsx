import { ArrowRight, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommunicationRedirectPanelProps {
  serviceName: string;
  serviceIcon: React.ReactNode;
  serviceDescription: string;
}

export function CommunicationRedirectPanel({ serviceName, serviceIcon, serviceDescription }: CommunicationRedirectPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center max-w-lg mx-auto">
        <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
          {serviceIcon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{serviceName}</h3>
          <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">
            {serviceDescription}
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/communication')}
          className="px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider flex items-center gap-2"
        >
          <span>Configure in Communication</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
