import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

interface ShiftCalendarPickerProps {
  mode: "single" | "range";
  selectedDate?: string;
  rangeStart?: string;
  rangeEnd?: string;
  onModeChange: (mode: "single" | "range") => void;
  onSingleDateChange: (date: string) => void;
  onRangeChange: (start: string, end: string) => void;
}

const DAYS_OF_WEEK = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getDatesInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function isBetween(date: string, start: string, end: string): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

export default function ShiftCalendarPicker({
  mode,
  selectedDate = "",
  rangeStart = "",
  rangeEnd = "",
  onModeChange,
  onSingleDateChange,
  onRangeChange,
}: ShiftCalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const base = selectedDate || rangeStart || new Date().toISOString().split("T")[0];
    const d = new Date(base + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [rangeStep, setRangeStep] = useState<"start" | "end">("start");
  const [hoverDate, setHoverDate] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Reset range step when switching modes
  const handleModeChange = (newMode: "single" | "range") => {
    onModeChange(newMode);
    setRangeStep("start");
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDayClick = (dateStr: string) => {
    if (mode === "single") {
      onSingleDateChange(dateStr);
      setOpen(false);
    } else {
      if (rangeStep === "start") {
        onRangeChange(dateStr, "");
        setRangeStep("end");
      } else {
        // Ensure start <= end
        if (rangeStart && dateStr < rangeStart) {
          onRangeChange(dateStr, rangeStart);
        } else {
          onRangeChange(rangeStart, dateStr);
        }
        setRangeStep("start");
        setOpen(false);
      }
    }
  };

  const getDayStyles = (dateStr: string): string => {
    const today = new Date().toISOString().split("T")[0];
    const isToday = dateStr === today;

    if (mode === "single") {
      const isSelected = dateStr === selectedDate;
      if (isSelected) return "bg-blue-600 text-white font-bold rounded-full";
      if (isToday) return "border-2 border-blue-400 rounded-full font-semibold text-blue-700";
      return "hover:bg-blue-50 rounded-full text-gray-700";
    } else {
      // Range mode
      const effectiveEnd = rangeEnd || (rangeStep === "end" && hoverDate ? hoverDate : "");
      const isStart = dateStr === rangeStart;
      const isEnd = dateStr === effectiveEnd;
      const inRange = rangeStart && effectiveEnd && isBetween(dateStr, rangeStart, effectiveEnd);

      if (isStart && isEnd) return "bg-blue-600 text-white font-bold rounded-full";
      if (isStart) return "bg-blue-600 text-white font-bold rounded-l-full";
      if (isEnd) return "bg-blue-600 text-white font-bold rounded-r-full";
      if (inRange) return "bg-blue-100 text-blue-800";
      if (isToday) return "border-2 border-blue-400 rounded-full font-semibold text-blue-700";
      return "hover:bg-blue-50 rounded-full text-gray-700";
    }
  };

  const renderCalendar = () => {
    const { year, month } = viewDate;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: (string | null)[] = Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push(`${year}-${mm}-${dd}`);
    }

    // Fill to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  };

  const cells = renderCalendar();

  // Display label
  const displayLabel = () => {
    if (mode === "single") {
      return selectedDate ? formatDate(selectedDate) : "Seleccionar fecha...";
    } else {
      if (rangeStart && rangeEnd) {
        const count = getDatesInRange(rangeStart, rangeEnd).length;
        return `${formatDate(rangeStart)} → ${formatDate(rangeEnd)} (${count} días)`;
      }
      if (rangeStart && rangeStep === "end") return `Desde: ${formatDate(rangeStart)} — Selecciona fin...`;
      return "Seleccionar rango...";
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "single") {
      onSingleDateChange("");
    } else {
      onRangeChange("", "");
      setRangeStep("start");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all cursor-pointer
          ${open ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300 hover:border-blue-400"}
          bg-white text-left`}
      >
        <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className={`flex-1 truncate ${(!selectedDate && !rangeStart) ? "text-gray-400" : "text-gray-800 font-medium"}`}>
          {displayLabel()}
        </span>
        {(selectedDate || rangeStart) && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
            className="ml-auto text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 select-none">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              type="button"
              onClick={() => handleModeChange("single")}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
                mode === "single" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Un Día
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("range")}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
                mode === "range" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Rango de Días
            </button>
          </div>

          {/* Range instruction */}
          {mode === "range" && (
            <div className={`text-xs mb-3 px-2 py-1.5 rounded-md font-medium ${
              rangeStep === "start" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
            }`}>
              {rangeStep === "start" ? "① Selecciona la fecha de inicio" : "② Selecciona la fecha de fin"}
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-800">
              {MONTHS_ES[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((dateStr, i) => (
              <div key={i} className="flex items-center justify-center">
                {dateStr ? (
                  <button
                    type="button"
                    onClick={() => handleDayClick(dateStr)}
                    onMouseEnter={() => setHoverDate(dateStr)}
                    onMouseLeave={() => setHoverDate("")}
                    className={`w-8 h-8 text-xs flex items-center justify-center cursor-pointer transition-all ${getDayStyles(dateStr)}`}
                  >
                    {parseInt(dateStr.split("-")[2], 10)}
                  </button>
                ) : (
                  <div className="w-8 h-8" />
                )}
              </div>
            ))}
          </div>

          {/* Footer: Today button */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                const d = new Date();
                setViewDate({ year: d.getFullYear(), month: d.getMonth() });
                if (mode === "single") {
                  onSingleDateChange(today);
                  setOpen(false);
                } else {
                  if (rangeStep === "start") {
                    onRangeChange(today, "");
                    setRangeStep("end");
                  } else {
                    onRangeChange(rangeStart, today);
                    setRangeStep("start");
                    setOpen(false);
                  }
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              Ir a Hoy
            </button>
            {mode === "range" && rangeStart && rangeEnd && (
              <span className="text-xs text-gray-500">
                {getDatesInRange(rangeStart, rangeEnd).length} día(s)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { getDatesInRange };