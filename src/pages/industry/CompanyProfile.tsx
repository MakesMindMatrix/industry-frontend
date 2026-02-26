import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, updateProfile, type IndustryProfile } from "@/lib/api";

const COMPANY_SIZE_OPTIONS = [
  { value: "size_1_10", label: "1-10" },
  { value: "size_11_50", label: "11-50" },
  { value: "size_50_200", label: "50-200" },
  { value: "size_200_plus", label: "200+" },
];
const HIRING_INTENTS = ["Internships", "Full-time", "Both"];

function normalizeCompanySize(s: string): string {
  const map: Record<string, string> = { "1-10": "size_1_10", "11-50": "size_11_50", "50-200": "size_50_200", "200+": "size_200_plus" };
  return map[s] || s;
}

export default function CompanyProfile() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<IndustryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    companySize: "",
    headquarters: "",
    briefDescription: "",
    hiringIntent: "",
    internshipAvailability: true,
    preferredRoles: [] as string[],
    preferredSkillDomains: [] as string[],
    mentorshipInterest: false,
    guestLectureInterest: false,
    hackathonParticipation: false,
    trainForUsModel: false,
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          companySize: normalizeCompanySize(p.companySize || "size_1_10"),
          headquarters: p.headquarters || "",
          briefDescription: p.briefDescription || "",
          hiringIntent: p.hiringIntent || "Both",
          internshipAvailability: p.internshipAvailability ?? true,
          preferredRoles: Array.isArray(p.preferredRoles) ? p.preferredRoles : [],
          preferredSkillDomains: Array.isArray(p.preferredSkillDomains) ? p.preferredSkillDomains : [],
          mentorshipInterest: p.mentorshipInterest ?? false,
          guestLectureInterest: p.guestLectureInterest ?? false,
          hackathonParticipation: p.hackathonParticipation ?? false,
          trainForUsModel: p.trainForUsModel ?? false,
        });
      })
      .catch((err) => {
        if ((err as Error)?.message === "Session expired") logout();
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateProfile({
        companySize: form.companySize,
        headquarters: form.headquarters,
        briefDescription: form.briefDescription,
        hiringIntent: form.hiringIntent,
        internshipAvailability: form.internshipAvailability,
        preferredRoles: form.preferredRoles,
        preferredSkillDomains: form.preferredSkillDomains,
        mentorshipInterest: form.mentorshipInterest,
        guestLectureInterest: form.guestLectureInterest,
        hackathonParticipation: form.hackathonParticipation,
        trainForUsModel: form.trainForUsModel,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const joinedDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-7 w-7" /> Company Profile
        </h2>
        <p className="text-muted-foreground mt-1">Manage your company identity, hiring profile, and ecosystem signals.</p>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10">
            <p className="text-muted-foreground text-center">Loading profile…</p>
          </CardContent>
        </Card>
      )}

      {!loading && !profile && (
        <Card>
          <CardContent className="py-10 space-y-3">
            <p className="text-foreground font-medium">No company profile linked</p>
            <p className="text-sm text-muted-foreground">
              Your company profile will appear here once it has been set up and linked to your account. 
              If you expect to see a profile, try logging in with your company email or contact your administrator.
            </p>
            <p className="text-xs text-muted-foreground">
              The profile is created when your organisation is onboarded to the Industry Portal. 
              You can still use AI JD Builder, Competency Matrix, and Talent Discovery without a profile.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && profile && (
        <>
      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{saveError}</p>
      )}
      {/* 1. Company Identity (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Company Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <Label className="text-muted-foreground">Company Name</Label>
            <p className="font-medium text-foreground">{profile.companyName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Official Email</Label>
            <p className="font-medium text-foreground">{profile.officialEmail}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Industry Type</Label>
            <p className="font-medium text-foreground">{profile.industryType}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Joined Date</Label>
            <p className="font-medium text-foreground">{joinedDate}</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Hiring Profile (Editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Hiring Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={form.companySize} onValueChange={(v) => setForm((f) => ({ ...f, companySize: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headquarters">Headquarters</Label>
              <Input id="headquarters" value={form.headquarters} onChange={(e) => setForm((f) => ({ ...f, headquarters: e.target.value }))} placeholder="City, Country" />
            </div>
            <div className="space-y-2">
              <Label>Hiring Intent</Label>
              <Select value={form.hiringIntent} onValueChange={(v) => setForm((f) => ({ ...f, hiringIntent: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HIRING_INTENTS.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="internship">Internship Availability</Label>
              <Switch id="internship" checked={form.internshipAvailability} onCheckedChange={(c) => setForm((f) => ({ ...f, internshipAvailability: !!c }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brief">Brief Description (max 300)</Label>
              <textarea id="brief" maxLength={300} value={form.briefDescription} onChange={(e) => setForm((f) => ({ ...f, briefDescription: e.target.value }))} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="What does your company do?" />
            </div>
            <div className="space-y-2">
              <Label>Preferred Roles (comma-separated)</Label>
              <Input value={form.preferredRoles.join(", ")} onChange={(e) => setForm((f) => ({ ...f, preferredRoles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="e.g. Backend Developer, Data Analyst" />
            </div>
            <div className="space-y-2">
              <Label>Preferred Skill Domains (comma-separated)</Label>
              <Input value={form.preferredSkillDomains.join(", ")} onChange={(e) => setForm((f) => ({ ...f, preferredSkillDomains: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="e.g. AI/ML, Cloud, DevOps" />
            </div>

            {/* 3. Ecosystem Signals */}
            <div className="pt-4 border-t">
              <CardTitle className="text-base mb-3">3. Ecosystem Signals</CardTitle>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mentorship">Mentorship Interest</Label>
                  <Switch id="mentorship" checked={form.mentorshipInterest} onCheckedChange={(c) => setForm((f) => ({ ...f, mentorshipInterest: !!c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="guest">Guest Lecture Interest</Label>
                  <Switch id="guest" checked={form.guestLectureInterest} onCheckedChange={(c) => setForm((f) => ({ ...f, guestLectureInterest: !!c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="hackathon">Hackathon Participation</Label>
                  <Switch id="hackathon" checked={form.hackathonParticipation} onCheckedChange={(c) => setForm((f) => ({ ...f, hackathonParticipation: !!c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="train">Train-for-us Model</Label>
                  <Switch id="train" checked={form.trainForUsModel} onCheckedChange={(c) => setForm((f) => ({ ...f, trainForUsModel: !!c }))} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" className="rounded-xl" disabled={saving}>{saving ? "Saving…" : "Save Profile"}</Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-accent">
                  <CheckCircle className="h-4 w-4" /> Saved!
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
