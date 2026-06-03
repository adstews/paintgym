"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Btn } from "@/components/tf/ui";

// Generic confirm prompt (item 11). Used before batch generates to make sure
// the user knows how many credits/images a run will cost.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1.5px solid var(--ink)",
          borderRadius: 0,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-.01em",
            }}
          >
            {title}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ink-2)", fontSize: 14 }}>
            {body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Btn type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Btn>
          <Btn
            type="button"
            variant="pop"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
