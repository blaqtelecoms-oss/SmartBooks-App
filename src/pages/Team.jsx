import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const roles = [
  { value: "super_admin", label: "Super Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "bookkeeper", label: "Bookkeeper" },
  { value: "business_owner", label: "Business Owner" },
  { value: "employee", label: "Employee" }
];

export default function Team() {
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("bookkeeper");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (currentCompany) loadMembers();
  }, [currentCompany]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      setMembers(await db.entities.CompanyUser.filter({ company_id: currentCompany.id }));
    } catch (e) {}
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!email) { toast({ title: "Email is required", variant: "destructive" }); return; }
    setInviting(true);
    try {
      await db.users.inviteUser(email, "user");
      await db.entities.CompanyUser.create({
        company_id: currentCompany.id,
        user_id: email,
        role,
        status: "invited"
      });
      setDialogOpen(false);
      setEmail("");
      await loadMembers();
      toast({ title: "Invitation sent" });
    } catch (e) {
      toast({ title: "Error inviting user", description: e.message, variant: "destructive" });
    }
    setInviting(false);
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await db.entities.CompanyUser.delete(id);
      await loadMembers();
      toast({ title: "Member removed" });
    } catch (e) {}
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Team</h1>
          <p className="text-[13px] text-[#6B6B72] mt-1">Manage team members and permissions for {currentCompany.name}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg text-[13px] h-9">
          <Plus size={14} className="mr-1.5" /> Invite Member
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <Users size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No team members yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Invite accountants, bookkeepers, and team members</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          {members.map((m, i) => (
            <div key={m.id} className={`flex items-center justify-between px-5 py-3.5 ${i < members.length - 1 ? "border-b border-[#F1F1F4]" : ""} hover:bg-[#F7F7FA] transition-colors`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F1F1F4] flex items-center justify-center text-[12px] font-medium text-[#6B6B72]">
                  {(m.user_id || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#0F0F0F]">{m.user_id}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    m.status === "active" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>{m.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#6B6B72] bg-[#F7F7FA] px-2 py-0.5 rounded">
                  {roles.find(r => r.value === m.role)?.label || m.role}
                </span>
                <button onClick={() => handleRemove(m.id)} className="p-1 rounded hover:bg-red-50 text-[#6B6B72] hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-[16px]">Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-[12px] text-[#6B6B72]">Email Address</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" placeholder="team@company.co.za" /></div>
            <div>
              <Label className="text-[12px] text-[#6B6B72]">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting} className="w-full bg-[#0F0F0F] hover:bg-[#2D2D2D] text-white rounded-lg">
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}