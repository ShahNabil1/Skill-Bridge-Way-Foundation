import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let push: ((p: Pending) => void) | null = null;

/** Promise-based replacement for window.confirm. Resolves true when confirmed. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) return resolve(false);
    push({ ...opts, resolve });
  });
}

/** Mount once at the app root. */
export function ConfirmHost() {
  const [current, setCurrent] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    push = (p) => { setCurrent(p); setOpen(true); };
    return () => { push = null; };
  }, []);

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setCurrent((c) => (c ? { ...c, resolve: () => {} } : c));
    setOpen(false);
  };

  const Icon = current?.destructive ? AlertTriangle : Info;
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent className="glass max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-md">
        <AlertDialogHeader className="items-center text-center sm:items-start sm:text-left">
          <div className={cn("mb-2 flex h-11 w-11 items-center justify-center rounded-full",
            current?.destructive ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="font-heading">{current?.title}</AlertDialogTitle>
          {current?.description && <AlertDialogDescription>{current.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => close(false)}>{current?.cancelText ?? "Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={cn(current?.destructive && buttonVariants({ variant: "destructive" }))}
          >
            {current?.confirmText ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
