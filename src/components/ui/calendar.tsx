import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ selected, onSelect, className = "" }) => {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <div className={`p-3 bg-card text-card-foreground rounded-md border shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex space-x-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-accent hover:text-accent-foreground" type="button">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-accent hover:text-accent-foreground" type="button">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
        <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const isSelected = selected && date.toDateString() === selected.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelect?.(date)}
              type="button"
              className={`h-8 w-8 mx-auto flex items-center justify-center rounded-md transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground font-bold"
                  : isToday
                  ? "border border-primary text-primary"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
