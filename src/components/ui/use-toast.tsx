export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function toast({ title, description, variant = "default" }: ToastOptions) {
  console.log(`[Toast ${variant.toUpperCase()}]:`, title, description);
  if (typeof window !== "undefined") {
    const event = new CustomEvent("app-toast", { detail: { title, description, variant } });
    window.dispatchEvent(event);
  }
}

export function useToast() {
  return {
    toast,
    dismiss: () => {},
  };
}
