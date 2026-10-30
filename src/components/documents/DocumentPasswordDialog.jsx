import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";

/**
 * Asks for the password of a locked document and retries the extraction.
 * The password lives only in this dialog's state and is never persisted.
 */
export default function DocumentPasswordDialog({ open, fileName, error, busy, onSubmit, onClose }) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword("");
  }, [open, fileName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Password-protected document</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {fileName ? `“${fileName}” is locked. ` : "This document is locked. "}
            Enter its password so we can read it — it is used once and never stored.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#F6D5D0] bg-[#FDF2F0] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#8E2218]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-password">Document password</Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA9A1]"
                aria-hidden="true"
              />
              <Input
                id="document-password"
                type="password"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the file password"
                className="h-11 pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="h-11 w-full font-medium" disabled={busy || !password}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              "Unlock & process"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
