"use client";

/**
 * Date Range Picker
 * Filter all data by time period with presets and custom range
 */

import * as React from "react";
import { format, subDays, startOfYear, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Preset ranges - matches use-url-state presets
type PresetKey = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

interface Preset {
  label: string;
  getValue: () => DateRange;
}

const PRESETS: Record<PresetKey, Preset> = {
  "7d": {
    label: "Last 7 days",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: endOfDay(new Date()),
    }),
  },
  "30d": {
    label: "Last 30 days",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: endOfDay(new Date()),
    }),
  },
  "90d": {
    label: "Last 90 days",
    getValue: () => ({
      from: subDays(new Date(), 90),
      to: endOfDay(new Date()),
    }),
  },
  ytd: {
    label: "Year to date",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  all: {
    label: "All time",
    getValue: () => ({
      from: undefined,
      to: undefined,
    }),
  },
  custom: {
    label: "Custom range",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: endOfDay(new Date()),
    }),
  },
};

// ============================================
// Date Range Picker Component
// ============================================

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  preset?: PresetKey;
  onPresetChange?: (preset: PresetKey) => void;
  className?: string;
  align?: "start" | "center" | "end";
  showPresets?: boolean;
  showClear?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  onChange,
  preset = "30d",
  onPresetChange,
  className,
  align = "start",
  showPresets = true,
  showClear = true,
  disabled = false,
  placeholder = "Pick a date range",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalPreset, setInternalPreset] = React.useState<PresetKey>(preset);
  const [internalValue, setInternalValue] = React.useState<DateRange | undefined>(
    value || PRESETS[preset].getValue()
  );

  const currentPreset = onPresetChange ? preset : internalPreset;
  const currentValue = onChange ? value : internalValue;

  const handlePresetChange = (newPreset: PresetKey) => {
    const range = PRESETS[newPreset].getValue();
    
    if (onPresetChange) {
      onPresetChange(newPreset);
    } else {
      setInternalPreset(newPreset);
    }
    
    if (onChange) {
      onChange(range);
    } else {
      setInternalValue(range);
    }
    
    if (newPreset !== "custom") {
      setIsOpen(false);
    }
  };

  const handleRangeChange = (range: DateRange | undefined) => {
    if (onChange) {
      onChange(range);
    } else {
      setInternalValue(range);
    }
    
    // Switch to custom when user picks dates
    if (range?.from || range?.to) {
      if (onPresetChange) {
        onPresetChange("custom");
      } else {
        setInternalPreset("custom");
      }
    }
  };

  const handleClear = () => {
    handlePresetChange("all");
  };

  const formatDateRange = () => {
    if (!currentValue?.from) {
      if (currentPreset === "all") return "All time";
      return placeholder;
    }

    if (!currentValue.to) {
      return format(currentValue.from, "MMM d, yyyy");
    }

    return `${format(currentValue.from, "MMM d")} - ${format(currentValue.to, "MMM d, yyyy")}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[200px]",
              !currentValue?.from && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1">{formatDateRange()}</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="flex">
            {/* Presets sidebar */}
            {showPresets && (
              <div className="border-r p-3 space-y-1 min-w-[140px]">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Quick Select
                </p>
                {Object.entries(PRESETS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key as PresetKey)}
                    className={cn(
                      "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                      currentPreset === key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={currentValue?.from}
                selected={currentValue}
                onSelect={handleRangeChange}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-3 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {currentPreset !== "custom" && currentPreset !== "all" && (
                <Badge variant="secondary">{PRESETS[currentPreset].label}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {showClear && currentValue?.from && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={() => setIsOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear button outside popover */}
      {showClear && currentValue?.from && currentPreset !== "all" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ============================================
// Compact Date Range Select (for toolbars)
// ============================================

interface DateRangeSelectProps {
  value?: PresetKey;
  onChange?: (preset: PresetKey) => void;
  className?: string;
  disabled?: boolean;
}

export function DateRangeSelect({
  value = "30d",
  onChange,
  className,
  disabled = false,
}: DateRangeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange as (value: string) => void} disabled={disabled}>
      <SelectTrigger className={cn("w-[140px]", className)}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PRESETS).map(([key, { label }]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================
// URL-Synced Date Range Picker
// ============================================

import { useDateRangeFilter } from "@/hooks/use-url-state";

export function UrlDateRangePicker({ className }: { className?: string }) {
  const { preset, setPreset, startDate, endDate, setStartDate, setEndDate } =
    useDateRangeFilter();

  const handlePresetChange = (newPreset: PresetKey) => {
    setPreset(newPreset);
    
    // Clear custom dates when using preset
    if (newPreset !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, "yyyy-MM-dd"));
    } else {
      setStartDate("");
    }
    
    if (range?.to) {
      setEndDate(format(range.to, "yyyy-MM-dd"));
    } else {
      setEndDate("");
    }
    
    setPreset("custom");
  };

  // Convert URL dates to DateRange
  const value: DateRange | undefined = React.useMemo(() => {
    if (preset !== "custom" && preset !== "all") {
      return PRESETS[preset as PresetKey]?.getValue();
    }
    
    return {
      from: startDate ? new Date(startDate) : undefined,
      to: endDate ? new Date(endDate) : undefined,
    };
  }, [preset, startDate, endDate]);

  return (
    <DateRangePicker
      value={value}
      onChange={handleRangeChange}
      preset={preset as PresetKey}
      onPresetChange={handlePresetChange}
      className={className}
    />
  );
}

// ============================================
// Date Range Context (for global filtering)
// ============================================

interface DateRangeContextValue {
  range: DateRange | undefined;
  preset: PresetKey;
  setRange: (range: DateRange | undefined) => void;
  setPreset: (preset: PresetKey) => void;
  days: number;
}

const DateRangeContext = React.createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = React.useState<PresetKey>("30d");
  const [range, setRange] = React.useState<DateRange | undefined>(
    PRESETS["30d"].getValue()
  );

  const days = React.useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    return Math.ceil(
      (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [range]);

  const handlePresetChange = (newPreset: PresetKey) => {
    setPreset(newPreset);
    setRange(PRESETS[newPreset].getValue());
  };

  return (
    <DateRangeContext.Provider
      value={{
        range,
        preset,
        setRange,
        setPreset: handlePresetChange,
        days,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = React.useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
}
