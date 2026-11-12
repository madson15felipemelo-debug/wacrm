"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Building2,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MiniCalendarPicker } from "./mini-calendar-picker";

export interface FilterState {
  datePreset: "today" | "yesterday" | "7d" | "15d" | "30d" | "month" | "custom";
  dateLabel: string;
  startDate?: string;
  endDate?: string;
  campaign: string;
  flow: string;
  channelType: "all" | "robot" | "ai" | "human";
}

interface DashboardFiltersBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
  campaigns?: { id: string; name: string }[];
}

export function DashboardFiltersBar({
  filters,
  onFilterChange,
  onRefresh,
  isRefreshing = false,
  lastUpdated = "agora",
  campaigns = [],
}: DashboardFiltersBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/* Período */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            className="inline-flex items-center h-8 gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground">{filters.dateLabel}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 shadow-xl border border-border bg-card" align="start">
            <MiniCalendarPicker
              initialStart={filters.startDate ? new Date(filters.startDate) : null}
              initialEnd={filters.endDate ? new Date(filters.endDate) : null}
              onApply={(start, end, label) => {
                onFilterChange({
                  ...filters,
                  datePreset: "custom",
                  dateLabel: label,
                  startDate: format(start, "yyyy-MM-dd"),
                  endDate: format(end, "yyyy-MM-dd"),
                });
                setCalendarOpen(false);
              }}
              onCancel={() => setCalendarOpen(false)}
            />
          </PopoverContent>
        </Popover>

        {/* Carteira (dinâmica conforme carteiras cadastradas) */}
        {campaigns.length > 0 && (
          <div className="relative">
            <select
              value={filters.campaign}
              onChange={(e) => onFilterChange({ ...filters, campaign: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer appearance-none pr-7"
            >
              <option value="all">Todas as carteiras</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <Building2 className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}

        {/* Canal */}
        <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "all" })}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              filters.channelType === "all"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "robot" })}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              filters.channelType === "robot"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Triagem
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "ai" })}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              filters.channelType === "ai"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Automático
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "human" })}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              filters.channelType === "human"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Humano
          </button>
        </div>
      </div>

      {/* Atualizar */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
        <span className="text-[11px] text-muted-foreground font-mono">
          Atualizado: {lastUpdated}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
