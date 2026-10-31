"use client";

import { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isAfter,
  isBefore,
  differenceInDays,
  startOfDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MiniCalendarPickerProps {
  initialStart?: Date | null;
  initialEnd?: Date | null;
  onApply: (start: Date, end: Date, label: string) => void;
  onCancel?: () => void;
}

export function MiniCalendarPicker({
  initialStart,
  initialEnd,
  onApply,
  onCancel,
}: MiniCalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialStart || new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStart || null);
  const [endDate, setEndDate] = useState<Date | null>(initialEnd || null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Month navigation
  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  // Calendar days grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Quick Presets
  const applyPreset = (preset: "today" | "yesterday" | "7d" | "15d" | "30d" | "month") => {
    const today = startOfDay(new Date());
    let start: Date;
    let end: Date = today;
    let label = "";

    switch (preset) {
      case "today":
        start = today;
        end = today;
        label = "Hoje";
        break;
      case "yesterday":
        start = subDays(today, 1);
        end = subDays(today, 1);
        label = "Ontem";
        break;
      case "7d":
        start = subDays(today, 6);
        label = "Últimos 7 dias";
        break;
      case "15d":
        start = subDays(today, 14);
        label = "Últimos 15 dias";
        break;
      case "30d":
        start = subDays(today, 29);
        label = "Últimos 30 dias";
        break;
      case "month":
        start = startOfMonth(today);
        end = today;
        label = "Este Mês";
        break;
    }

    setStartDate(start);
    setEndDate(end);
    setCurrentMonth(start);
    onApply(start, end, label);
  };

  // Day click handler
  const handleDayClick = (day: Date) => {
    const cleanDay = startOfDay(day);

    if (!startDate || (startDate && endDate)) {
      // First click: reset end and set start
      setStartDate(cleanDay);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Second click: set end or swap if clicked before start
      if (isBefore(cleanDay, startDate)) {
        setStartDate(cleanDay);
        setEndDate(startDate);
      } else {
        setEndDate(cleanDay);
      }
    }
  };

  const handleApply = () => {
    if (!startDate) return;
    const finalStart = startDate;
    const finalEnd = endDate || startDate;

    const formattedStart = format(finalStart, "dd/MM/yyyy");
    const formattedEnd = format(finalEnd, "dd/MM/yyyy");

    let label: string;
    if (isSameDay(finalStart, finalEnd)) {
      label = formattedStart;
    } else {
      label = `${format(finalStart, "dd/MM")} até ${format(finalEnd, "dd/MM")}`;
    }

    onApply(finalStart, finalEnd, label);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setHoveredDate(null);
  };

  // Selection duration
  const selectionDays =
    startDate && endDate
      ? differenceInDays(endDate, startDate) + 1
      : startDate
      ? 1
      : 0;

  return (
    <div className="w-[320px] space-y-3 p-1">
      {/* 1. Quick Presets Pills */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => applyPreset("today")}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => applyPreset("yesterday")}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Ontem
        </button>
        <button
          type="button"
          onClick={() => applyPreset("7d")}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          7D
        </button>
        <button
          type="button"
          onClick={() => applyPreset("15d")}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          15D
        </button>
        <button
          type="button"
          onClick={() => applyPreset("30d")}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          30D
        </button>
        <button
          type="button"
          onClick={() => applyPreset("month")}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Este Mês
        </button>
      </div>

      {/* 2. De - Até Indicator Boxes */}
      <div className="grid grid-cols-2 gap-2">
        {/* De */}
        <div
          className={cn(
            "rounded-lg border p-2 text-left transition-all",
            startDate && !endDate
              ? "border-primary bg-primary/10 shadow-xs"
              : startDate
              ? "border-border/80 bg-background"
              : "border-border/60 bg-muted/20"
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">De (Início)</p>
          <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
            {startDate ? format(startDate, "dd/MM/yyyy") : "--/--/----"}
          </p>
        </div>

        {/* Até */}
        <div
          className={cn(
            "rounded-lg border p-2 text-left transition-all",
            startDate && !endDate
              ? "border-dashed border-primary/50 bg-background"
              : endDate
              ? "border-border/80 bg-background"
              : "border-border/60 bg-muted/20"
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Até (Fim)</p>
          <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
            {endDate ? format(endDate, "dd/MM/yyyy") : startDate ? "Clique p/ fechar" : "--/--/----"}
          </p>
        </div>
      </div>

      {/* 3. Month & Year Navigation Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-xs font-bold capitalize text-foreground">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 4. Days of Week */}
      <div className="grid grid-cols-7 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-semibold uppercase text-muted-foreground py-1">
            {d}
          </span>
        ))}
      </div>

      {/* 5. Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, idx) => {
          const isCurrMonth = isSameMonth(day, currentMonth);
          const isStart = startDate && isSameDay(day, startDate);
          const isEnd = endDate && isSameDay(day, endDate);
          const isSingle = isStart && isEnd;
          const isInRealRange =
            startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
          const isInHoverRange =
            startDate &&
            !endDate &&
            hoveredDate &&
            isAfter(hoveredDate, startDate) &&
            isWithinInterval(day, { start: startDate, end: hoveredDate });

          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className={cn(
                "relative flex h-8 items-center justify-center transition-colors",
                // Range background spanning
                (isInRealRange || isInHoverRange) && !isStart && !isEnd && "bg-primary/15",
                isStart && (endDate || hoveredDate) && !isEnd && "bg-gradient-to-r from-transparent to-primary/15",
                isEnd && startDate && !isStart && "bg-gradient-to-l from-transparent to-primary/15"
              )}
            >
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-all",
                  // Muted outside current month
                  !isCurrMonth && "text-muted-foreground/40 hover:text-muted-foreground",
                  isCurrMonth && !isStart && !isEnd && "text-foreground hover:bg-muted",
                  // Selected Start or End
                  (isStart || isEnd) &&
                    "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90",
                  // Range Inbetween
                  (isInRealRange || isInHoverRange) &&
                    !isStart &&
                    !isEnd &&
                    "text-primary font-semibold",
                  // Today marker
                  isToday && !isStart && !isEnd && "ring-1 ring-primary/40 font-bold text-primary"
                )}
              >
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>

      {/* 6. Footer Actions & Selected Range Info */}
      <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {selectionDays > 0 ? (
            <span className="font-mono font-medium text-foreground">
              {selectionDays} {selectionDays === 1 ? "dia" : "dias"} selecionados
            </span>
          ) : (
            <span>Selecione data inicial e final</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {startDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Limpar
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={!startDate}
            className="h-7 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Aplicar Datas
          </Button>
        </div>
      </div>
    </div>
  );
}
