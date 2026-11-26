// src/components/ui/label.tsx
import * as React from "react";

/** Simple wrapper for a HTML label with Tailwind styling */
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className = "", ...props }, ref) => (
    <label
      ref={ref}
      className={`block text-sm font-medium text-foreground ${className}`}
      {...props}
    />
  )
);
Label.displayName = "Label";

export default Label;
