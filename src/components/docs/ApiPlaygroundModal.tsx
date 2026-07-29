import React, { useState } from 'react';
import { X, Play, Check, Copy, Code, Sparkles, Send, RefreshCw } from 'lucide-react';
import { ApiEndpointSpec } from '@/website/data/DocsData';

interface ApiPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiSpec?: ApiEndpointSpec;
}

export const ApiPlaygroundModal: React.FC<ApiPlaygroundModalProps> = ({
  isOpen,
  onClose,
  apiSpec
}) => {
  const [apiKey, setApiKey] = useState('cm_live_demo_98a7b6c5d4e3');
  const [requestBody, setRequestBody] = useState(apiSpec?.requestBody || '');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !apiSpec) return null;

  const handleSendRequest = () => {
    setIsLoading(true);
    setResponse(null);

    // Simulate realistic API latency
    setTimeout(() => {
      setIsLoading(false);
      setResponseStatus(200);
      setResponse(apiSpec.responseBody);
    }, 450);
  };

  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-white/95 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-50 border border-brand-100 text-brand-600">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 font-display uppercase italic">
                Interactive API Playground
              </h3>
              <p className="text-xs text-slate-500">Test live CallMind REST API endpoints in sandbox mode.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto custom-scrollbar flex-1">
          {/* Left Column: Request Configuration */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-slate-200 space-y-5 bg-white">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Endpoint Method & Path</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-mono font-semibold text-slate-800">
                <span className="px-2 py-0.5 rounded bg-violet-600 text-white font-bold text-xs uppercase">
                  {apiSpec.method}
                </span>
                <span className="truncate">{apiSpec.path}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Authorization Header</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500"
                value={`Bearer ${apiKey}`}
                onChange={e => setApiKey(e.target.value.replace('Bearer ', ''))}
              />
            </div>

            {apiSpec.method !== 'GET' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">JSON Request Body</label>
                <textarea
                  rows={8}
                  className="w-full p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono focus:outline-none border border-slate-800 custom-scrollbar"
                  value={requestBody}
                  onChange={e => setRequestBody(e.target.value)}
                />
              </div>
            )}

            <button
              onClick={handleSendRequest}
              disabled={isLoading}
              className="w-full btn-tactile btn-glow flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Execute Request
                </>
              )}
            </button>
          </div>

          {/* Right Column: Response Preview */}
          <div className="p-6 bg-slate-900 text-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Response</span>
                  {responseStatus && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {responseStatus} OK
                    </span>
                  )}
                </div>
                {response && (
                  <button
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
                  <span className="text-xs">Connecting to CallMind API Server...</span>
                </div>
              ) : response ? (
                <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto custom-scrollbar max-h-[380px]">
                  {response}
                </pre>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2 text-center">
                  <Sparkles className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">Click "Execute Request" to test endpoint response.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Environment: Sandbox Testnet</span>
              <span>Latency: 42ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
