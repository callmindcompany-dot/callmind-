import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Home, Users, PhoneCall, Inbox, BarChart3, Settings, Grid } from 'lucide-react-native';

// Services & Context
import { MobileAuthProvider, useMobileAuth } from './src/services/AuthContext';

// Auth & Onboarding Screens
import { SplashScreen } from './src/screens/01_SplashScreen';
import { OnboardingSlides } from './src/screens/02_OnboardingSlides';
import { ProfileSetup } from './src/screens/03_ProfileSetup';
import { UserInfoCollection } from './src/screens/07_UserInfoCollection';
import { JoinCompany } from './src/screens/05_JoinCompany';
import { ApprovalPending } from './src/screens/06_ApprovalPending';

// Main App Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { LeadListScreen } from './src/screens/LeadListScreen';
import { LeadDetailScreen } from './src/screens/LeadDetailScreen';
import { PostCallFeedbackSheet } from './src/screens/PostCallFeedbackSheet';
import { CallbacksScreen } from './src/screens/CallbacksScreen';
import { PerformanceScreen } from './src/screens/PerformanceScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SubscriptionLockScreen } from './src/screens/SubscriptionLockScreen';

// Phase 3 Screens & Overlays
import { IncomingAssignedCallScreen } from './src/screens/37_IncomingAssignedCallScreen';
import { AITalkScriptScreen } from './src/screens/67_AITalkScriptScreen';
import { InboxScreen, Announcement } from './src/screens/59_InboxScreen';
import { AnnouncementDetailScreen } from './src/screens/AnnouncementDetailScreen';
import { VoiceNotesModal } from './src/screens/68_VoiceNotesModal';

// Phase 4 Screens
import { AppPermissionsScreen } from './src/screens/11_AppPermissionsScreen';
import { LanguageSelectionScreen } from './src/screens/10_LanguageSelectionScreen';
import { BiometricLockScreen } from './src/screens/86_BiometricLockScreen';
import { OfflineSyncBanner } from './src/screens/91_OfflineSyncBanner';

// Priority 1 Critical Screens
import { CallLogScreen } from './src/screens/54_CallLogScreen';
import { CallingScreen } from './src/screens/38_CallingScreen';
import { ActiveCallOverlay } from './src/screens/39_ActiveCallOverlay';
import { DialPadScreen } from './src/screens/40_DialPadScreen';
import { ScheduleCallbackSheet } from './src/screens/131_ScheduleCallbackSheet';
import { LeadFilterSheet } from './src/screens/128_LeadFilterSheet';
import { ToastContainer, toastSuccess, toastError, toastInfo } from './src/components/ToastNotification';

// Priority 2 Screens
import { ProfileEditScreen } from './src/screens/08_ProfileEditScreen';
import { AICallSummaryCard } from './src/screens/64_AICallSummaryCard';
import { AILeadInsightScreen } from './src/screens/65_AILeadInsightScreen';
import { NotificationCenterScreen } from './src/screens/62_NotificationCenterScreen';
import { CallCompletedCard } from './src/screens/42_CallCompletedCard';
import { ConfirmDialog } from './src/screens/137_ConfirmDialogs';

// Priority 3 & New Redesigned Screens
import { ThemeToggleScreen } from './src/screens/81_ThemeToggleScreen';
import { AboutAppScreen } from './src/screens/83_AboutAppScreen';
import { PrivacyTermsWebView } from './src/screens/84_PrivacyTermsWebView';
import { DeviceVerificationModal } from './src/screens/90_DeviceVerificationModal';
import { CompanyJoinedSuccess } from './src/screens/17_CompanyJoinedSuccess';
import { TargetScreen } from './src/screens/TargetScreen';
import { DocumentsScreen } from './src/screens/DocumentsScreen';
import { HelpCenterScreen } from './src/screens/HelpCenterScreen';
import { QualityAnalyticsScreen } from './src/screens/QualityAnalyticsScreen';
import { LeadImportScreen } from './src/screens/LeadImportScreen';

type AuthStep =
  | 'splash'
  | 'onboarding'
  | 'google_auth'
  | 'user_info'
  | 'permissions'
  | 'join_company'
  | 'approval_pending';

type AppScreen =
  | 'home'
  | 'leads'
  | 'lead_detail'
  | 'callbacks'
  | 'performance'
  | 'leaderboard'
  | 'attendance'
  | 'settings'
  | 'ai_script'
  | 'inbox'
  | 'announcement_detail'
  | 'language'
  | 'call_log'
  | 'dial_pad'
  | 'profile_edit'
  | 'ai_insight'
  | 'notifications'
  | 'theme'
  | 'about'
  | 'privacy_terms'
  | 'target'
  | 'documents'
  | 'help'
  | 'quality'
  | 'lead_import';

type BottomTab = 'home' | 'leads' | 'callbacks' | 'performance' | 'inbox' | 'settings';

function MainAppContent() {
  const {
    user,
    profile,
    isAuthenticated,
    isOnboarded,
    isApproved,
    isAdminBlocked,
    signInWithGoogle,
    signOut,
    completeOnboarding,
    refreshProfile,
    authError,
  } = useMobileAuth();

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [currentAuthStep, setCurrentAuthStep] = useState<AuthStep>('splash');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [activeTab, setActiveTab] = useState<BottomTab>('home');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Overlays & Offline
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [isSubscriptionLocked, setIsSubscriptionLocked] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Calling Flow States
  const [showCallingScreen, setShowCallingScreen] = useState(false);
  const [showActiveCall, setShowActiveCall] = useState(false);
  const [showScheduleCallback, setShowScheduleCallback] = useState(false);
  const [showLeadFilter, setShowLeadFilter] = useState(false);
  const [callingLeadName, setCallingLeadName] = useState('');

  // Priority 2 Overlays & Modals
  const [showCallCompleted, setShowCallCompleted] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; type: 'logout' | 'delete' | 'reassign'; title: string; message: string } | null>(null);

  // Priority 3 Overlays & States
  const [showDeviceVerification, setShowDeviceVerification] = useState(false);
  const [legalDocType, setLegalDocType] = useState<'privacy' | 'terms'>('privacy');
  const [checkingApproval, setCheckingApproval] = useState(false);

  // Auto-advance auth steps based on authenticated & profile state
  useEffect(() => {
    if (isAuthenticated) {
      if (!isOnboarded) {
        setCurrentAuthStep('user_info');
      } else if (!isApproved) {
        setCurrentAuthStep('approval_pending');
      } else {
        setCurrentScreen('home');
        setActiveTab('home');
      }
    }
  }, [isAuthenticated, isOnboarded, isApproved]);

  // ─── BIOMETRIC LOCK OVERLAY ────────────────────────
  if (isAppLocked) {
    return <BiometricLockScreen onUnlock={() => setIsAppLocked(false)} />;
  }

  // ─── AUTH & ONBOARDING FLOW ────────────────────────
  if (!isAuthenticated || !isOnboarded || !isApproved) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />

        {currentAuthStep === 'splash' && (
          <SplashScreen onFinish={() => setCurrentAuthStep('onboarding')} />
        )}

        {currentAuthStep === 'onboarding' && (
          <OnboardingSlides
            onNext={() => setCurrentAuthStep('google_auth')}
            onSkip={() => setCurrentAuthStep('google_auth')}
          />
        )}

        {currentAuthStep === 'google_auth' && (
          <ProfileSetup
            onGoogleSignIn={signInWithGoogle}
            onBack={() => setCurrentAuthStep('onboarding')}
            error={authError || (isAdminBlocked ? 'This account has admin access. Please use the web dashboard at callmind.ai' : null)}
          />
        )}

        {currentAuthStep === 'user_info' && (
          <UserInfoCollection
            onComplete={async (data) => {
              await completeOnboarding(data);
              setCurrentAuthStep('join_company');
            }}
            onBack={() => setCurrentAuthStep('google_auth')}
          />
        )}

        {currentAuthStep === 'join_company' && (
          <JoinCompany
            onJoinSuccess={() => setCurrentAuthStep('approval_pending')}
            onBack={() => setCurrentAuthStep('user_info')}
          />
        )}

        {currentAuthStep === 'approval_pending' && (
          <ApprovalPending
            onBackToHome={() => signOut()}
            onCheckStatus={async () => {
              setCheckingApproval(true);
              await refreshProfile();
              setCheckingApproval(false);
            }}
            checkingStatus={checkingApproval}
          />
        )}
      </View>
    );
  }

  // ─── MAIN APP DASHBOARD ───────────────────────────
  const navigateToTab = (tab: BottomTab) => {
    setActiveTab(tab);
    setCurrentScreen(tab as AppScreen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToLeads={() => navigateToTab('leads')}
            onNavigateToCalls={() => setCurrentScreen('call_log')}
            onNavigateToProfile={() => setCurrentScreen('settings')}
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setCurrentScreen('lead_detail');
            }}
          />
        );

      case 'leads':
        return (
          <LeadListScreen
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setCurrentScreen('lead_detail');
            }}
            onBack={() => navigateToTab('home')}
          />
        );

      case 'lead_detail':
        return (
          <LeadDetailScreen
            leadId={selectedLeadId}
            onBack={() => setCurrentScreen('leads')}
            onCall={() => {
              setCallingLeadName('Selected Lead');
              setShowCallingScreen(true);
            }}
          />
        );

      case 'call_log':
        return (
          <CallLogScreen
            onBack={() => navigateToTab('home')}
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setCurrentScreen('lead_detail');
            }}
          />
        );

      case 'dial_pad':
        return (
          <DialPadScreen
            onBack={() => navigateToTab('home')}
            onDial={(number) => {
              setCallingLeadName(number);
              setShowCallingScreen(true);
            }}
          />
        );

      case 'profile_edit':
        return (
          <ProfileEditScreen
            onBack={() => setCurrentScreen('settings')}
            onSave={() => {
              setCurrentScreen('settings');
              toastSuccess('Profile Updated', 'Your profile details have been saved.');
            }}
          />
        );

      case 'ai_insight':
        return (
          <AILeadInsightScreen
            leadName="Selected Lead"
            leadScore={88}
            onBack={() => setCurrentScreen('lead_detail')}
            onStartCall={() => {
              setCallingLeadName('Selected Lead');
              setShowCallingScreen(true);
            }}
          />
        );

      case 'notifications':
        return (
          <NotificationCenterScreen
            onBack={() => navigateToTab('home')}
          />
        );

      case 'theme':
        return (
          <ThemeToggleScreen
            onBack={() => setCurrentScreen('settings')}
          />
        );

      case 'about':
        return (
          <AboutAppScreen
            onBack={() => setCurrentScreen('settings')}
            onOpenPrivacy={() => {
              setLegalDocType('privacy');
              setCurrentScreen('privacy_terms');
            }}
            onOpenTerms={() => {
              setLegalDocType('terms');
              setCurrentScreen('privacy_terms');
            }}
          />
        );

      case 'privacy_terms':
        return (
          <PrivacyTermsWebView
            type={legalDocType}
            onBack={() => setCurrentScreen('settings')}
          />
        );

      case 'ai_script':
        return (
          <AITalkScriptScreen
            leadName="Selected Lead"
            productInterest="Product Inquiry"
            onBack={() => setCurrentScreen('lead_detail')}
          />
        );

      case 'callbacks':
        return (
          <CallbacksScreen
            onBack={() => navigateToTab('home')}
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setCurrentScreen('lead_detail');
            }}
          />
        );

      case 'inbox':
        return (
          <InboxScreen
            onBack={() => navigateToTab('home')}
            onSelectAnnouncement={(ann) => {
              setSelectedAnnouncement(ann);
              setCurrentScreen('announcement_detail');
            }}
          />
        );

      case 'announcement_detail':
        return (
          <AnnouncementDetailScreen
            announcement={selectedAnnouncement}
            onBack={() => setCurrentScreen('inbox')}
          />
        );

      case 'performance':
        return (
          <PerformanceScreen onBack={() => navigateToTab('home')} />
        );

      case 'leaderboard':
        return (
          <LeaderboardScreen onBack={() => navigateToTab('performance')} />
        );

      case 'attendance':
        return (
          <AttendanceScreen onBack={() => navigateToTab('home')} />
        );

      case 'target':
        return (
          <TargetScreen onBack={() => navigateToTab('home')} />
        );

      case 'documents':
        return (
          <DocumentsScreen onBack={() => navigateToTab('home')} />
        );

      case 'help':
        return (
          <HelpCenterScreen onBack={() => navigateToTab('home')} />
        );

      case 'quality':
        return (
          <QualityAnalyticsScreen onBack={() => navigateToTab('home')} />
        );

      case 'lead_import':
        return (
          <LeadImportScreen onBack={() => navigateToTab('home')} />
        );

      case 'settings':
        return (
          <SettingsScreen
            onBack={() => navigateToTab('home')}
            onNavigateToEditProfile={() => setCurrentScreen('profile_edit')}
            onLogout={() => {
              setConfirmDialog({
                visible: true,
                type: 'logout',
                title: 'Sign Out?',
                message: 'Are you sure you want to log out of CallMind?',
              });
            }}
          />
        );

      case 'language':
        return (
          <LanguageSelectionScreen
            onSelectLanguage={() => setCurrentScreen('settings')}
            onBack={() => setCurrentScreen('settings')}
          />
        );

      default:
        return null;
    }
  };

  const tabs: { key: BottomTab; label: string; IconComponent: any }[] = [
    { key: 'home', label: 'Home', IconComponent: Home },
    { key: 'leads', label: 'Leads', IconComponent: Users },
    { key: 'callbacks', label: 'Calls', IconComponent: PhoneCall },
    { key: 'performance', label: 'Stats', IconComponent: BarChart3 },
    { key: 'inbox', label: 'Inbox', IconComponent: Inbox },
    { key: 'settings', label: 'Profile', IconComponent: Settings },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Offline Banner */}
      {isOffline && (
        <OfflineSyncBanner isOffline={isOffline} pendingCount={pendingSyncCount} onSyncNow={() => setPendingSyncCount(0)} />
      )}

      {/* Screen Body */}
      <View style={styles.body}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const Icon = tab.IconComponent;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => navigateToTab(tab.key)}
              activeOpacity={0.75}
            >
              <Icon size={20} color={isActive ? '#2563eb' : '#64748b'} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Overlays */}
      {showIncomingCall && (
        <IncomingAssignedCallScreen
          leadName="New Lead Assigned"
          leadPhone="+91 98765 43210"
          leadSource="Meta Ads"
          aiScore={92}
          onAccept={() => {
            setShowIncomingCall(false);
            setCallingLeadName('New Lead');
            setShowActiveCall(true);
          }}
          onDecline={() => setShowIncomingCall(false)}
        />
      )}

      {showCallingScreen && (
        <CallingScreen
          leadName={callingLeadName || 'Lead'}
          leadPhone="+91 98765 43210"
          sim="SIM 1"
          onCallConnected={() => {
            setShowCallingScreen(false);
            setShowActiveCall(true);
          }}
          onCallFailed={() => {
            setShowCallingScreen(false);
            setShowFeedback(true);
          }}
          onCancel={() => setShowCallingScreen(false)}
        />
      )}

      {showActiveCall && (
        <ActiveCallOverlay
          leadName={callingLeadName || 'Lead'}
          leadPhone="+91 98765 43210"
          sim="SIM 1"
          onEndCall={() => {
            setShowActiveCall(false);
            setShowFeedback(true);
          }}
          onOpenScript={() => setCurrentScreen('ai_script')}
        />
      )}

      {showFeedback && (
        <PostCallFeedbackSheet
          leadName={callingLeadName || 'Lead'}
          onSubmit={() => {
            setShowFeedback(false);
            toastSuccess('Feedback Saved', 'Call disposition logged successfully.');
          }}
          onDismiss={() => setShowFeedback(false)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          visible={confirmDialog.visible}
          type={confirmDialog.type}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Sign Out"
          onConfirm={async () => {
            setConfirmDialog(null);
            await signOut();
            setCurrentAuthStep('google_auth');
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <ToastContainer />
    </View>
  );
}

export default function App() {
  return (
    <MobileAuthProvider>
      <MainAppContent />
    </MobileAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
