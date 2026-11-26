import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Record<string, string>;
  registerLabel: (value: string, label: string) => void;
}>({
  open: false,
  setOpen: () => {},
  labels: {},
  registerLabel: () => {},
});

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false);
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);

  const registerLabel = React.useCallback((itemValue: string, label: string) => {
    setLabels((prev) => (prev[itemValue] === label ? prev : { ...prev, [itemValue]: label }));
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, labels, registerLabel }}>
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext);
    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
        {...props}
      >
        <span className="truncate text-left">{children}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value, labels } = React.useContext(SelectContext);
  const display = value !== undefined && value !== "" ? labels[value] || value : placeholder || "Seleccionar...";
  return <span>{display}</span>;
};

export const SelectContent = ({ className = "", children }: { className?: string; children: React.ReactNode }) => {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div
      className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md ${className}`}
    >
      <div className="p-1">{children}</div>
    </div>
  );
};

export const SelectItem = ({
  value: itemValue,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { value, onValueChange, setOpen, registerLabel } = React.useContext(SelectContext);
  const isSelected = value === itemValue;

  React.useEffect(() => {
    if (typeof children === "string") {
      registerLabel(itemValue, children);
    }
  }, [itemValue, children, registerLabel]);

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange?.(itemValue);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${
        isSelected ? "bg-accent/60 font-semibold" : ""
      } ${className}`}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="truncate">{children}</span>
    </button>
  );
};
