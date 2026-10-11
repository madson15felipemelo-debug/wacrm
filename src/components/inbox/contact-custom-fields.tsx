"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { CustomField } from "@/types";

interface ContactCustomFieldsProps {
  contactId: string;
  /** Viewers see the values read-only. */
  canEdit: boolean;
}

/**
 * "Dados da cobrança" in the inbox contact panel: every account custom
 * field (CPF, Contrato, Valor…) with its value for this contact, edited
 * in place — saved on blur / Enter, cleared by emptying the box.
 */
export function ContactCustomFields({ contactId, canEdit }: ContactCustomFieldsProps) {
  const t = useTranslations("Inbox.customFields");
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("custom_fields").select("*").order("created_at"),
      supabase
        .from("contact_custom_values")
        .select("custom_field_id, value")
        .eq("contact_id", contactId),
    ]).then(([fieldsRes, valuesRes]) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const row of valuesRes.data ?? []) {
        map[row.custom_field_id as string] = (row.value as string) ?? "";
      }
      setFields((fieldsRes.data as CustomField[]) ?? []);
      setValues(map);
      setSaved(map);
      setLoadedFor(contactId);
    });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const save = async (fieldId: string) => {
    const next = (values[fieldId] ?? "").trim();
    if (next === (saved[fieldId] ?? "")) return;
    setSavingId(fieldId);
    const supabase = createClient();
    const { error } = next
      ? await supabase
          .from("contact_custom_values")
          .upsert(
            { contact_id: contactId, custom_field_id: fieldId, value: next },
            { onConflict: "contact_id,custom_field_id" },
          )
      : await supabase
          .from("contact_custom_values")
          .delete()
          .eq("contact_id", contactId)
          .eq("custom_field_id", fieldId);
    setSavingId(null);
    if (error) {
      toast.error(t("saveFailed"));
      setValues((v) => ({ ...v, [fieldId]: saved[fieldId] ?? "" }));
      return;
    }
    setSaved((s) => ({ ...s, [fieldId]: next }));
    setValues((v) => ({ ...v, [fieldId]: next }));
  };

  if (loadedFor !== contactId) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <ClipboardList className="h-3 w-3" />
        {t("title")}
      </div>
      {fields.length === 0 ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {fields.map((f) => (
            <label key={f.id} className="flex items-center gap-2 px-1">
              <span className="w-20 shrink-0 truncate text-[11px] text-muted-foreground" title={f.field_name}>
                {f.field_name}
              </span>
              <input
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                onBlur={() => void save(f.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                disabled={!canEdit}
                placeholder="—"
                className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-muted px-2 text-xs text-foreground outline-none hover:border-border focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
              />
              {savingId === f.id && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
