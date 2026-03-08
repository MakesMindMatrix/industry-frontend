import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { CheckCircle, Lightbulb, ArrowRight, Sparkles, Loader2, FileText, Trash2, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  fetchIndustryCompetency,
  fetchCompetencyFromJd,
  getMyJDs,
  getCompetencyByJd,
  getJD,
  createCompetency,
  updateCompetency,
  deleteJD,
  type JDDraft,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Comp = { id: number; category: string; skills: string[]; weight: number; importance: string };
type FromJdState = {
  fromJd?: { title: string; jd: string };
  selectedJdId?: number;
  savedJd?: { id: number; title: string; status: string; createdAt?: string; updatedAt?: string };
};

function formatJdDate(jd: JDDraft): string {
  const raw = jd.updatedAt || jd.createdAt;
  if (!raw) return "";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function compsToSkillGroups(comps: Comp[]): unknown[] {
  return comps.map((c) => ({ id: c.id, category: c.category, skills: c.skills, weight: c.weight, importance: c.importance }));
}

function skillGroupsToComps(skillGroups: unknown[]): Comp[] {
  if (!Array.isArray(skillGroups)) return [];
  return skillGroups.map((g: unknown, i: number) => {
    const x = g as Record<string, unknown>;
    return {
      id: typeof x.id === "number" ? x.id : i + 1,
      category: typeof x.category === "string" ? x.category : "Category",
      skills: Array.isArray(x.skills) ? (x.skills as string[]) : [],
      weight: typeof x.weight === "number" ? x.weight : 50,
      importance: typeof x.importance === "string" ? x.importance : "Medium",
    };
  });
}

export default function CompetencyMatrix() {
  const location = useLocation();
  const state = location.state as FromJdState | undefined;
  const fromJd = state?.fromJd;
  const initialJdId = state?.selectedJdId;
  const savedJdFromState = state?.savedJd;

  const [competencies, setCompetencies] = useState<Comp[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [jdSource, setJdSource] = useState<{ title: string } | null>(null);
  const [jdList, setJdList] = useState<JDDraft[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<number | null>(() => initialJdId ?? null);
  const [matrixId, setMatrixId] = useState<number | null>(null);
  const [savingApproved, setSavingApproved] = useState(false);
  const [fromJdText, setFromJdText] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userChoseSavedJd, setUserChoseSavedJd] = useState(false);
  const navigate = useNavigate();

  const savedJdList = jdList.filter((j) => j.status === "published" || j.id === selectedJdId);

  const refetchJdList = () => {
    getMyJDs()
      .then(setJdList)
      .catch(() => {});
  };

  useEffect(() => {
    getMyJDs()
      .then((list) => {
        if (savedJdFromState && !list.some((j) => j.id === savedJdFromState.id)) {
          setJdList([{ ...savedJdFromState, jd: undefined }, ...list]);
        } else {
          setJdList(list);
        }
      })
      .catch(() => {});
  }, [savedJdFromState?.id]);

  useEffect(() => {
    setSaveError(null);
  }, [selectedJdId, matrixId]);

  useEffect(() => {
    if (fromJd?.jd && !userChoseSavedJd) {
      setLoading(true);
      setJdSource({ title: fromJd.title || "Job Description" });
      setFromJdText(fromJd.jd);
      setSelectedJdId(null);
      setMatrixId(null);
      fetchCompetencyFromJd({ title: fromJd.title, jd: fromJd.jd })
        .then((data) => {
          setCompetencies(Array.isArray(data.competencies) ? data.competencies : []);
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setApproved(false);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    if (selectedJdId != null) {
      setLoading(true);
      setFromJdText(null);
      const jdMeta = jdList.find((j) => j.id === selectedJdId) ?? (savedJdFromState?.id === selectedJdId ? savedJdFromState : null);
      setJdSource(jdMeta ? { title: jdMeta.title } : null);
      Promise.allSettled([
        getCompetencyByJd(selectedJdId),
        getJD(selectedJdId),
      ]).then(([compRes, jdRes]) => {
        if (compRes.status === "fulfilled" && compRes.value) {
          const data = compRes.value as { id: number; skillGroups?: unknown[]; approved?: boolean };
          setMatrixId(data.id);
          setCompetencies(skillGroupsToComps(data.skillGroups ?? []));
          setApproved(!!data.approved);
          setSuggestions([]);
        } else {
          setMatrixId(null);
          setCompetencies([]);
          setSuggestions([]);
          setApproved(false);
        }
        if (jdRes.status === "fulfilled" && jdRes.value && typeof jdRes.value === "object") {
          const jdData = jdRes.value as { jd?: string; title?: string };
          setFromJdText(jdData.jd ?? null);
          if (jdData.title) setJdSource({ title: jdData.title });
        }
      }).finally(() => setLoading(false));
      return;
    }
    setJdSource(null);
    setMatrixId(null);
    setFromJdText(null);
    fetchIndustryCompetency()
      .then((data) => {
        setCompetencies(Array.isArray(data.competencies) ? data.competencies : []);
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setApproved(false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fromJd?.jd, selectedJdId, userChoseSavedJd]);

  const updateWeight = (id: number, val: number[]) => {
    setCompetencies((prev) => prev.map((c) => (c.id === id ? { ...c, weight: val[0] } : c)));
  };

  const [calculating, setCalculating] = useState(false);
  const generateFromSelectedJd = async () => {
    if (selectedJdId == null) return;
    setCalculating(true);
    setSaveError(null);
    try {
      const jd = await getJD(selectedJdId) as { title?: string; jd?: string };
      const data = await fetchCompetencyFromJd({ title: jd.title || "JD", jd: jd.jd || "" });
      const comps = skillGroupsToComps(Array.isArray(data.competencies) ? data.competencies : []);
      const suggs = Array.isArray(data.suggestions) ? data.suggestions : [];
      setCompetencies(comps);
      setSuggestions(suggs);
      setApproved(false);
      if (comps.length > 0) {
        const skillGroups = compsToSkillGroups(comps);
        const created = await createCompetency({ job_description: selectedJdId, skillGroups, approved: false });
        const id = created?.id != null ? Number(created.id) : null;
        if (id != null) setMatrixId(id);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to calculate competency");
    } finally {
      setCalculating(false);
    }
  };

  const navigateToFindMatching = () => {
    navigate("/industry/shortlisting", {
      state: {
        matchContext: {
          competencies,
          jdSource: jdSource?.title ? { title: jdSource.title } : null,
          jdText: fromJd?.jd ?? fromJdText ?? undefined,
          competencyMatrixId: matrixId ?? undefined,
          jdId: jdIdForCompetency ?? undefined,
        },
      },
    });
  };

  const jdIdForCompetency = savedJdFromState?.id ?? selectedJdId;

  const saveMatrix = async () => {
    const skillGroups = compsToSkillGroups(competencies);
    setSavingMatrix(true);
    setSaveError(null);
    try {
      if (matrixId) {
        await updateCompetency(matrixId, { skillGroups, approved });
      } else if (jdIdForCompetency != null) {
        const created = await createCompetency({ job_description: jdIdForCompetency, skillGroups, approved: false });
        const id = created?.id != null ? Number(created.id) : null;
        if (id != null) setMatrixId(id);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save matrix");
    } finally {
      setSavingMatrix(false);
    }
  };

  const saveApprovedState = async () => {
    const skillGroups = compsToSkillGroups(competencies);
    setSavingApproved(true);
    setSaveError(null);
    try {
      if (matrixId) {
        await updateCompetency(matrixId, { skillGroups, approved: true });
      } else if (jdIdForCompetency != null) {
        const created = await createCompetency({ job_description: jdIdForCompetency, skillGroups, approved: true });
        const id = created?.id != null ? Number(created.id) : null;
        if (id != null) setMatrixId(id);
      }
      setApproved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingApproved(false);
    }
  };

  const handleApproveClick = async () => {
    setSaveError(null);
    if (matrixId || jdIdForCompetency != null) {
      setSavingApproved(true);
      try {
        const skillGroups = compsToSkillGroups(competencies);
        if (matrixId) {
          await updateCompetency(matrixId, { skillGroups, approved: true });
        } else if (jdIdForCompetency != null) {
          const created = await createCompetency({ job_description: jdIdForCompetency, skillGroups, approved: true });
          const id = created?.id != null ? Number(created.id) : null;
          if (id != null) setMatrixId(id);
        }
        setApproved(true);
        navigateToFindMatching();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to approve and save matrix");
      } finally {
        setSavingApproved(false);
      }
    } else {
      setApproved(true);
      navigateToFindMatching();
    }
  };

  const handleDeleteJd = async (id: number) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteJD(id);
      setJdList((prev) => prev.filter((j) => j.id !== id));
      if (selectedJdId === id) {
        const remaining = savedJdList.filter((j) => j.id !== id);
        setSelectedJdId(remaining.length > 0 ? remaining[0].id : null);
        setJdSource(null);
        setMatrixId(null);
        setCompetencies([]);
        setSuggestions([]);
        setApproved(false);
      }
    } catch (_) {}
    finally {
      setDeletingId(null);
    }
  };

  const noMatrixForJd = selectedJdId != null && !loading && matrixId == null && competencies.length === 0 && !fromJd?.jd;

  if (loading && competencies.length === 0 && !noMatrixForJd) {
    return (
      <div className="flex w-full min-h-0">
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-sidebar-border bg-sidebar/30 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">Saved JDs</p>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
            <p className="text-sm text-muted-foreground px-2 py-4">Loading…</p>
          </div>
        </aside>
        <div className="flex-1 p-4 min-w-0">
          <h2 className="text-2xl font-bold text-foreground">Competency Matrix</h2>
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-0">
      {/* Left: Saved JDs (sidebar width) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-sidebar-border bg-sidebar/30">
        <div className="p-3 border-b border-sidebar-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saved JDs</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {savedJdList.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-4">No saved JDs yet. Create one in AI JD Builder and approve to save.</p>
          ) : (
            savedJdList.map((j) => (
              <div
                key={j.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors",
                  selectedJdId === j.id
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-sidebar-accent/50"
                )}
                onClick={() => { setUserChoseSavedJd(true); setSelectedJdId(j.id); }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate" title={j.title || `Draft #${j.id}`}>
                      {j.title || `Draft #${j.id}`}
                    </p>
                    {j.status !== "published" && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">Draft</Badge>
                    )}
                  </div>
                  {formatJdDate(j) && (
                    <p className="text-xs text-muted-foreground">{formatJdDate(j)}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="View matrix"
                    onClick={(e) => { e.stopPropagation(); setUserChoseSavedJd(true); setSelectedJdId(j.id); }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Delete JD"
                    disabled={deletingId === j.id}
                    onClick={(e) => { e.stopPropagation(); handleDeleteJd(j.id); }}
                  >
                    {deletingId === j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right: Matrix content */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Competency Matrix</h2>
              <p className="text-muted-foreground mt-1">
                {jdSource
                  ? `AI-generated competencies for: ${jdSource.title}`
                  : "Select a JD from the left or create one to see its competency matrix."}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1 self-start">
              <Sparkles className="h-3 w-3" /> AI Generated
            </Badge>
          </div>

          {/* Calculate competency – selection is from SAVED JDs on the left */}
          {savedJdList.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {selectedJdId != null && noMatrixForJd && !loading && (
                <Button
                  onClick={generateFromSelectedJd}
                  disabled={calculating}
                  size="default"
                  className="shrink-0"
                >
                  {calculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {calculating ? "Calculating…" : "Calculate competency"}
                </Button>
              )}
              {selectedJdId != null && !noMatrixForJd && competencies.length > 0 && (
                <Badge variant="secondary" className="shrink-0">
                  Competency saved for this JD
                </Badge>
              )}
            </div>
          )}

          <div className="grid gap-4">
        {competencies.map((comp) => (
          <Card key={comp.id}>
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{comp.category}</h3>
                    <Badge variant={comp.importance === "Critical" ? "destructive" : comp.importance === "High" ? "default" : "secondary"} className="text-xs">
                      {comp.importance}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(comp.skills) ? comp.skills : []).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div className="w-full sm:w-48 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Weight</span>
                    <span className="font-semibold text-foreground">{comp.weight}%</span>
                  </div>
                  <Slider value={[comp.weight]} onValueChange={(v) => updateWeight(comp.id, v)} max={100} step={5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(Array.isArray(suggestions) ? suggestions : []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">•</span> {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{saveError}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {(jdIdForCompetency != null || matrixId != null) && competencies.length > 0 && (
          <Button
            variant="outline"
            onClick={saveMatrix}
            size="lg"
            className="rounded-xl"
            disabled={savingMatrix || savingApproved}
          >
            {savingMatrix ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            {savingMatrix ? "Saving…" : "Save matrix"}
          </Button>
        )}
        {!approved ? (
          <Button onClick={handleApproveClick} size="lg" className="rounded-xl" disabled={savingApproved}>
            {savingApproved ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {savingApproved ? "Saving…" : "Approve & go to Talent Discovery"}
          </Button>
        ) : (
          <Button
            onClick={() =>
              navigate("/industry/shortlisting", {
                state: {
                  matchContext: {
                    competencies,
                    jdSource: jdSource?.title ? { title: jdSource.title } : null,
                    jdText: fromJd?.jd ?? fromJdText ?? undefined,
                  },
                },
              })
            }
            size="lg"
            className="rounded-xl"
          >
            Find Matching Students <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
        {approved && (
          <Badge variant="outline" className="gap-1 py-2 px-4 text-accent border-accent">
            <CheckCircle className="h-4 w-4" /> Approved
          </Badge>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
