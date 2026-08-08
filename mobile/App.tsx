import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Linking, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Home, Users, PhoneCall, Inbox, BarChart3, Settings, Grid } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';

// Services & Context
import { MobileAuthProvider, useMobileAuth } from './src/services/AuthContext';
import { leadService } from './src/services/leadService';
import { callService } from './src/services/callService';
import { syncService } from './src/services/sync';
import { attendanceService, FormattedAttendanceDay } from './src/services/attendanceService';
import { targetService, TelecallerStats } from './src/services/targetService';
import { callLogService } from './src/services/callLogService';
import { callbackService } from './src/services/callbackService';
import { appLockService, IDLE_LOCK_MS } from './src/services/appLockService';
import { reminderService } from './src/services/reminderService';
import { orderQueue } from './src/services/priorityQueue';
import * as Notifications from 'expo-notifications';
import { LeadItem } from './src/screens/LeadListScreen';
import { CallLogItem } from './src/screens/54_CallLogScreen';
import { CallbackItem } from './src/screens/CallbacksScreen';

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
import { PostCallFeedbackSheet, type PostCallFeedback } from './src/screens/PostCallFeedbackSheet';
import { CallbacksScreen } from './src/screens/CallbacksScreen';
import { PerformanceScreen } from './src/screens/PerformanceScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SubscriptionLockScreen } from './src/screens/SubscriptionLockScreen';

// Phase 3 Screens & Overlays
import { AITalkScriptScreen } from './src/screens/67_AITalkScriptScreen';
import { InboxScreen, Announcement } from './src/screens/59_InboxScreen';
import { AnnouncementDetailScreen } from './src/screens/AnnouncementDetailScreen';
import { VoiceNotesModal } from './src/screens/68_VoiceNotesModal';

// Phase 4 Screens
import { AppPermissionsScreen } from './src/screens/11_AppPermissionsScreen';
import { LanguageSelectionScreen } from './src/screens/10_LanguageSelectionScreen';
import { BiometricLockScreen } from './src/screens/86_BiometricLockScreen';
import { SetPinScreen } from './src/screens/87_SetPinScreen';
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
import type { LegalSlug } from './src/config/legal';
import { useLegalAcceptance } from './src/services/useLegalAcceptance';
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
  | 'set_pin'
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

const formatElapsedDuration = (startedAt: number): string => {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

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
  // When the app was last backgrounded, so we can tell a glance at a
  // notification from a phone left on a desk.
  const backgroundedAtRef = useRef<number | null>(null);
  const [currentAuthStep, setCurrentAuthStep] = useState<AuthStep>('splash');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [activeTab, setActiveTab] = useState<BottomTab>('home');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Overlays & Offline
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
  const [callDuration, setCallDuration] = useState('00:00');
  const dialerStartedAtRef = useRef<number | null>(null);
  const awaitingDialerReturnRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // Priority 2 Overlays & Modals
  const [showCallCompleted, setShowCallCompleted] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; type: 'logout' | 'delete' | 'reassign'; title: string; message: string } | null>(null);

  // Priority 3 Overlays & States
  const [showDeviceVerification, setShowDeviceVerification] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalSlug>('privacy');
  const [checkingApproval, setCheckingApproval] = useState(false);

  // Real Database Leads State
  const [leads, setLeads] = useState<LeadItem[]>([]);

  // Call order, not import order.
  //
  // The list came back ordered by created_at descending, so the newest lead
  // sat at the top and the priority the agent had set was shown as a chip and
  // otherwise ignored. A lead whose follow-up is already due comes first;
  // after that it is the agent's own priority, oldest first within each band.
  const dueLeadIds = useMemo(
    () => new Set(callbacks.filter((c) => c.isOverdue && c.leadId).map((c) => c.leadId as string)),
    [callbacks],
  );
  const queuedLeads = useMemo(() => orderQueue(leads, { dueLeadIds }), [leads, dueLeadIds]);
  const [refreshingLeads, setRefreshingLeads] = useState(false);
  const [activeCallingLead, setActiveCallingLead] = useState<LeadItem | null>(null);

  // Phase 2 Database State (Call Logs, Callbacks, Attendance, Targets)
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<FormattedAttendanceDay[]>([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [lastPunchTime, setLastPunchTime] = useState('09:00 AM');
  const [telecallerStats, setTelecallerStats] = useState<TelecallerStats>({
    totalCalls: 0,
    connectedCalls: 0,
    interestedLeads: 0,
    conversions: 0,
    callTarget: 100,
    callTargetProgress: 0,
  });
  const [refreshingSecondary, setRefreshingSecondary] = useState(false);

  // Function to load assigned leads for logged-in telecaller
  const loadLeads = useCallback(async () => {
    if (!profile?.companyId || !profile?.uid) return;
    setRefreshingLeads(true);
    const fetched = await leadService.fetchAssignedLeads(profile.companyId, profile.uid);
    setLeads(fetched);
    setRefreshingLeads(false);
  }, [profile?.companyId, profile?.uid]);

  // Function to load secondary data (Call Logs, Callbacks, Attendance, Targets)
  const loadSecondaryData = useCallback(async () => {
    if (!profile?.companyId || !profile?.uid) return;
    setRefreshingSecondary(true);

    // allSettled, not all. These five are independent, and one failing should
    // not blank the other four -- but a failure must be visible rather than
    // showing as an empty list, which is how "no callbacks today" used to mean
    // "the query broke".
    const [logsR, cbsR, attHistR, punchR, statsR] = await Promise.allSettled([
      callLogService.fetchCallLogs(profile.companyId, profile.uid),
      callbackService.fetchCallbacks(profile.companyId, profile.email ?? ''),
      attendanceService.fetchAttendanceHistory(profile.companyId, profile.uid),
      attendanceService.getLatestPunchStatus(profile.companyId, profile.uid),
      targetService.fetchTelecallerStats(profile.companyId, profile.uid),
    ]);

    const failed: string[] = [];
    const take = <T,>(r: PromiseSettledResult<T>, label: string, fallback: T): T => {
      if (r.status === 'fulfilled') return r.value;
      console.error(`[loadSecondaryData] ${label}:`, r.reason);
      failed.push(label);
      return fallback;
    };

    setCallLogs(take(logsR, 'call log', []));
    setCallbacks(take(cbsR, 'follow-ups', []));
    setAttendanceHistory(take(attHistR, 'attendance', []));
    const punchStatus = take(punchR, 'punch status', { isPunchedIn: false, lastPunchTime: null } as any);
    setIsPunchedIn(punchStatus.isPunchedIn);
    if (punchStatus.lastPunchTime) {
      setLastPunchTime(punchStatus.lastPunchTime);
    }
    setTelecallerStats(take(statsR, 'performance', null as any));

    if (failed.length) {
      toastError('Could not refresh everything', `${failed.join(', ')} did not load. Pull to retry.`);
    }

    // Match the device's scheduled reminders to the follow-ups we just read.
    // Only when the fetch succeeded -- syncing against an empty list because a
    // query failed would cancel every reminder the agent has.
    if (cbsR.status === 'fulfilled') {
      void reminderService.sync(cbsR.value);
    }

    setRefreshingSecondary(false);
  }, [profile?.companyId, profile?.uid]);

  // Handle punch in
  const handlePunchIn = async () => {
    if (!profile?.companyId || !profile?.uid) return;
    const userName = profile.name || 'Telecaller';
    const ok = await attendanceService.punchIn(profile.companyId, profile.uid, userName);
    if (ok) {
      toastSuccess('Punched In', 'Attendance record logged successfully.');
      loadSecondaryData();
    } else {
      toastError('Error', 'Failed to log punch in.');
    }
  };

  // Handle punch out
  const handlePunchOut = async () => {
    if (!profile?.companyId || !profile?.uid) return;
    const userName = profile.name || 'Telecaller';
    const ok = await attendanceService.punchOut(profile.companyId, profile.uid, userName);
    if (ok) {
      toastInfo('Punched Out', 'Attendance punch out logged.');
      loadSecondaryData();
    } else {
      toastError('Error', 'Failed to log punch out.');
    }
  };

  // Load leads & secondary data on profile ready
  useEffect(() => {
    if (isAuthenticated && profile?.companyId && profile?.uid) {
      loadLeads();
      loadSecondaryData();
      syncService.getPendingCount().then((count) => setPendingSyncCount(count));
    }
  }, [isAuthenticated, profile?.companyId, profile?.uid, loadLeads, loadSecondaryData]);

  // Subscribe to real network status changes via NetInfo
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);

      if (!offline) {
        // Automatically sync pending offline logs when internet is restored
        syncService.syncPendingLogs().then(async ({ successCount }) => {
          const remaining = await syncService.getPendingCount();
          setPendingSyncCount(remaining);
          if (successCount > 0) {
            toastSuccess('Sync Complete', `Synced ${successCount} offline call logs to cloud.`);
            loadLeads();
          }
        });
      }
    });

    return () => unsubscribe();
  }, [loadLeads]);

  // Open the device's native dialer. This does not read call history or record audio.
  const handleCallLead = async (lead: LeadItem) => {
    const phone = lead.phone.replace(/[^\d+]/g, '');
    if (!phone) {
      toastError('Invalid phone number', 'This lead does not have a valid phone number.');
      return;
    }

    setActiveCallingLead(lead);
    setCallingLeadName(lead.name);
    setCallDuration('00:00');

    try {
      const dialerUrl = `tel:${phone}`;
      if (!(await Linking.canOpenURL(dialerUrl))) {
        toastError('Dialer unavailable', 'No phone dialer is available on this device.');
        return;
      }

      dialerStartedAtRef.current = Date.now();
      awaitingDialerReturnRef.current = true;
      await Linking.openURL(dialerUrl);
    } catch {
      awaitingDialerReturnRef.current = false;
      dialerStartedAtRef.current = null;
      toastError('Could not start call', 'Please try again or call the lead manually.');
    }
  };

  // Handle post-call feedback submit
  const handleFeedbackSubmit = async (feedback: PostCallFeedback) => {
    setShowFeedback(false);
    if (!profile?.companyId || !profile?.uid) {
      toastError('Error', 'Missing user profile or company session.');
      return;
    }

    const res = await callService.logCallOutcome({
      companyId: profile.companyId,
      agentId: profile.uid,
      leadId: activeCallingLead?.id,
      leadName: activeCallingLead?.name || callingLeadName || 'Lead',
      // No placeholder. This wrote '+91 98765 43210' into calls.phone whenever
      // the lead had no number, producing a call record to a number nobody had
      // dialled -- the same invented number schedulerService used on the web.
      phone: activeCallingLead?.phone ?? '',
      duration: callDuration,
      outcome: feedback.outcome,
      interest: feedback.interest,
      notes: feedback.notes,
    });

    // Schedule the follow-up, if the agent chose one. Written to `callbacks`
    // so it shows on the web too, and so the reminder has something to fire on.
    if (feedback.followUpAt && activeCallingLead?.id) {
      try {
        await callbackService.scheduleCallback({
          companyId: profile.companyId,
          leadId: activeCallingLead.id,
          agentEmail: profile.email ?? '',
          reminderDate: feedback.followUpAt,
          notes: feedback.notes || null,
        });
        toastSuccess('Follow-up set', new Date(feedback.followUpAt).toLocaleString('en-IN'));
      } catch (e) {
        // Told, not swallowed. An agent who thinks a follow-up is booked and
        // finds nothing there has lost the lead, not just the reminder.
        toastError('Follow-up not saved', e instanceof Error ? e.message : 'Please set it again from Callbacks.');
      }
    }

    const pending = await syncService.getPendingCount();
    setPendingSyncCount(pending);

    if (res.queued) {
      toastInfo('Saved Offline', 'Call logged locally in queue. Will sync when connection returns.');
    } else {
      toastSuccess('Feedback Saved', 'Call disposition logged successfully.');
      loadLeads();
      loadSecondaryData();
    }
  };

  // Display the feedback sheet when the agent returns from the system dialer.
  // This is dialer elapsed time, not carrier-verified call duration.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returnedToApp =
        awaitingDialerReturnRef.current &&
        (appStateRef.current === 'inactive' || appStateRef.current === 'background') &&
        nextState === 'active';

      if (returnedToApp) {
        setCallDuration(dialerStartedAtRef.current ? formatElapsedDuration(dialerStartedAtRef.current) : '00:00');
        awaitingDialerReturnRef.current = false;
        dialerStartedAtRef.current = null;
        setShowFeedback(true);
      }

      // Idle lock.
      //
      // isAppLocked started false and nothing ever set it true, so the lock
      // screen could not be reached in normal use — which is the only reason
      // its hardcoded '1234' did no harm.
      //
      // Leaving for the dialer does not count. A telecaller is in and out of
      // the phone app all day, and locking them out between calls would make
      // the feature something they turn off.
      if (nextState === 'background' || nextState === 'inactive') {
        if (!awaitingDialerReturnRef.current) backgroundedAtRef.current = Date.now();
      } else if (nextState === 'active' && backgroundedAtRef.current) {
        const away = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (away >= IDLE_LOCK_MS) {
          void appLockService.isLockEnabled().then((on) => { if (on) setIsAppLocked(true); });
        }
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // Reminder permission, once the agent is actually using the app rather than
  // at the splash screen — a permission prompt before anything is on screen is
  // the one people refuse.
  useEffect(() => {
    if (isAuthenticated && isApproved) void reminderService.setUp();
  }, [isAuthenticated, isApproved]);

  // Tapping a reminder opens the follow-up list.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { screen?: string };
      if (data?.screen === 'callbacks') {
        setActiveTab('callbacks' as BottomTab);
        setCurrentScreen('callbacks');
      }
    });
    return () => sub.remove();
  }, []);

  // Lock on launch, if the agent turned it on. Checked once, on mount.
  useEffect(() => {
    void appLockService.isLockEnabled().then((on) => { if (on) setIsAppLocked(true); });
  }, []);

  // Has this user accepted the current version of each document?
  //
  // The web app checks this on sign-in; mobile did not check at all, and its
  // accept button wrote nothing. Fails open, so a failed check does not lock a
  // telecaller out of their leads.
  const legal = useLegalAcceptance(isAuthenticated ? profile?.uid : null);

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

  // Legal acceptance is prompted, not enforced.
  //
  // A first version of this returned the documents screen instead of the app
  // until the user accepted, with no way past it — a telecaller who declined
  // would have been stuck on a page with a back button that re-showed it. The
  // web app shows a dismissible banner over the dashboard rather than blocking,
  // so mobile matches: the banner below opens the documents, and the screen
  // records the acceptance.

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
    const selectedLead = leads.find((l) => l.id === selectedLeadId);

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
            onCallLead={handleCallLead}
            recentLeads={leads}
            refreshing={refreshingLeads}
            onRefresh={loadLeads}
          />
        );

      case 'leads':
        return (
          <LeadListScreen
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setCurrentScreen('lead_detail');
            }}
            onCallLead={handleCallLead}
            onBack={() => navigateToTab('home')}
            leads={queuedLeads}
            refreshing={refreshingLeads}
            onRefresh={loadLeads}
          />
        );

      case 'lead_detail':
        return (
          <LeadDetailScreen
            leadId={selectedLeadId}
            lead={selectedLead}
            onBack={() => setCurrentScreen('leads')}
            onCall={(phone) => {
              if (selectedLead) {
                handleCallLead(selectedLead);
              } else {
                setCallingLeadName('Selected Lead');
                setShowCallingScreen(true);
              }
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
            callLogs={callLogs}
            refreshing={refreshingSecondary}
            onRefresh={loadSecondaryData}
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

      case 'set_pin':
        return (
          <SetPinScreen
            onBack={() => setCurrentScreen('settings')}
            onDone={() => {
              toastSuccess('App lock on', 'CallMind will lock after 30 minutes idle.');
              setCurrentScreen('settings');
            }}
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
            onOpenRefund={() => {
              setLegalDocType('refund');
              setCurrentScreen('privacy_terms');
            }}
          />
        );

      case 'privacy_terms':
        return (
          <PrivacyTermsWebView
            type={legalDocType}
            requireAcceptance={legal.needsAcceptance}
            onAccepted={() => legal.recheck()}
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
            onCallLead={(phone, name) => {
              setCallingLeadName(name);
              setShowCallingScreen(true);
            }}
            callbacks={callbacks}
            onReschedule={async (cb) => {
              // Tomorrow at 10, the same default the post-call form offers and
              // the same one schedulerService uses for "Switched Off".
              const until = new Date();
              until.setDate(until.getDate() + 1);
              until.setHours(10, 0, 0, 0);
              try {
                await callbackService.snoozeCallback(cb.id, profile!.companyId!, until);
                toastSuccess('Moved', `Follow-up moved to ${until.toLocaleString('en-IN')}`);
                loadSecondaryData();
              } catch (e) {
                toastError('Could not move it', e instanceof Error ? e.message : 'Please try again.');
              }
            }}
            onComplete={async (cb) => {
              try {
                await callbackService.completeCallback(cb.id, profile!.companyId!);
                toastSuccess('Done', 'Follow-up marked complete.');
                loadSecondaryData();
              } catch (e) {
                toastError('Could not update it', e instanceof Error ? e.message : 'Please try again.');
              }
            }}
            refreshing={refreshingSecondary}
            onRefresh={loadSecondaryData}
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
          <PerformanceScreen
            onBack={() => navigateToTab('home')}
            stats={telecallerStats}
            refreshing={refreshingSecondary}
            onRefresh={loadSecondaryData}
          />
        );

      case 'leaderboard':
        return (
          <LeaderboardScreen onBack={() => navigateToTab('performance')} />
        );

      case 'attendance':
        return (
          <AttendanceScreen
            onBack={() => navigateToTab('home')}
            isPunchedIn={isPunchedIn}
            lastPunchTime={lastPunchTime}
            history={attendanceHistory}
            onPunchIn={handlePunchIn}
            onPunchOut={handlePunchOut}
            refreshing={refreshingSecondary}
            onRefresh={loadSecondaryData}
          />
        );

      case 'target':
        return (
          <TargetScreen
            onBack={() => navigateToTab('home')}
            stats={telecallerStats}
            refreshing={refreshingSecondary}
            onRefresh={loadSecondaryData}
          />
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
            onSetUpPin={() => setCurrentScreen('set_pin')}
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
      {(isOffline || pendingSyncCount > 0) && (
        <OfflineSyncBanner
          isOffline={isOffline}
          pendingCount={pendingSyncCount}
          onSyncNow={async () => {
            const { successCount } = await syncService.syncPendingLogs();
            const count = await syncService.getPendingCount();
            setPendingSyncCount(count);
            if (successCount > 0) {
              toastSuccess('Sync Complete', `Synced ${successCount} offline call logs.`);
              loadLeads();
            }
          }}
        />
      )}

      {/* Updated documents, prompted rather than enforced — the web app shows
          the same thing as a dismissible banner over the dashboard. Hidden while
          the legal screen is already open. */}
      {legal.needsAcceptance && !legal.checking && currentScreen !== 'privacy_terms' && (
        <TouchableOpacity
          style={styles.legalBanner}
          onPress={() => {
            setLegalDocType('privacy');
            setCurrentScreen('privacy_terms');
          }}
        >
          <Text style={styles.legalBannerText}>
            Our privacy policy and terms have been updated. Tap to review and accept.
          </Text>
        </TouchableOpacity>
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
      {/* IncomingAssignedCallScreen was rendered here with every value invented:
          leadName "New Lead Assigned", phone "+91 98765 43210", source
          "Meta Ads", aiScore 92. It was also unreachable -- showIncomingCall
          started false and nothing ever set it true. It belongs to the push
          notification path, which does not exist yet, so it renders nothing
          rather than a demo. */}

      {showCallingScreen && (
        <CallingScreen
          leadName={callingLeadName || activeCallingLead?.name || 'Lead'}
          leadPhone={activeCallingLead?.phone || 'No number on file'}
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
          leadName={callingLeadName || activeCallingLead?.name || 'Lead'}
          leadPhone={activeCallingLead?.phone || 'No number on file'}
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
          leadName={callingLeadName || activeCallingLead?.name || 'Lead'}
          callDuration={callDuration}
          onSubmit={handleFeedbackSubmit}
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
            // Reminders are scheduled on the device, not the account. Without
            // this the next person to sign in on the same phone gets alerts to
            // call the previous agent's leads.
            await reminderService.clearAll();
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
  legalBanner: {
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  legalBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
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
