import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, open, variant, className }) {
        return (
          <Toast
            key={id}
            variant={variant}
            className={className}
            data-state={open ? "open" : "closed"}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose
              onClick={() => dismiss(id)}
              aria-label="Dismiss notification"
            />
          </Toast>
        );
      })}
    </ToastProvider>
  );
}
