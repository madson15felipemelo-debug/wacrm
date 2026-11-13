'use client';

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { SettingsRail } from '@/components/settings/settings-rail';
import { SettingsOverview } from '@/components/settings/settings-overview';
import { ProfileForm } from '@/components/settings/profile-form';
import { SecurityPanel } from '@/components/settings/security-panel';
import { AppearancePanel } from '@/components/settings/appearance-panel';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { OptOutButtonsSettings } from '@/components/settings/opt-out-buttons-settings';
import { QuickRepliesManager } from '@/components/settings/quick-replies-manager';
import { FieldsAndTagsPanel } from '@/components/settings/fields-and-tags-panel';
import { DealsSettings } from '@/components/settings/deals-settings';
import { MembersTab } from '@/components/settings/members-tab';
import { ApiKeysSettings } from '@/components/settings/api-keys-settings';
import {
  DEFAULT_SECTION,
  resolveSection,
  SECTION_META,
  type SettingsSection,
} from '@/components/settings/settings-sections';

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const { defaultCurrency, isOwner, profileLoading } = useAuth();
  const { mode } = useTheme();
  const t = useTranslations('Settings');

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsSection>(() =>
    resolveSection(tabParam),
  );

  // Sync if the URL query param changes externally (e.g. clicking a link in Header/Sidebar)
  useEffect(() => {
    setActiveTab(resolveSection(tabParam));
  }, [tabParam]);

  const section: SettingsSection =
    !profileLoading &&
    !isOwner &&
    SECTION_META[activeTab].group === 'workspace'
      ? DEFAULT_SECTION
      : activeTab;

  // Switch sections immediately on the client without triggering a
  // server RSC round-trip via router.replace (which could hang if the
  // tab was idle and the auth token was mid-refresh).
  const go = (next: SettingsSection) => {
    setActiveTab(next);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', next);
      window.history.replaceState(
        null,
        '',
        `/settings?${params.toString()}`,
      );
    }
  };

  const hints: Partial<Record<SettingsSection, ReactNode>> = useMemo(
    () => ({
      appearance: mode.charAt(0).toUpperCase() + mode.slice(1),
      deals: defaultCurrency,
    }),
    [mode, defaultCurrency],
  );

  const panel: Record<SettingsSection, ReactNode> = {
    overview: <SettingsOverview onSelect={go} />,
    profile: <ProfileForm />,
    security: <SecurityPanel />,
    appearance: <AppearancePanel />,
    whatsapp: <WhatsAppConfig />,
    templates: (
      <>
        <TemplateManager />
        <OptOutButtonsSettings />
      </>
    ),
    'quick-replies': <QuickRepliesManager />,
    fields: <FieldsAndTagsPanel />,
    deals: <DealsSettings />,
    members: <MembersTab />,
    api: <ApiKeysSettings />,
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('pageTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('pageDesc')}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
        <SettingsRail active={section} onSelect={go} hints={hints} />
        <div className="min-w-0">{panel[section]}</div>
      </div>
    </div>
  );
}
