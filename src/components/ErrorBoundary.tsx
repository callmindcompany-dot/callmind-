import * as React from 'react';
import { 
  AlertCircle, 
  RotateCcw, 
  LayoutDashboard, 
  Send, 
  WifiOff, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorService } from '@/services/error.service';
import CallMindLoader from './CallMindLoader';

interface Props {
  children: React.ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  countdown: number;
  isReporting: boolean;
  isReported: boolean;
  isOffline: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private timer: NodeJS.Timeout | null = null;
  
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    countdown: 5,
    isReporting: false,
    isReported: false,
    isOffline: !navigator.onLine
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Uncaught error in ${this.props.componentName || 'Unknown Component'}:`, error, errorInfo);
    
    // Start auto-recovery countdown
    this.startCountdown();

    // Store error info for reporting
    this.setState({ errorInfo });

    // Check network status
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);
  }

  componentWillUnmount() {
    this.clearTimer();
    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);
  }

  handleNetworkChange = () => {
    this.setState({ isOffline: !navigator.onLine });
  };

  startCountdown = () => {
    this.clearTimer();
    this.setState({ countdown: 5 });
    
    this.timer = setInterval(() => {
      if (this.state.countdown <= 1) {
        this.clearTimer();
        this.handleRetry();
      } else {
        this.setState(prev => ({ countdown: prev.countdown - 1 }));
      }
    }, 1000);
  };

  clearTimer = () => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  };

  handleRetry = () => {
    this.clearTimer();
    this.setState({ hasError: false, error: null, countdown: 5, isReported: false });
    window.location.reload(); // Hard reload to clear potential stale states
  };

  handleCancelAutoRecovery = () => {
    this.clearTimer();
    this.setState({ countdown: -1 }); // Indicates manual mode
  };

  handleReportIssue = async () => {
    if (!this.state.error) return;
    
    this.setState({ isReporting: true });
    const success = await ErrorService.reportError(
      this.state.error!, 
      this.state.errorInfo?.componentStack || 'Caught in ErrorBoundary'
    );
    
    setTimeout(() => {
      this.setState({ 
        isReporting: false, 
        isReported: !!success 
      });
    }, 800);
  };

  handleGoDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.isOffline || 
                           this.state.error?.message.toLowerCase().includes('network') ||
                           this.state.error?.message.toLowerCase().includes('fetch');

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-gray-50/50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="max-w-2xl w-full"
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-[40px] overflow-hidden">
              <div className="p-8 sm:p-12">
                {/* Brand / Icon */}
                <div className="flex justify-center mb-8">
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center relative ${isNetworkError ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
                    <div className="absolute inset-0 animate-pulse rounded-3xl opacity-20 bg-current" />
                    {isNetworkError ? <WifiOff size={48} /> : <ShieldAlert size={48} />}
                  </div>
                </div>

                {/* Message */}
                <div className="text-center space-y-3 mb-10">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    Something went wrong
                  </h2>
                  <p className="text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">
                    {this.props.componentName ? `The ${this.props.componentName} section` : 'This component'} encountered an unexpected error. Please try refreshing the page.
                  </p>
                </div>

                {/* Auto-recovery Countdown */}
                <AnimatePresence mode="wait">
                  {this.state.countdown > 0 ? (
                    <motion.div 
                      key="countdown"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between mb-8"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin flex items-center justify-center text-brand-600 font-black text-sm">
                          {this.state.countdown}
                        </div>
                        <span className="text-sm font-bold text-gray-700 tracking-tight">
                          Auto-recovering in {this.state.countdown}s...
                        </span>
                      </div>
                      <button 
                        onClick={this.handleCancelAutoRecovery}
                        className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 tracking-widest px-3 py-1.5 hover:bg-white rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  ) : this.state.countdown === 0 ? (
                    <motion.div 
                      key="recovering"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-4 mb-8"
                    >
                      <span className="text-sm font-black text-brand-600 uppercase tracking-widest flex items-center justify-center gap-2"><CallMindLoader size="xs" /> Syncing Engine...</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Action Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => this.setState({ hasError: false, error: null, countdown: -1 })}
                    className="flex items-center justify-center gap-3 py-4 bg-brand-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 active:scale-95 group"
                  >
                    <RotateCcw size={18} className="group-hover:rotate-45 transition-transform" />
                    Retry Component
                  </button>
                  
                  <button 
                    onClick={this.handleRetry}
                    className="flex items-center justify-center gap-3 py-4 bg-white border-2 border-brand-100 text-brand-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-50 transition-all active:scale-95 group"
                  >
                    <RotateCcw size={18} className="group-hover:rotate-90 transition-transform text-brand-400" />
                    Hard Refresh
                  </button>

                  <button 
                    onClick={this.handleGoDashboard}
                    className="sm:col-span-2 flex items-center justify-center gap-3 py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95 group"
                  >
                    <LayoutDashboard size={18} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                    Emergency Exit to Dashboard
                  </button>

                  <div className="sm:col-span-2">
                    <button 
                      onClick={this.handleReportIssue}
                      disabled={this.state.isReporting || this.state.isReported}
                      className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 ${
                        this.state.isReported 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:text-gray-700'
                      }`}
                    >
                      {this.state.isReporting ? (
                        <CallMindLoader size="xs" />
                      ) : this.state.isReported ? (
                        <>Issue Reported <ChevronRight size={18} /></>
                      ) : (
                        <><Send size={18} /> Report This Issue</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Error Detail (Small/Hidden) */}
              {this.state.error && (
                <div className="bg-gray-50 border-t border-gray-100 p-4">
                  <div className="flex items-start gap-3 opacity-40">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p className="text-[10px] font-mono leading-tight break-all">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
