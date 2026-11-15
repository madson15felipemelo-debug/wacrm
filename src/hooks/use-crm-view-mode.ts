'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_OPT_OUT_BUTTONS } from '@/lib/contacts/opt-out';
import {
  type CrmAccountViewMode,
  packAccountMessagingLists,
  unpackAccountMessagingLists,
} from '@/lib/contacts/close-attendance';

const EVENT_NAME = 'luma-view-mode-changed';

function getStorageKey(accountId: string | null) {
  return accountId ? `luma_crm_view_mode_${accountId}` : 'luma_crm_view_mode';
}

export function useCrmViewMode() {
  const { accountId, canEditSettings } = useAuth();
  const [crmViewMode, setCrmViewMode] = useState<CrmAccountViewMode>('both');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && accountId) {
      const cached = window.localStorage.getItem(getStorageKey(accountId));
      if (cached === 'both' || cached === 'collection' || cached === 'sales') {
        setCrmViewMode(cached);
      }
    }
  }, [accountId]);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('accounts')
      .select('opt_out_buttons')
      .eq('id', accountId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const { viewMode } = unpackAccountMessagingLists(data?.opt_out_buttons);
        setCrmViewMode(viewMode);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(getStorageKey(accountId), viewMode);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<CrmAccountViewMode>;
      if (
        custom.detail === 'both' ||
        custom.detail === 'collection' ||
        custom.detail === 'sales'
      ) {
        setCrmViewMode(custom.detail);
      }
    };
    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => window.removeEventListener(EVENT_NAME, handleUpdate);
  }, []);

  const saveViewMode = useCallback(
    async (nextMode: CrmAccountViewMode): Promise<{ ok: boolean }> => {
      if (!accountId || !canEditSettings) return { ok: false };
      const supabase = createClient();

      const { data: currentRow } = await supabase
        .from('accounts')
        .select('opt_out_buttons')
        .eq('id', accountId)
        .maybeSingle();

      const { optOutButtons, closeConfig } = unpackAccountMessagingLists(
        currentRow?.opt_out_buttons,
      );

      const packed = packAccountMessagingLists(
        optOutButtons ?? DEFAULT_OPT_OUT_BUTTONS,
        closeConfig,
        nextMode,
      );

      const { error } = await supabase
        .from('accounts')
        .update({ opt_out_buttons: packed })
        .eq('id', accountId);

      if (error) {
        return { ok: false };
      }

      setCrmViewMode(nextMode);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getStorageKey(accountId), nextMode);
        window.dispatchEvent(
          new CustomEvent<CrmAccountViewMode>(EVENT_NAME, { detail: nextMode }),
        );
      }

      return { ok: true };
    },
    [accountId, canEditSettings],
  );

  return {
    crmViewMode,
    loading,
    saveViewMode,
    canEditSettings,
  };
}

