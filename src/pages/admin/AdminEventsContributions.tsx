import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAdminToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Calendar, Heart } from "lucide-react";
import {
  getAdminPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getAdminContributions,
  createContributionOption,
  updateContributionOption,
  deleteContributionOption,
  clearAdminAuth,
  type EcosystemProgram,
  type EcosystemContribution,
} from "@/lib/api";

const ICON_OPTIONS = ["Globe", "Users", "Code", "Trophy", "Lightbulb", "Zap"];

export default function AdminEventsContributions() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<EcosystemProgram[]>([]);
  const [contributions, setContributions] = useState<EcosystemContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingProgram, setEditingProgram] = useState<number | null>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({ title: "", summary: "", body: "", status: "Active", program_type: "", students_count: 0 });

  const [editingContribution, setEditingContribution] = useState<number | null>(null);
  const [creatingContribution, setCreatingContribution] = useState(false);
  const [contributionForm, setContributionForm] = useState({ icon: "Globe", title: "", description: "", cta_text: "Learn more" });

  const load = async () => {
    try {
      const [progs, contribs] = await Promise.all([getAdminPrograms(), getAdminContributions()]);
      setPrograms(Array.isArray(progs) ? progs : []);
      setContributions(Array.isArray(contribs) ? contribs : []);
    } catch {
      setPrograms([]);
      setContributions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login", { replace: true });
      return;
    }
    load();
  }, [navigate]);

  const resetProgramForm = () => {
    setEditingProgram(null);
    setCreatingProgram(false);
    setProgramForm({ title: "", summary: "", body: "", status: "Active", program_type: "", students_count: 0 });
  };
  const resetContributionForm = () => {
    setEditingContribution(null);
    setCreatingContribution(false);
    setContributionForm({ icon: "Globe", title: "", description: "", cta_text: "Learn more" });
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingProgram) {
        await updateProgram(editingProgram, programForm);
      } else {
        await createProgram(programForm);
      }
      resetProgramForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionForm.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingContribution) {
        await updateContributionOption(editingContribution, contributionForm);
      } else {
        await createContributionOption(contributionForm);
      }
      resetContributionForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async (id: number) => {
    if (!confirm("Delete this program?")) return;
    try {
      await deleteProgram(id);
      if (editingProgram === id) resetProgramForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleDeleteContribution = async (id: number) => {
    if (!confirm("Delete this contribution option?")) return;
    try {
      await deleteContributionOption(id);
      if (editingContribution === id) resetContributionForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events & Contributions</h1>
          <p className="text-muted-foreground text-sm mt-1">Create programs and contribution options visible to all industry users.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/content">
            <Button variant="outline">Content</Button>
          </Link>
          <Link to="/admin/students">
            <Button variant="outline">Student IDs</Button>
          </Link>
          <Button variant="ghost" onClick={() => { clearAdminAuth(); navigate("/admin/login"); }}>
            Sign out
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}

      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs" className="gap-1.5"><Calendar className="h-4 w-4" /> Programs</TabsTrigger>
          <TabsTrigger value="contributions" className="gap-1.5"><Heart className="h-4 w-4" /> Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Programs</CardTitle>
              <Button size="sm" onClick={() => { resetProgramForm(); setCreatingProgram(true); }} disabled={creatingProgram}>
                <Plus className="h-4 w-4 mr-1" /> Add Program
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading…</p> : (
                <ul className="space-y-2">
                  {programs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground text-sm ml-2">· {p.status} · {p.students_count} students</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingProgram(p.id); setCreatingProgram(false); setProgramForm({ title: p.title, summary: p.summary || "", body: p.body || "", status: p.status || "Active", program_type: p.program_type || "", students_count: p.students_count ?? 0 }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteProgram(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </li>
                  ))}
                  {programs.length === 0 && !loading && <p className="text-muted-foreground text-sm">No programs yet.</p>}
                </ul>
              )}
            </CardContent>
          </Card>

          {(creatingProgram || editingProgram) && (
            <Card>
              <CardHeader><CardTitle className="text-base">{editingProgram ? "Edit Program" : "New Program"}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProgram} className="space-y-3">
                  <div><Label>Title</Label><Input value={programForm.title} onChange={(e) => setProgramForm((f) => ({ ...f, title: e.target.value }))} placeholder="Program title" required /></div>
                  <div><Label>Summary (short)</Label><Input value={programForm.summary} onChange={(e) => setProgramForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Brief summary" /></div>
                  <div><Label>Full description</Label><Textarea value={programForm.body} onChange={(e) => setProgramForm((f) => ({ ...f, body: e.target.value }))} placeholder="Full program info" rows={4} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Status</Label><Input value={programForm.status} onChange={(e) => setProgramForm((f) => ({ ...f, status: e.target.value }))} placeholder="Active" /></div>
                    <div><Label>Type</Label><Input value={programForm.program_type} onChange={(e) => setProgramForm((f) => ({ ...f, program_type: e.target.value }))} placeholder="e.g. Workshop" /></div>
                  </div>
                  <div><Label>Students count</Label><Input type="number" min={0} value={programForm.students_count} onChange={(e) => setProgramForm((f) => ({ ...f, students_count: parseInt(e.target.value, 10) || 0 }))} /></div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    <Button type="button" variant="outline" onClick={resetProgramForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contributions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Contribution options</CardTitle>
              <Button size="sm" onClick={() => { resetContributionForm(); setCreatingContribution(true); }} disabled={creatingContribution}>
                <Plus className="h-4 w-4 mr-1" /> Add Contribution
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading…</p> : (
                <ul className="space-y-2">
                  {contributions.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                      <span className="font-medium">{c.title}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingContribution(c.id); setCreatingContribution(false); setContributionForm({ icon: c.icon || "Globe", title: c.title, description: c.description || "", cta_text: c.cta_text || "Learn more" }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteContribution(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </li>
                  ))}
                  {contributions.length === 0 && !loading && <p className="text-muted-foreground text-sm">No contributions yet.</p>}
                </ul>
              )}
            </CardContent>
          </Card>

          {(creatingContribution || editingContribution) && (
            <Card>
              <CardHeader><CardTitle className="text-base">{editingContribution ? "Edit Contribution" : "New Contribution"}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSaveContribution} className="space-y-3">
                  <div><Label>Title</Label><Input value={contributionForm.title} onChange={(e) => setContributionForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Mentorship" required /></div>
                  <div><Label>Description</Label><Textarea value={contributionForm.description} onChange={(e) => setContributionForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" rows={3} /></div>
                  <div><Label>Button text (CTA)</Label><Input value={contributionForm.cta_text} onChange={(e) => setContributionForm((f) => ({ ...f, cta_text: e.target.value }))} placeholder="Learn more" /></div>
                  <div><Label>Icon</Label><select className="w-full border rounded-md px-3 py-2 bg-background" value={contributionForm.icon} onChange={(e) => setContributionForm((f) => ({ ...f, icon: e.target.value }))}>{ICON_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    <Button type="button" variant="outline" onClick={resetContributionForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
