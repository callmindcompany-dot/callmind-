import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Follow-up reminders on the phone.
 *
 * The app had none. POST_NOTIFICATIONS was declared in app.json and nothing
 * ever used it, so a follow-up scheduled for 3pm sat in the database and the
 * agent learned about it only by opening the app and looking — which is the
 * one thing a reminder exists to avoid.
 *
 * The assertions here are about the parts that are easy to get subtly wrong
 * and hard to notice: syncing against a failed fetch would cancel every
 * reminder the agent has; leaving them scheduled at sign-out sends the next
 * user of the phone to call the previous agent's leads.
 */

const MOBILE = path.join(process.cwd(), 'mobile');
const code = (p: string) =>
  fs
    .readFileSync(path.join(MOBILE, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('mobile follow-up reminders', () => {
  const service = code('src/services/reminderService.ts');
  const app = code('App.tsx');

  it('uses the API that this version of expo-notifications has', () => {
    // The SDK 57 docs show shouldShowBanner/shouldShowList and a
    // SchedulableTriggerInputTypes enum. expo-notifications 0.28, which is what
    // is installed, has neither: the handler takes shouldShowAlert and a date
    // trigger is { date }. Writing to the newer docs would have compiled and
    // then done nothing at runtime.
    expect(service).toContain('shouldShowAlert');
    expect(service).not.toContain('shouldShowBanner');
    expect(service).not.toContain('SchedulableTriggerInputTypes');
  });

  it('creates an Android channel before scheduling anything', () => {
    // Android 8+ silently drops a notification with no channel.
    expect(service).toContain('setNotificationChannelAsync');
  });

  it('does not re-prompt after the user has refused', () => {
    expect(service).toContain('canAskAgain');
  });

  it('cancels reminders for follow-ups that moved or were completed', () => {
    // The stored key includes the time, so a rescheduled follow-up produces a
    // new key and the old reminder is cancelled rather than firing at a time
    // nobody chose any more.
    expect(service).toMatch(/\$\{cb\.id\}@\$\{cb\.reminderDate\}/);
    expect(service).toContain('cancelScheduledNotificationAsync');
  });

  it('never syncs against a failed fetch', () => {
    // sync() with an empty list cancels everything. Doing that because a query
    // failed would wipe the agent's reminders for the day.
    expect(app).toMatch(/cbsR\.status === 'fulfilled'[\s\S]{0,120}reminderService\.sync/);
  });

  it('clears reminders when the agent signs out', () => {
    // Reminders live on the device, not the account.
    expect(app).toMatch(/reminderService\.clearAll\(\)[\s\S]{0,80}signOut\(\)/);
  });

  it('declares the notification permission and plugin', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(MOBILE, 'app.json'), 'utf8'));
    const permissions: string[] = appJson.expo?.android?.permissions ?? [];
    const plugins = (appJson.expo?.plugins ?? []).map((p: unknown) => (Array.isArray(p) ? p[0] : p));

    expect(permissions).toContain('POST_NOTIFICATIONS');
    expect(plugins).toContain('expo-notifications');
  });
});
