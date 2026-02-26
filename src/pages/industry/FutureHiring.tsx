import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Plus, Target, Clock, Users, FileText, Loader2, Eye, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  fetchIndustryFutureHiring,
  getMyJDs,
  postFutureHiringRequirement,
  updateFutureHiringRequirement,
  type JDDraft,
} from "@/lib/api";

const TIMELINE_OPTIONS = ["3 months", "6 months", "9 months", "12 months"] as const;
const EDIT_ATTACH_NONE = "__none__";

function safeTimelineValue(timeline: string): string {
  return TIMELINE_OPTIONS.includes(timeline as (typeof TIMELINE_OPTIONS)[number]) ? timeline : TIMELINE_OPTIONS[0];
}

type Pipeline = {
  id: number;
  role: string;
  candidates: number;
  timeline: string;
  status: string;
  progress: number;
  readyDate: string;
  skills: string[];
  job_description_id?: number | null;
};

function formatJdDate(jd: JDDraft): string {
  const raw = jd.updatedAt || jd.createdAt;
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function FutureHiring() {
  const [showForm, setShowForm] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJds, setSavedJds] = useState<JDDraft[]>([]);
  const [savedJdsLoading, setSavedJdsLoading] = useState(false);
  const [attachedJdId, setAttachedJdId] = useState<string>("");
  const [roleTitle, setRoleTitle] = useState("");
  const [candidatesCount, setCandidatesCount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [viewRequirement, setViewRequirement] = useState<Pipeline | null>(null);
  const [editRequirement, setEditRequirement] = useState<Pipeline | null>(null);
  const [editForm, setEditForm] = useState({ roleTitle: "", candidatesCount: "", timeline: "", attachedJdId: "" });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    fetchIndustryFutureHiring()
      .then((data) => setPipelines(Array.isArray(data.pipelines) ? data.pipelines : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showForm || editRequirement != null) {
      setSavedJdsLoading(true);
      getMyJDs()
        .then((list) => setSavedJds(list.filter((j) => j.status === "published")))
        .catch(() => setSavedJds([]))
        .finally(() => setSavedJdsLoading(false));
    }
  }, [showForm, editRequirement != null]);

  useEffect(() => {
    if (editRequirement) {
      setEditForm({
        roleTitle: editRequirement.role,
        candidatesCount: String(editRequirement.candidates),
        timeline: safeTimelineValue(editRequirement.timeline),
        attachedJdId: editRequirement.job_description_id != null ? String(editRequirement.job_description_id) : "",
      });
    }
  }, [editRequirement]);

  const refetchPipelines = () => {
    fetchIndustryFutureHiring()
      .then((data) => setPipelines(Array.isArray(data.pipelines) ? data.pipelines : []))
      .catch(() => {});
  };

  const handleSubmitRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = roleTitle.trim();
    if (!title) {
      setSubmitError("Role title is required.");
      return;
    }
    const num = parseInt(candidatesCount, 10);
    const count = Number.isNaN(num) || num < 1 ? 1 : Math.min(num, 999);
    const jdId = attachedJdId ? parseInt(attachedJdId, 10) : undefined;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await postFutureHiringRequirement({
        role_title: title,
        candidates_count: count,
        timeline: timeline || "3 months",
        job_description_id: jdId,
      });
      refetchPipelines();
      setRoleTitle("");
      setCandidatesCount("");
      setTimeline("");
      setAttachedJdId("");
      setShowForm(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit requirement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRequirement) return;
    const title = editForm.roleTitle.trim();
    if (!title) {
      setUpdateError("Role title is required.");
      return;
    }
    const num = parseInt(editForm.candidatesCount, 10);
    const count = Number.isNaN(num) || num < 1 ? 1 : Math.min(num, 999);
    const jdId = editForm.attachedJdId ? parseInt(editForm.attachedJdId, 10) : undefined;
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateFutureHiringRequirement(editRequirement.id, {
        role_title: title,
        candidates_count: count,
        timeline: editForm.timeline || "3 months",
        job_description_id: jdId,
      });
      refetchPipelines();
      setEditRequirement(null);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Failed to update requirement");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">"Train for Us" Pipeline</h2>
          <p className="text-muted-foreground mt-1">Post future hiring requirements and train talent on-demand.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-xl gap-1">
          <Plus className="h-4 w-4" /> Post New Requirement
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> New Hiring Requirement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmitRequirement} className="space-y-4">
              {submitError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{submitError}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-title">Role Title</Label>
                  <Input
                    id="role-title"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. AI Automation Engineer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidates">Number of Candidates</Label>
                  <Input
                    id="candidates"
                    type="number"
                    min={1}
                    value={candidatesCount}
                    onChange={(e) => setCandidatesCount(e.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <Select value={timeline || undefined} onValueChange={setTimeline}>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent>
                      {TIMELINE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Attach JD
                </Label>
                <Select value={attachedJdId} onValueChange={setAttachedJdId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a saved JD to attach (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedJdsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading saved JDs…
                      </div>
                    ) : savedJds.length === 0 ? (
                      <div className="py-4 text-center text-muted-foreground text-sm px-2">
                        No saved JDs. Save a JD in AI JD Builder first.
                      </div>
                    ) : (
                      savedJds.map((j) => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          {j.title || `JD #${j.id}`}
                          {formatJdDate(j) ? ` · ${formatJdDate(j)}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Link this requirement to a saved job description from AI JD Builder.</p>
              </div>
              <Button type="submit" className="rounded-xl" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Requirement"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {!loading && pipelines.length === 0 && <p className="text-muted-foreground">No pipelines yet. Post a new requirement to get started.</p>}
      <div className="grid gap-4">
        {pipelines.map((p) => (
          <Card key={p.id}>
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{p.role}</h3>
                    <Badge variant={p.status === "In Training" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" /> {p.candidates} candidates • <Clock className="h-3.5 w-3.5 inline" /> {p.timeline} • Ready {p.readyDate}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(Array.isArray(p.skills) ? p.skills : []).map((sk) => (
                      <Badge key={sk} variant="outline" className="text-xs">{sk}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-full sm:w-32 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-semibold text-foreground">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} />
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setViewRequirement(p)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setEditRequirement(p);
                      setEditForm({
                        roleTitle: p.role ?? "",
                        candidatesCount: String(p.candidates ?? 0),
                        timeline: safeTimelineValue(p.timeline ?? ""),
                        attachedJdId: p.job_description_id != null ? String(p.job_description_id) : "",
                      });
                      setUpdateError(null);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View requirement sheet */}
      <Sheet open={!!viewRequirement} onOpenChange={(open) => !open && setViewRequirement(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Requirement details</SheetTitle>
          </SheetHeader>
          {viewRequirement && (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Role</p>
                <p className="font-medium text-foreground mt-1">{viewRequirement.role}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Candidates</p>
                <p className="text-foreground mt-1">{viewRequirement.candidates}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Timeline</p>
                <p className="text-foreground mt-1">{viewRequirement.timeline}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Status</p>
                <p className="text-foreground mt-1">{viewRequirement.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Progress</p>
                <p className="text-foreground mt-1">{viewRequirement.progress}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Ready date</p>
                <p className="text-foreground mt-1">{viewRequirement.readyDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Attached JD</p>
                <p className="text-foreground mt-1">
                  {viewRequirement.job_description_id != null ? `JD #${viewRequirement.job_description_id}` : "None"}
                </p>
              </div>
              {Array.isArray(viewRequirement.skills) && viewRequirement.skills.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Skills</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {viewRequirement.skills.map((sk) => (
                      <Badge key={sk} variant="outline" className="text-xs">{sk}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit requirement sheet */}
      <Sheet open={!!editRequirement} onOpenChange={(open) => !open && setEditRequirement(null)}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit requirement</SheetTitle>
          </SheetHeader>
          {editRequirement && (
            <form onSubmit={handleUpdateRequirement} className="mt-6 space-y-4">
              {updateError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{updateError}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role-title">Role Title</Label>
                  <Input
                    id="edit-role-title"
                    value={editForm.roleTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, roleTitle: e.target.value }))}
                    placeholder="e.g. AI Automation Engineer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-candidates">Number of Candidates</Label>
                  <Input
                    id="edit-candidates"
                    type="number"
                    min={1}
                    value={editForm.candidatesCount}
                    onChange={(e) => setEditForm((f) => ({ ...f, candidatesCount: e.target.value }))}
                    placeholder="e.g. 20"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Timeline</Label>
                  <Select
                    value={safeTimelineValue(editForm.timeline)}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, timeline: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent>
                      {TIMELINE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Attach JD
                  </Label>
                  <Select
                    value={
                      editForm.attachedJdId && savedJds.some((j) => String(j.id) === editForm.attachedJdId)
                        ? editForm.attachedJdId
                        : EDIT_ATTACH_NONE
                    }
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, attachedJdId: v === EDIT_ATTACH_NONE ? "" : v }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a saved JD (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EDIT_ATTACH_NONE}>None</SelectItem>
                      {!savedJdsLoading &&
                        savedJds.map((j) => (
                          <SelectItem key={j.id} value={String(j.id)}>
                            {j.title || `JD #${j.id}`}
                            {formatJdDate(j) ? ` · ${formatJdDate(j)}` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={updating}>
                  {updating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditRequirement(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
