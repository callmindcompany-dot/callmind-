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
import { orderQueue, isClosed } from './src/services/priorityQueue';
import { resolveOutcome, describeOutcome } from './src/services/callOutcome';
import { planStatusService, type PlanStatus } from './src/services/planStatusService';
import { agentStatusService } from './src/services/agentStatusService';
import { GlobalSearchScreen } from './src/screens/GlobalSearchScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FilterState } from './src/screens/128_LeadFilterSheet';
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
import { DeleteAccountScreen } from './src/screens/DeleteAccountScreen';

// Phase 3 Screens & Overlays
import { AITalkScriptScreen } from './src/screens/67_AITalkScriptScreen';
import { InboxScreen, Announcement } from './src/screens/59_InboxScreen';
import { AnnouncementDetailScreen } from './src/screens/AnnouncementDetailScreen';

// Phase 4 Screens
import { AppPermissionsScreen } from './src/screens/11_AppPermissionsScreen';
import { LanguageSelectionScreen } from './src/screens/10_LanguageSelectionScreen';
import { BiometricLockScreen } from './src/screens/86_BiometricLockScreen';
import { SetPinScreen } from './src/screens/87_SetPinScreen';
import { OfflineSyncBanner } from './src/screens/91_OfflineSyncBanner';

// Priority 1 Critical Screens
import { CallLogScreen } from './src/screens/54_CallLogScreen';
import { DialPadScreen } from './src/screens/40_DialPadScreen';
import { ScheduleCallbackSheet } from './src/screens/131_ScheduleCallbackSheet';
import { LeadFilterSheet } from './src/screens/128_LeadFilterSheet';
import { ToastContainer, toastSuccess, toastError, toastInfo } from './src/components/ToastNotification';

// Priority 2 Screens
import { ProfileEditScreen } from './src/screens/08_ProfileEditScreen';
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
  | 'lead_search'
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
  | 'lead_import'
  | 'delete_account';

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
  // Shown after the post-call form, by 42_CallCompletedCard. That file existed
  // and was imported and never rendered, so nothing ever told the agent what
  // had become of the lead they just called.
  const [callResult, setCallResult] = useState<{
    leadName: string;
    leadPhone: string;
    duration: string;
    summary: string;
    closed: boolean;
  } | null>(null);
  // The database enforces the plan; this is how the agent finds out why.
  // Previously `isSubscriptionLocked` was declared here and never read, and
  // SubscriptionLockScreen was imported and never rendered -- so a telecaller
  // in a lapsed company would have watched writes fail with a Postgres error
  // and no explanation.
  const [planStatus, setPlanStatus] = useState<PlanStatus>({
    locked: false, companyName: '', expiryDate: null,
  });
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Calling Flow States
  const [showScheduleCallback, setShowScheduleCallback] = useState(false);
  const [showLeadFilter, setShowLeadFilter] = useState(false);
  const [callingLeadName, setCallingLeadName] = useState('');
  const [callDuration, setCallDuration] = useState('00:00');
  const dialerStartedAtRef = useRef<number | null>(null);
  const awaitingDialerReturnRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // showCallCompleted and showDeviceVerification were declared here and never
  // read. The card is driven by `callResult` above, which carries what it needs
  // to say; the device modal is gone with the screens that had no table behind
  // them.
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; type: 'logout' | 'delete' | 'reassign'; title: string; message: string } | null>(null);
  const [legalDocType, setLegalDocType] = useState<LegalSlug>('privacy');
  const [checkingApproval, setCheckingApproval] = useState(false);

  // Real Database Leads State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [showLeadFilters, setShowLeadFilters] = useState(false);
  // Shown once, after approval. AsyncStorage rather than state so it does not
  // reappear on every launch.
  const [permissionsSeen, setPermissionsSeen] = useState<boolean | null>(null);
  const [leadFilters, setLeadFilters] = useState<FilterState | null>(null);

  const [refreshingLeads, setRefreshingLeads] = useState(false);
  const [activeCallingLead, setActiveCallingLead] = useState<LeadItem | null>(null);

  // Phase 2 Database State (Call Logs, Callbacks, Attendance, Targets)
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([]);

  // Call order, not import order.
  //
  // The list came back ordered by created_at descending, so the newest lead
  // sat at the top and the priority the agent had set was shown as a chip and
  // otherwise ignored. A lead whose follow-up is already due comes first;
  // after that it is the agent's own priority, oldest first within each band.
  //
  // This has to sit below the `callbacks` declaration, not above it. It was
  // above, and the dependency array is evaluated the moment useMemo is called,
  // so the first render threw "Cannot access 'callbacks' before initialization"
  // -- the app could not start. tsc never caught it because tsconfig set
  // moduleResolution to node10, which TypeScript 6 refuses outright, so the
  // mobile typecheck had not run at all.
  const dueLeadIds = useMemo(
    () => new Set(callbacks.filter((c) => c.isOverdue && c.leadId).map((c) => c.leadId as string)),
    [callbacks],
  );
  const queuedLeads = useMemo(() => {
    const f = leadFilters;
    const filtered = !f
      ? leads
      : leads.filter((l) => {
          if (f.status.length && !f.status.includes(l.status ?? '')) return false;
          if (f.source.length && !f.source.includes(l.city ?? '')) return false;
          if (f.tag.length && !f.tag.includes(l.tag ?? '')) return false;
          return true;
        });

    // A finished lead leaves the queue rather than sitting at the bottom of it.
    //
    // orderQueue already sorted closed leads last, but last is still on the
    // list -- an agent working a book of two hundred met every rejection they
    // had ever recorded before they ran out of leads. They are not hidden: ask
    // for a closed status in the filter and they come back, which is why this
    // checks the filter rather than dropping them unconditionally.
    const askedForClosed = (f?.status ?? []).some((s) =>
      isClosed({ id: '', name: '', phone: '', city: '', tag: '', time: '',
                 color: '', bgColor: '', initials: '', status: s }),
    );
    const working = askedForClosed ? filtered : filtered.filter((l) => !isClosed(l));

    return orderQueue(working, { dueLeadIds });
  }, [leads, leadFilters, dueLeadIds]);

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

  /** What the admin's board should call this agent. */
  const agentDisplayName =
    profile?.name || user?.user_metadata?.full_name || profile?.email || 'Telecaller';

  /**
   * Presence, from things the app already knows.
   *
   * Nothing had ever written to agent_status, so every agent showed as offline
   * on the admin's live monitor for as long as the table has existed. There is
   * no manual toggle: signed in and working, handed off to the dialler, and
   * signed out are all observable without asking, and a control the telecaller
   * has to remember to set is wrong by mid-morning.
   */
  useEffect(() => {
    if (!profile?.companyId || !profile?.uid || !isApproved) return;
    void agentStatusService.set(profile.companyId, profile.uid, agentDisplayName, 'active');
  }, [profile?.companyId, profile?.uid, isApproved, agentDisplayName]);

  // Function to load assigned leads for logged-in telecaller
  const loadLeads = useCallback(async () => {
    if (!profile?.companyId || !profile?.uid) return;
    setRefreshingLeads(true);
    try {
      const fetched = await leadService.fetchAssignedLeads(profile.companyId, profile.uid);
      setLeads(fetched);
    } catch (e) {
      // fetchAssignedLeads throws now rather than returning [] -- an empty list
      // reads as "no leads today". Keep whatever is already on screen and say
      // the refresh failed, instead of blanking it.
      toastError('Could not load leads', e instanceof Error ? e.message : 'Pull down to retry.');
    } finally {
      // In a finally, or a thrown error leaves the spinner turning for ever.
      setRefreshingLeads(false);
    }
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

  /**
   * The only way this app places a call.
   *
   * It opens the device's native dialler. It does not read the call log and it
   * does not record audio, which is what the privacy policy says and what the
   * permission screen lists.
   *
   * Everything that offers a Call button now comes through here. There used to
   * be a second path: `setShowCallingScreen(true)` put up 38_CallingScreen,
   * which showed "Calling..." and then fired onCallConnected off a three-second
   * setTimeout, handing over to 39_ActiveCallOverlay and its running timer and
   * "Connected via SIM 1". Nothing in that path dialled anything -- there was no
   * Linking call in it at all. It was reachable from the Callbacks list, the
   * dial pad, the AI insight screen and lead detail, so a telecaller pressing
   * Call Now on a follow-up watched a call connect, watched a timer run, and was
   * then asked how the call had gone. No call had been made.
   *
   * `lead` is optional because the dial pad has a number and no lead behind it.
   * Without one there is nothing to move afterwards, which the post-call handler
   * already accounts for.
   */
  const dialNumber = async (rawPhone: string, displayName: string, lead?: LeadItem | null) => {
    const phone = (rawPhone ?? '').replace(/[^\d+]/g, '');
    if (!phone) {
      toastError('Invalid phone number', 'There is no valid number to call.');
      return;
    }

    setActiveCallingLead(lead ?? null);
    setCallingLeadName(displayName);
    setCallDuration('00:00');

    try {
      const dialerUrl = `tel:${phone}`;
      if (!(await Linking.canOpenURL(dialerUrl))) {
        toastError('Dialer unavailable', 'No phone dialer is available on this device.');
        return;
      }

      dialerStartedAtRef.current = Date.now();
      awaitingDialerReturnRef.current = true;
      void agentStatusService.set(profile?.companyId, profile?.uid, agentDisplayName, 'on_call');
      await Linking.openURL(dialerUrl);
    } catch {
      awaitingDialerReturnRef.current = false;
      dialerStartedAtRef.current = null;
      toastError('Could not start call', 'Please try again or call the lead manually.');
    }
  };

  const handleCallLead = (lead: LeadItem) => dialNumber(lead.phone, lead.name, lead);

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

    // Move the lead.
    //
    // This is what was missing. The two writes above recorded the call and the
    // follow-up; the lead itself was never touched, so its status stayed 'New'
    // and it held its place in the queue. An agent worked down the list past
    // people they had already spoken to, and a day's work left no mark on the
    // screen they were looking at.
    const resolved = resolveOutcome(feedback.outcome, feedback.interest);
    let leadMoved = true;
    if (activeCallingLead?.id) {
      try {
        await leadService.recordCallOutcome(
          profile.companyId,
          profile.uid,
          activeCallingLead.id,
          resolved.status,
          activeCallingLead.status,
        );
      } catch (e) {
        leadMoved = false;
        toastError(
          'Lead not updated',
          e instanceof Error ? e.message : 'The call was logged but the lead still shows its old status.',
        );
      }
    }

    const pending = await syncService.getPendingCount();
    setPendingSyncCount(pending);

    if (res.queued) {
      toastInfo('Saved Offline', 'Call logged locally in queue. Will sync when connection returns.');
    } else if (leadMoved) {
      loadLeads();
      loadSecondaryData();
    }

    // Says where the lead went. Replaces a toast that only confirmed the form
    // had been submitted, which was never the agent's question.
    setCallResult({
      leadName: activeCallingLead?.name || callingLeadName || 'Lead',
      leadPhone: activeCallingLead?.phone || 'No number on file',
      duration: callDuration,
      summary: describeOutcome(resolved, feedback.followUpAt),
      closed: resolved.closes,
    });
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
        // Off the call. The admin's board was showing everyone offline
        // permanently because nothing had ever written to agent_status.
        void agentStatusService.set(profile?.companyId, profile?.uid, agentDisplayName, 'active');
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

  useEffect(() => {
    if (!isAuthenticated || !isApproved) return;
    void planStatusService.check(profile?.companyId).then(setPlanStatus);
  }, [isAuthenticated, isApproved, profile?.companyId]);

  useEffect(() => {
    void AsyncStorage.getItem('callmind.permissionsSeen').then((v) => setPermissionsSeen(v === 'true'));
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

  // ─── PERMISSIONS ──────────────────────────────────
  // Once, after approval, before the app. AppPermissionsScreen was imported and
  // never rendered, so the agent met the location prompt for the first time at
  // the moment they tried to punch in.
  if (isAuthenticated && isOnboarded && isApproved && permissionsSeen === false) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <AppPermissionsScreen
          onContinue={async () => {
            await AsyncStorage.setItem('callmind.permissionsSeen', 'true');
            setPermissionsSeen(true);
          }}
        />
      </View>
    );
  }

  // ─── SUBSCRIPTION ─────────────────────────────────
  // A hard stop, unlike the legal notice: the company has stopped paying, and
  // there is nothing useful the agent can do until an admin fixes it.
  if (isAuthenticated && isOnboarded && isApproved && planStatus.locked) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <SubscriptionLockScreen
          companyName={planStatus.companyName}
          expiryDate={planStatus.expiryDate ?? 'Not recorded'}
          onContactAdmin={() => {
            toastInfo('Contact your admin', 'They can renew the subscription from the web dashboard.');
          }}
        />
      </View>
    );
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
            onOpenSearch={() => setCurrentScreen('lead_search')}
            onOpenFilters={() => setShowLeadFilters(true)}
            sortLabel={leadFilters ? 'Call order · filtered' : 'Call order'}
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
              // The fallback used to open the fake calling screen, so opening a
              // lead the list had not loaded gave a call that never happened.
              if (selectedLead) handleCallLead(selectedLead);
              else void dialNumber(phone, 'Lead');
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
            // No lead behind a number typed by hand, so nothing moves
            // afterwards -- but the call is now real, which it was not.
            onDial={(number) => void dialNumber(number, number)}
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
              if (selectedLead) handleCallLead(selectedLead);
              else toastError('No lead selected', 'Open a lead first, then call from there.');
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

      case 'lead_search':
        return (
          <GlobalSearchScreen
            onBack={() => setCurrentScreen('leads')}
            onSelectResult={(item) => {
              setSelectedLeadId(item.id);
              setCurrentScreen('lead_detail');
            }}
            onSearch={async (term) => {
              // Searches the leads this agent can see. Row-level security scopes
              // it to their own assignments, so there is nothing to filter here
              // that the database has not already filtered.
              const found = await leadService.searchLeads(profile!.companyId!, term);
              return found.map((l) => ({
                id: l.id,
                module: 'leads' as const,
                title: l.name,
                subtitle: l.phone || l.city || 'Lead',
                badge: l.status ?? undefined,
                actionUrl: `/leads/${l.id}`,
              }));
            }}
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
            // Call Now on a follow-up. This was the worst of the four fake
            // paths: the agent had promised this person a call at this time.
            onCallLead={(phone, name, leadId) =>
              void dialNumber(phone, name, leads.find((l) => l.id === leadId) ?? null)
            }
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
            onOpenAttendance={() => setCurrentScreen('attendance')}
            onOpenPerformance={() => setCurrentScreen('performance')}
            onDeleteAccount={() => setCurrentScreen('delete_account')}
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

      case 'delete_account':
        return (
          <DeleteAccountScreen
            onBack={() => setCurrentScreen('settings')}
            onDeleted={async () => {
              // The rows are already gone; this only tears down the local
              // session so the app does not sit on a token for an account that
              // no longer exists.
              await signOut();
              setCurrentAuthStep('splash');
              setCurrentScreen('home');
            }}
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
      {showLeadFilters && (
        <LeadFilterSheet
          onApply={(f) => {
            setLeadFilters(f);
            setShowLeadFilters(false);
          }}
          onReset={() => {
            setLeadFilters(null);
            setShowLeadFilters(false);
          }}
          onDismiss={() => setShowLeadFilters(false)}
        />
      )}

      {/*
        38_CallingScreen and 39_ActiveCallOverlay used to be rendered here.
        Both are gone.

        They were an in-app calling UI for a product that does not place calls
        in the app: CallMind dials with `tel:` and the system dialler takes over
        the screen, so there is no in-app call state to draw. What they drew
        instead was invented -- a "Calling..." screen that fired
        onCallConnected off a three-second setTimeout whether or not anything
        connected, then a "Connected via SIM 1" overlay with a running timer,
        over a call that had never been placed. `sim` could only ever have been
        made up; `tel:` does not tell the app which SIM the phone chose.
      */}

      {showFeedback && (
        <PostCallFeedbackSheet
          leadName={callingLeadName || activeCallingLead?.name || 'Lead'}
          callDuration={callDuration}
          onSubmit={handleFeedbackSubmit}
          onDismiss={() => setShowFeedback(false)}
        />
      )}

      {/*
        Imported and never rendered until now, so "Set a follow-up" on the
        card below had nothing to open.
      */}
      {showScheduleCallback && (
        <ScheduleCallbackSheet
          leadName={activeCallingLead?.name || callingLeadName || 'Lead'}
          onDismiss={() => setShowScheduleCallback(false)}
          onSchedule={async (isoWhen, note) => {
            setShowScheduleCallback(false);
            if (!profile?.companyId || !activeCallingLead?.id) {
              toastError('Cannot schedule', 'No lead is selected.');
              return;
            }
            try {
              await callbackService.scheduleCallback({
                companyId: profile.companyId,
                leadId: activeCallingLead.id,
                agentEmail: profile.email ?? '',
                reminderDate: isoWhen,
                notes: note || null,
              });
              toastSuccess('Follow-up set', new Date(isoWhen).toLocaleString('en-IN'));
              loadSecondaryData();
            } catch (e) {
              toastError(
                'Follow-up not saved',
                e instanceof Error ? e.message : 'Please set it again from Callbacks.',
              );
            }
          }}
        />
      )}

      {callResult && (
        <CallCompletedCard
          leadName={callResult.leadName}
          leadPhone={callResult.leadPhone}
          duration={callResult.duration}
          summary={callResult.summary}
          closed={callResult.closed}
          onDone={() => {
            setCallResult(null);
            setActiveCallingLead(null);
          }}
          onScheduleCallback={() => {
            setCallResult(null);
            setShowScheduleCallback(true);
          }}
          onLogFeedback={() => {
            setCallResult(null);
            setShowFeedback(true);
          }}
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
            // Before signOut, while the session can still satisfy the policy
            // that scopes this table to the caller's own row.
            await agentStatusService.set(profile?.companyId, profile?.uid, agentDisplayName, 'offline');
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
