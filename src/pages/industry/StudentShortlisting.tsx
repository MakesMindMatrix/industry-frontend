import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Mail, Star, GraduationCap, Filter, Sparkles, FileText, Loader2, ChevronDown, ChevronUp, UserPlus, Calendar, CheckSquare, Square } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "react-router-dom";
import { fetchMatchLearners, fetchMatchLearnersBackground, fetchMatchResults, getMyJDs, getJD, getCompetencyByJd, shortlistMatchResults, scheduleMatchResults, getSessionState, setSessionState, SESSION_KEYS, type ScheduleInterviewDetails } from "@/lib/api";
import type { JDDraft, StudentCompetencySkillGroup } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Learner = {
  id: string;
  name: string;
  user_category?: string;
  education_level?: string;
  specialisation?: string;
  master_college?: { name?: string } | null;
  university?: { name?: string } | null;
  branch?: { name?: string } | null;
  career_aspiration?: { title?: string } | null;
  user?: { email?: string; username?: string } | null;
  career_interests?: { interests?: Array<{ career_interest?: string }> } | null;
  studentCompetencyMatrix?: StudentCompetencySkillGroup[];
  matchScore?: number;
  documentId?: string;
};

type MatchContext = {
  competencies: { id?: number; category?: string; skills?: string[]; weight?: number; importance?: string }[];
  jdSource: { title: string } | null;
  jdText?: string;
  competencyMatrixId?: number;
  jdId?: number;
};

type TalentDiscoverySession = {
  selectedJdId: number | null;
  learners: Learner[];
  filters: { name: string; user_category: string; education_level: string; college: string; branch: string };
};

type LearnersResponse = { data: Learner[]; meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } } };

const USER_CATEGORIES = ["college", "industry", "independent"];
const EDUCATION_LEVELS = ["High School", "Diploma", "Bachelors", "Masters", "Certification", "Associate Degree", "Doctorate", "BTech", "MCA", "B.E", "B.Tech", "M.Sc", "M.Com", "Commerce", "Science", "Arts", "Vocational"];

// Strapi v4: filters[field][operator]=value; relation: filters[relation][field][$contains]=value
function buildLearnersParams(filters: {
  name?: string;
  user_category?: string;
  education_level?: string;
  college?: string;
  branch?: string;
  page?: number;
  pageSize?: number;
}): Record<string, string> {
  const params: Record<string, string> = { populate: "*" };
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);
  if (filters.name?.trim()) params["filters[name][$contains]"] = filters.name.trim();
  if (filters.user_category) params["filters[user_category][$eq]"] = filters.user_category;
  if (filters.education_level) params["filters[education_level][$eq]"] = filters.education_level;
  if (filters.college?.trim()) params["filters[master_college][name][$contains]"] = filters.college.trim();
  if (filters.branch?.trim()) params["filters[branch][name][$contains]"] = filters.branch.trim();
  return params;
}

function formatJdDate(jd: JDDraft): string {
  const raw = jd.updatedAt || jd.createdAt;
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const DEFAULT_FILTERS = { name: "", user_category: "", education_level: "", college: "", branch: "" };

function readTalentDiscoverySession(): Partial<TalentDiscoverySession> | null {
  return getSessionState<Partial<TalentDiscoverySession>>(SESSION_KEYS.TALENT_DISCOVERY);
}

export default function StudentShortlisting() {
  const location = useLocation();
  const matchContextFromState = (location.state as { matchContext?: MatchContext })?.matchContext;
  const [learners, setLearners] = useState<Learner[]>(() => {
    const s = readTalentDiscoverySession();
    return Array.isArray(s?.learners) ? s.learners : [];
  });
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [jdsWithMatrix, setJdsWithMatrix] = useState<JDDraft[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<number | null>(() => readTalentDiscoverySession()?.selectedJdId ?? null);
  const [selectedMatchContext, setSelectedMatchContext] = useState<MatchContext | null>(null);
  const [loadingJdContext, setLoadingJdContext] = useState(false);
  const effectiveMatchContext = selectedMatchContext ?? matchContextFromState;
  const [aiFilters, setAiFilters] = useState<{
    branchNames: string[];
    careerAspirationTitles: string[];
    specialisations: string[];
    careerInterests: string[];
  } | null>(null);
  const [filters, setFilters] = useState(() => {
    const s = readTalentDiscoverySession();
    const f = s?.filters;
    return f && typeof f.name === "string" ? f : DEFAULT_FILTERS;
  });
  const [expandedCompetencyId, setExpandedCompetencyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduleDocIds, setScheduleDocIds] = useState<string[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", location: "", type: "" as "" | "virtual" | "in-person" | "online" });
  const [pollingId, setPollingId] = useState<ReturnType<typeof setInterval> | null>(null);

  // Persist state to session so it survives navigation until refresh or logout
  useEffect(() => {
    setSessionState(SESSION_KEYS.TALENT_DISCOVERY, {
      selectedJdId,
      learners,
      filters,
    } as TalentDiscoverySession);
  }, [selectedJdId, learners, filters]);

  // Clear students when no JD is selected — show only students related to a JD (match results or AI stream)
  useEffect(() => {
    if (selectedJdId == null && !matchContextFromState?.competencyMatrixId && !matchContextFromState?.jdId) {
      setLearners([]);
      setTotal(0);
    }
  }, [selectedJdId, matchContextFromState?.competencyMatrixId, matchContextFromState?.jdId]);

  // Filter current (JD-related) learners client-side; no general API fetch
  const filteredLearners = useMemo(() => {
    if (!filters.name && !filters.user_category && !filters.education_level && !filters.college && !filters.branch) return learners;
    return learners.filter((s) => {
      if (filters.name?.trim() && !(s.name || "").toLowerCase().includes(filters.name.trim().toLowerCase())) return false;
      if (filters.user_category && (s.user_category || "") !== filters.user_category) return false;
      if (filters.education_level && (s.education_level || "") !== filters.education_level) return false;
      const college = (s.master_college as { name?: string } | null)?.name ?? (s.university as { name?: string } | null)?.name ?? "";
      if (filters.college?.trim() && !college.toLowerCase().includes(filters.college.trim().toLowerCase())) return false;
      const branch = (s.branch as { name?: string } | null)?.name ?? "";
      if (filters.branch?.trim() && !branch.toLowerCase().includes(filters.branch.trim().toLowerCase())) return false;
      return true;
    });
  }, [learners, filters.name, filters.user_category, filters.education_level, filters.college, filters.branch]);

  useEffect(() => {
    getMyJDs()
      .then((list) => {
        const withMatrix = list.filter((j) => j.status === "published" && j.competency_matrix?.id);
        setJdsWithMatrix(withMatrix);
        setSelectedJdId((prev) => {
          if (prev != null && !withMatrix.some((j) => j.id === prev)) return null;
          return prev;
        });
      })
      .catch(() => setJdsWithMatrix([]));
  }, []);

  useEffect(() => {
    if (selectedJdId == null) {
      setSelectedMatchContext(null);
      return;
    }
    setLoadingJdContext(true);
    setSelectedMatchContext(null);
    Promise.allSettled([getJD(selectedJdId), getCompetencyByJd(selectedJdId)])
      .then(([jdRes, compRes]) => {
        if (jdRes.status !== "fulfilled" || compRes.status !== "fulfilled") return;
        const jd = jdRes.value as { title?: string; jd?: string };
        const comp = compRes.value as { id?: number; skillGroups?: { category?: string; skills?: string[]; weight?: number; importance?: string }[] };
        setSelectedMatchContext({
          jdSource: jd?.title ? { title: jd.title } : null,
          jdText: jd?.jd,
          competencies: comp?.skillGroups ?? [],
          competencyMatrixId: comp?.id,
          jdId: selectedJdId ?? undefined,
        });
      })
      .catch(() => setSelectedMatchContext(null))
      .finally(() => setLoadingJdContext(false));
  }, [selectedJdId]);

  const applyFilters = () => {}; // Filters apply live to JD-related students (no general fetch)

  const runMatchWithAi = useCallback(() => {
    const ctx = selectedMatchContext ?? matchContextFromState;
    if (!ctx?.competencies?.length && !ctx?.jdText) return;
    setMatchLoading(true);
    setAiFilters(null);
    setSelectedIds(new Set());
    setLearners([]);
    const matrixId = ctx.competencyMatrixId ?? undefined;
    const jdId = ctx.jdId ?? undefined;
    if (ctx.competencyMatrixId || ctx.jdId) {
      fetchMatchLearnersBackground({
        competencies: ctx.competencies,
        competencyMatrixId: ctx.competencyMatrixId,
        jdId: ctx.jdId,
      })
        .then(() => {
          const id = setInterval(() => {
            fetchMatchResults({ competencyMatrixId: matrixId, jdId })
              .then((r) => {
                const list = Array.isArray(r.data) ? (r.data as Learner[]) : [];
                setLearners(list);
                if (list.length > 0) {
                  setMatchLoading(false);
                  setPollingId((prev) => {
                    if (prev) clearInterval(prev);
                    return null;
                  });
                }
              })
              .catch(() => {});
          }, 2000);
          setPollingId(id);
          setTimeout(() => {
            setMatchLoading(false);
            setPollingId((prev) => {
              if (prev) clearInterval(prev);
              return null;
            });
          }, 120000);
        })
        .catch(() => setMatchLoading(false));
    } else {
      fetchMatchLearners({
        jdText: ctx.jdText,
        title: ctx.jdSource?.title,
        competencies: ctx.competencies,
      })
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : [];
          const above80 = data.filter((l: { matchScore?: number }) => (l.matchScore ?? 0) >= 80);
          setLearners(above80);
          setTotal(above80.length);
          setPage(1);
          setAiFilters(res.suggestedFilters ?? null);
        })
        .catch(() => {
          setLearners([]);
          setTotal(0);
          setAiFilters(null);
        })
        .finally(() => setMatchLoading(false));
    }
  }, [selectedMatchContext, matchContextFromState]);

  useEffect(() => {
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [pollingId]);

  // Load saved match results when user selects a JD from dropdown (or when returning to page — refetch so we see latest)
  useEffect(() => {
    const matrixId = selectedMatchContext?.competencyMatrixId;
    const jdId = selectedMatchContext?.jdId;
    if ((matrixId != null || jdId != null) && !matchLoading) {
      fetchMatchResults({ competencyMatrixId: matrixId ?? undefined, jdId: jdId ?? undefined })
        .then((r) => setLearners(Array.isArray(r.data) ? (r.data as Learner[]) : []))
        .catch(() => {});
    }
  }, [selectedMatchContext?.competencyMatrixId, selectedMatchContext?.jdId, matchLoading]);

  // When we have a JD selected but 0 learners (e.g. user came back while matching was in progress), poll briefly to pick up results
  useEffect(() => {
    const matrixId = selectedMatchContext?.competencyMatrixId;
    const jdId = selectedMatchContext?.jdId;
    if ((matrixId == null && jdId == null) || matchLoading || learners.length > 0) return;
    let count = 0;
    const maxPolls = 10;
    const interval = setInterval(() => {
      count += 1;
      fetchMatchResults({ competencyMatrixId: matrixId ?? undefined, jdId: jdId ?? undefined })
        .then((r) => {
          const list = Array.isArray(r.data) ? (r.data as Learner[]) : [];
          if (list.length > 0) setLearners(list);
        })
        .catch(() => {});
      if (count >= maxPolls) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedMatchContext?.competencyMatrixId, selectedMatchContext?.jdId, matchLoading, learners.length]);

  // When landing from Competency Matrix with context, auto-run stream match so students appear in real time (saved to JD in background)
  useEffect(() => {
    if (matchContextFromState && (matchContextFromState.competencies?.length > 0 || matchContextFromState.jdText) && (matchContextFromState.competencyMatrixId != null || matchContextFromState.jdId != null)) {
      runMatchWithAi();
    }
  }, []);

  const collegeName = (l: Learner) => l.master_college?.name ?? "—";
  const branchName = (l: Learner) => l.branch?.name ?? "—";
  const careerAspiration = (l: Learner) => l.career_aspiration?.title ?? null;
  const interests = (l: Learner) => {
    const raw = Array.isArray(l.career_interests?.interests) ? l.career_interests.interests : [];
    return raw.slice(0, 3).map((i) => i?.career_interest).filter(Boolean) as string[];
  };
  const levelLabel = (level: number) => {
    if (level <= 1) return "Beginner";
    if (level === 2) return "Basic";
    if (level === 3) return "Intermediate";
    if (level === 4) return "Advanced";
    return "Expert";
  };
  const getStudentDocId = (l: Learner) => (l.documentId != null ? String(l.documentId) : (l.id != null ? String(l.id) : ""));
  const toggleSelect = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };
  const effectiveMatrixId = effectiveMatchContext?.competencyMatrixId ?? selectedMatchContext?.competencyMatrixId ?? undefined;
  const selectedDocIds = Array.from(selectedIds);

  const handleShortlist = async (docIds: string[]) => {
    if (effectiveMatrixId == null || docIds.length === 0) return;
    setShortlistLoading(true);
    try {
      await shortlistMatchResults(effectiveMatrixId, docIds);
    } finally {
      setShortlistLoading(false);
    }
  };
  const openScheduleSheet = (docIds: string[]) => {
    if (effectiveMatrixId == null || docIds.length === 0) return;
    setScheduleDocIds(docIds);
    setScheduleForm({ date: "", time: "", location: "", type: "" });
    setScheduleSheetOpen(true);
  };
  const handleScheduleSubmit = async () => {
    if (effectiveMatrixId == null || scheduleDocIds.length === 0) return;
    setScheduleLoading(true);
    try {
      const details: ScheduleInterviewDetails = {
        interviewDate: scheduleForm.date || undefined,
        interviewTime: scheduleForm.time || undefined,
        interviewLocation: scheduleForm.location || undefined,
        interviewType: scheduleForm.type || undefined,
      };
      await scheduleMatchResults(effectiveMatrixId, scheduleDocIds, details);
      setScheduleSheetOpen(false);
      setScheduleDocIds([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Talent Discovery</h2>
          <p className="text-muted-foreground mt-1">Browse and filter students by profile. Data from MindMatrix learners.</p>
        </div>
        {effectiveMatrixId != null && learners.some((l) => typeof (l as Learner).matchScore === "number") && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedDocIds.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  disabled={shortlistLoading}
                  onClick={() => handleShortlist(selectedDocIds)}
                  className="gap-1.5"
                >
                  {shortlistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Shortlist ({selectedDocIds.length})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={scheduleLoading}
                  onClick={() => openScheduleSheet(selectedDocIds)}
                  className="gap-1.5"
                >
                  {scheduleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                  Schedule interview ({selectedDocIds.length})
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Saved JDs linked to competency matrix — choose one to run matches */}
      {jdsWithMatrix.length > 0 && (
        <Card className="border-primary/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4" /> Saved JDs (linked to competency matrix)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedJdId != null && jdsWithMatrix.some((j) => j.id === selectedJdId) ? String(selectedJdId) : ""}
                onValueChange={(v) => setSelectedJdId(v ? Number(v) : null)}
                disabled={loadingJdContext}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Choose a JD to find matches…" />
                </SelectTrigger>
                <SelectContent>
                  {jdsWithMatrix.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.title || `JD #${j.id}`}
                      {formatJdDate(j) ? ` · ${formatJdDate(j)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingJdContext && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {effectiveMatchContext && (effectiveMatchContext.competencies?.length > 0 || effectiveMatchContext.jdText) && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                <Button onClick={runMatchWithAi} disabled={matchLoading} size="sm" className="gap-1.5">
                  {matchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {matchLoading ? "Matching…" : "See AI matches"}
                </Button>
                {effectiveMatchContext.jdSource?.title && (
                  <Badge variant="outline" className="text-xs">{effectiveMatchContext.jdSource.title}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/10">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name..."
                  value={filters.name}
                  onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={filters.user_category || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, user_category: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  {USER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Education</Label>
              <Select value={filters.education_level || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, education_level: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  {EDUCATION_LEVELS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">College (contains)</Label>
              <Input
                placeholder="College name..."
                value={filters.college}
                onChange={(e) => setFilters((f) => ({ ...f, college: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch (contains)</Label>
              <Input
                placeholder="Branch..."
                value={filters.branch}
                onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={applyFilters} size="sm" className="gap-1">
            <Search className="h-3.5 w-3.5" /> Apply filters
          </Button>
        </CardContent>
      </Card>

      {(loading || matchLoading) && (
        <p className="text-muted-foreground">{matchLoading ? "Matching students with AI…" : "Loading learners…"}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && filteredLearners.map((s, idx) => (
          <Card key={getStudentDocId(s) || (s as { id?: string }).id || `student-${idx}`} className="hover:shadow-md transition-shadow flex flex-col">
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground truncate">{s.name || "—"}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
{typeof s.matchScore === "number" && (
                      <Badge variant="default" className="text-xs bg-primary">
                      Match {s.matchScore}%
                    </Badge>
                  )}
                  {s.user_category && (
                    <Badge variant="outline" className="text-xs">{s.user_category}</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" /> {collegeName(s)}
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground/80">Branch:</span> {branchName(s)}</p>
                {s.specialisation && (
                  <p><span className="font-medium text-foreground/80">Specialisation:</span> {s.specialisation}</p>
                )}
                {careerAspiration(s) && (
                  <p><span className="font-medium text-foreground/80">Career aspiration:</span> {careerAspiration(s)}</p>
                )}
                {s.education_level && <p><span className="font-medium text-foreground/80">Education:</span> {s.education_level}</p>}
              </div>
              {Array.isArray(s.studentCompetencyMatrix) && s.studentCompetencyMatrix.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between gap-2 h-8 text-xs font-medium text-foreground/80"
                    onClick={() => setExpandedCompetencyId((id) => (id === (getStudentDocId(s) || s.id) ? null : getStudentDocId(s) || String(s.id)))}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Competency matrix
                    </span>
                    {expandedCompetencyId === (getStudentDocId(s) || s.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                  {expandedCompetencyId === (getStudentDocId(s) || s.id) && (
                    <div className="mt-2 space-y-3 rounded-md bg-muted/50 p-3 text-xs">
                      {s.studentCompetencyMatrix.map((grp, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-foreground mb-1">{grp.category || "Category"}</p>
                          <ul className="space-y-0.5 pl-2">
                            {(grp.skills ?? []).map((sk, i) => (
                              <li key={i} className="flex justify-between gap-2">
                                <span className="text-muted-foreground">{sk.skill ?? "—"}</span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {levelLabel(sk.level ?? 0)}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {interests(s).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                  {interests(s).map((st) => (
                    <Badge key={st} variant="secondary" className="text-xs">{st}</Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t shrink-0">
                {effectiveMatrixId != null && (
                  <>
                    <Button
                      variant={selectedIds.has(getStudentDocId(s)) ? "default" : "outline"}
                      size="sm"
                      className="gap-1"
                      onClick={() => toggleSelect(getStudentDocId(s))}
                    >
                      {selectedIds.has(getStudentDocId(s)) ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      Select
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={shortlistLoading}
                      onClick={() => handleShortlist([getStudentDocId(s)])}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Shortlist
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={scheduleLoading}
                      onClick={() => openScheduleSheet([getStudentDocId(s)])}
                    >
                      <Calendar className="h-3.5 w-3.5" /> Schedule
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="gap-1 flex-1">
                  <Star className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" className="gap-1 flex-1" asChild>
                  <a href={s.user?.email ? `mailto:${s.user.email}` : "#"}>
                    <Mail className="h-3.5 w-3.5" /> Contact
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && !matchLoading && learners.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {!effectiveMatchContext ? (
            <>
              <p className="font-medium text-foreground">Choose a JD to find matches</p>
              <p className="text-sm mt-2">Select a job description from the dropdown above. Students are shown only when they are matched to that JD.</p>
            </>
          ) : (
            <>
              <p>No students yet for this JD.</p>
              <p className="text-sm mt-2">Click &quot;See AI matches&quot; above to find and display students matched to this job description.</p>
            </>
          )}
        </div>
      )}

      {!loading && !matchLoading && filteredLearners.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredLearners.length} student{filteredLearners.length !== 1 ? "s" : ""} for this JD
            {learners.length !== filteredLearners.length && ` (filtered from ${learners.length})`}
          </span>
        </div>
      )}

      <Sheet open={scheduleSheetOpen} onOpenChange={setScheduleSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Schedule interview</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Address or meeting link"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={scheduleForm.type || "virtual"}
                onValueChange={(v) => setScheduleForm((f) => ({ ...f, type: v as "virtual" | "in-person" | "online" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in-person">In-person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduling {scheduleDocIds.length} student{scheduleDocIds.length !== 1 ? "s" : ""} for this JD.
            </p>
            <Button onClick={handleScheduleSubmit} disabled={scheduleLoading} className="w-full gap-2">
              {scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              {scheduleLoading ? "Saving…" : "Schedule interview"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
