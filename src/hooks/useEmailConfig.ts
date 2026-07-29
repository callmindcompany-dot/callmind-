import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { EmailConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseEmailConfigParams {
  initialConfig: EmailConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * useEmailConfig
 *
 * Local form state for corporate SMTP / IMAP configuration.
 */
export function useEmailConfig({ initialConfig, saveMutation }: UseEmailConfigParams) {
  const [smtpServer, setSmtpServer] = useState(initialConfig.smtpServer);
  const [smtpPort, setSmtpPort] = useState(initialConfig.smtpPort);
  const [smtpUser, setSmtpUser] = useState(initialConfig.smtpUser);
  const [smtpPass, setSmtpPass] = useState(initialConfig.smtpPass);
  const [showPass, setShowPass] = useState(false);
  const [imapServer, setImapServer] = useState(initialConfig.imapServer);
  const [imapPort, setImapPort] = useState(initialConfig.imapPort);

  const syncFromSettings = useCallback((config: EmailConfig) => {
    setSmtpServer(config.smtpServer);
    setSmtpPort(config.smtpPort);
    setSmtpUser(config.smtpUser);
    setSmtpPass(config.smtpPass);
    setImapServer(config.imapServer);
    setImapPort(config.imapPort);
  }, []);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        email_config: {
          smtpServer: smtpServer.trim(),
          smtpPort: smtpPort.trim(),
          smtpUser: smtpUser.trim(),
          smtpPass: smtpPass.trim(),
          imapServer: imapServer.trim(),
          imapPort: imapPort.trim(),
        },
      },
      {
        onSuccess: () => toast.success('🎉 SMTP / IMAP parameters committed.'),
      }
    );
  }, [saveMutation, smtpServer, smtpPort, smtpUser, smtpPass, imapServer, imapPort]);

  return {
    smtpServer, setSmtpServer,
    smtpPort, setSmtpPort,
    smtpUser, setSmtpUser,
    smtpPass, setSmtpPass,
    showPass, setShowPass,
    imapServer, setImapServer,
    imapPort, setImapPort,
    saveConfig,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
