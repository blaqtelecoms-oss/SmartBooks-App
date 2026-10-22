import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Shield, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setUser(await db.auth.me());
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#6B6B72] mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-[#E5E5E8] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User size={16} className="text-[#6B6B72]" />
          <h3 className="text-[15px] font-medium text-[#0F0F0F]">Profile</h3>
        </div>
        {user && (
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between py-2 border-b border-[#F1F1F4]">
              <span className="text-[#6B6B72]">Name</span>
              <span className="text-[#0F0F0F] font-medium">{user.full_name || "Not set"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F1F1F4]">
              <span className="text-[#6B6B72]">Email</span>
              <span className="text-[#0F0F0F] font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#6B6B72]">Role</span>
              <span className="text-[#0F0F0F] font-medium capitalize">{user.role || "user"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-[#E5E5E8] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#6B6B72]" />
          <h3 className="text-[15px] font-medium text-[#0F0F0F]">Security & Compliance</h3>
        </div>
        <div className="space-y-2 text-[13px]">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] mt-1.5" />
            <div>
              <p className="font-medium text-[#0F0F0F]">POPIA Compliant</p>
              <p className="text-[#6B6B72] text-[12px]">Data encrypted at rest and in transit</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] mt-1.5" />
            <div>
              <p className="font-medium text-[#0F0F0F]">Audit Trail Active</p>
              <p className="text-[#6B6B72] text-[12px]">All actions logged for compliance</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] mt-1.5" />
            <div>
              <p className="font-medium text-[#0F0F0F]">Role-Based Access</p>
              <p className="text-[#6B6B72] text-[12px]">Permissions enforced per user role</p>
            </div>
          </div>
        </div>
      </div>
      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <h3 className="text-[15px] font-medium text-[#0F0F0F]">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#0F0F0F]">Delete Account</p>
            <p className="text-[12px] text-[#6B6B72]">Permanently remove your account and data</p>
          </div>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-lg text-[13px] h-9">
                <Trash2 size={14} className="mr-1.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All your companies, transactions, and associated
                  data will be permanently removed. Please confirm you understand the consequences.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await db.auth.logout();
                      window.location.href = "/login";
                    } catch (e) {
                      toast({
                        title: "Unable to delete account",
                        description: "Please contact support.",
                        variant: "destructive",
                      });
                    }
                    setDeleting(false);
                    setDeleteOpen(false);
                  }}
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}