import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Mail, Star, GraduationCap, Filter, Sparkles, FileText, Loader2, Eye, UserPlus, Calendar, CheckSquare, Square, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "react-router-dom";
import { fetchMatchLearners, fetchMatchLearnersBackground, fetchMatchResults, getMyJDs, getJD, getCompetencyByJd, updateCompetency, shortlistMatchResults, scheduleMatchResults, getSessionState, setSessionState, SESSION_KEYS, fetchFilterOptions, type ScheduleInterviewDetails } from "@/lib/api";
import type { JDDraft, StudentCompetencySkillGroup } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Learner = {
  id: string;
  name: string;
  user_category?: string;
  education_level?: string;
  specialisation?: string;
  designation?: string;
  total_years_of_experience?: string;
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
  vacancies?: number;
};

type FilterState = {
  name: string;
  education_level: string;
  college: string;
  branch: string;
  specialisation: string;
  university: string;
  minScore: string; // '' = use backend default (9); '3'..'10' = minimum quiz score for match pool
};
type TalentDiscoverySession = {
  selectedJdId: number | null;
  learners: Learner[];
  filters: FilterState;
};

type LearnersResponse = { data: Learner[]; meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } } };

const EDUCATION_LEVELS = ["High School", "Diploma", "Bachelors", "Masters", "Certification", "Associate Degree", "Doctorate", "BTech", "MCA", "B.E", "B.Tech", "M.Sc", "M.Com", "Commerce", "Science", "Arts", "Vocational"];
const SPECIALISATIONS = ["B.E", "B.Tech", "M.Tech", "MCA", "M.Sc", "Commerce", "Science", "Arts", "Other"];

function formatJdDate(jd: JDDraft): string {
  const raw = jd.updatedAt || jd.createdAt;
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const DEFAULT_FILTERS: FilterState = {
  name: "",
  education_level: "",
  college: "",
  branch: "",
  specialisation: "",
  university: "",
  minScore: "",
};

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
  const [selectedJdId, setSelectedJdId] = useState<number | null>(() => {
    const fromState = (location.state as { matchContext?: MatchContext })?.matchContext?.jdId;
    if (fromState != null) return fromState;
    return readTalentDiscoverySession()?.selectedJdId ?? null;
  });
  const [selectedMatchContext, setSelectedMatchContext] = useState<MatchContext | null>(null);
  const [loadingJdContext, setLoadingJdContext] = useState(false);
  const effectiveMatchContext = selectedMatchContext ?? matchContextFromState;
  const [aiFilters, setAiFilters] = useState<{
    branchNames: string[];
    careerAspirationTitles: string[];
    specialisations: string[];
    careerInterests: string[];
  } | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => {
    const s = readTalentDiscoverySession();
    const f = s?.filters;
    if (!f || typeof f.name !== "string") return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...f };
  });
  const [studentDetailPopup, setStudentDetailPopup] = useState<Learner | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduleDocIds, setScheduleDocIds] = useState<string[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", location: "", type: "" as "" | "virtual" | "in-person" | "online" });
  const [pollingId, setPollingId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ colleges: string[]; branches: string[]; specialisations: string[]; universities: string[] }>({ colleges: [], branches: [], specialisations: [], universities: [] });
  const [vacancies, setVacancies] = useState<number>(1);
  const [savingVacancies, setSavingVacancies] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

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

  // Filter current (JD-related) learners client-side; all filter fields applied
  const filteredLearners = useMemo(() => {
    const hasActive =
      filters.name?.trim() ||
      filters.education_level ||
      filters.college?.trim() ||
      filters.branch?.trim() ||
      filters.specialisation?.trim() ||
      filters.university?.trim();
    if (!hasActive) return learners;
    return learners.filter((s) => {
      if (filters.name?.trim() && !(s.name || "").toLowerCase().includes(filters.name.trim().toLowerCase())) return false;
      if (filters.education_level && (s.education_level || "") !== filters.education_level) return false;
      const college = (s.master_college as { name?: string } | null)?.name ?? "";
      if (filters.college?.trim() && !college.toLowerCase().includes(filters.college.trim().toLowerCase())) return false;
      const branch = (s.branch as { name?: string } | null)?.name ?? "";
      if (filters.branch?.trim() && !branch.toLowerCase().includes(filters.branch.trim().toLowerCase())) return false;
      const university = (s.university as { name?: string } | null)?.name ?? "";
      if (filters.university?.trim() && !university.toLowerCase().includes(filters.university.trim().toLowerCase())) return false;
      if (filters.specialisation?.trim() && (s.specialisation || "").toLowerCase() !== filters.specialisation.trim().toLowerCase()) return false;
      return true;
    });
  }, [learners, filters]);

  useEffect(() => {
    getMyJDs()
      .then((list) => {
        const withMatrix = list.filter((j) => j.status === "published" && j.competency_matrix?.id);
        const matchJdId = matchContextFromState?.jdId;
        const matchJdTitle = matchContextFromState?.jdSource?.title;
        const needsSynthetic = matchJdId != null && !withMatrix.some((j) => j.id === matchJdId) && matchJdTitle;
        const merged: JDDraft[] = needsSynthetic
          ? [{ id: matchJdId!, title: matchJdTitle!, status: "published", competency_matrix: matchContextFromState?.competencyMatrixId ? { id: matchContextFromState.competencyMatrixId } : undefined } as JDDraft, ...withMatrix]
          : withMatrix;
        setJdsWithMatrix(merged);
        setSelectedJdId((prev) => {
          if (prev != null && !merged.some((j) => j.id === prev)) return null;
          return prev;
        });
      })
      .catch(() => setJdsWithMatrix([]));
  }, [matchContextFromState?.jdId, matchContextFromState?.jdSource?.title, matchContextFromState?.competencyMatrixId]);

  useEffect(() => {
    fetchFilterOptions()
      .then(setFilterOptions)
      .catch(() => setFilterOptions({ colleges: [], branches: [], specialisations: [], universities: [] }));
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
        const savedVacancies = comp?.vacancies != null ? Math.max(1, comp.vacancies) : 1;
        setVacancies(savedVacancies);
        setSelectedMatchContext({
          jdSource: jd?.title ? { title: jd.title } : null,
          jdText: jd?.jd,
          competencies: comp?.skillGroups ?? [],
          competencyMatrixId: comp?.id,
          jdId: selectedJdId ?? undefined,
          vacancies: savedVacancies,
        });
      })
      .catch(() => setSelectedMatchContext(null))
      .finally(() => setLoadingJdContext(false));
  }, [selectedJdId]);

  const activeFilterCount = [
    filters.name?.trim(),
    filters.education_level,
    filters.college?.trim(),
    filters.branch?.trim(),
    filters.specialisation?.trim(),
    filters.university?.trim(),
    filters.minScore?.trim(),
  ].filter(Boolean).length;
  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const runMatchWithAi = useCallback(() => {
    const ctx = selectedMatchContext ?? matchContextFromState;
    if (!ctx?.competencies?.length && !ctx?.jdText) return;
    setMatchLoading(true);
    setMatchError(null);
    setAiFilters(null);
    setSelectedIds(new Set());
    setLearners([]);
    const matrixId = ctx.competencyMatrixId ?? undefined;
    const jdId = ctx.jdId ?? undefined;
    const filterPayload = {
      education_level: filters.education_level?.trim() || undefined,
      college: filters.college?.trim() || undefined,
      branch: filters.branch?.trim() || undefined,
      specialisation: filters.specialisation?.trim() || undefined,
      university: filters.university?.trim() || undefined,
    };
    const hasFilters = !!filterPayload.education_level || !!filterPayload.college || !!filterPayload.branch || !!filterPayload.specialisation || !!filterPayload.university;
    const minScoreNum = filters.minScore?.trim() ? Math.min(10, Math.max(3, parseInt(filters.minScore, 10))) : undefined;
    const minScoreParam = minScoreNum != null && !Number.isNaN(minScoreNum) ? minScoreNum : undefined;
    const vacanciesNum = Math.max(1, Math.min(999, Math.floor(Number(vacancies) || 1)));
    if (ctx.competencyMatrixId || ctx.jdId) {
      fetchMatchLearnersBackground({
        competencies: ctx.competencies,
        competencyMatrixId: ctx.competencyMatrixId,
        jdId: ctx.jdId,
        filters: hasFilters ? filterPayload : undefined,
        minScore: minScoreParam,
        vacancies: vacanciesNum,
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
        .catch((err) => {
          setMatchLoading(false);
          setMatchError(err instanceof Error ? err.message : "Failed to start matching");
        });
    } else {
      fetchMatchLearners({
        jdText: ctx.jdText,
        title: ctx.jdSource?.title,
        competencies: ctx.competencies,
        filters: hasFilters ? filterPayload : undefined,
        minScore: minScoreParam,
        vacancies: vacanciesNum,
      })
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : [];
          setLearners(data);
          setTotal(data.length);
          setPage(1);
          setAiFilters(res.suggestedFilters ?? null);
        })
        .catch((err) => {
          setLearners([]);
          setTotal(0);
          setAiFilters(null);
          setMatchError(err instanceof Error ? err.message : "Failed to match learners");
        })
        .finally(() => setMatchLoading(false));
    }
  }, [selectedMatchContext, matchContextFromState, filters, vacancies]);

  useEffect(() => {
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [pollingId]);

  const effectiveMatrixId = effectiveMatchContext?.competencyMatrixId ?? undefined;
  const effectiveJdId = effectiveMatchContext?.jdId ?? undefined;

  const refetchMatchResults = useCallback(() => {
    if (effectiveMatrixId == null && effectiveJdId == null) return;
    setRefetching(true);
    fetchMatchResults({ competencyMatrixId: effectiveMatrixId, jdId: effectiveJdId })
      .then((r) => setLearners(Array.isArray(r.data) ? (r.data as Learner[]) : []))
      .catch(() => {})
      .finally(() => setRefetching(false));
  }, [effectiveMatrixId, effectiveJdId]);

  // When landing from Competency Matrix, ensure JD is in list for dropdown even before getMyJDs returns
  const displayJdList = useMemo(() => {
    if (jdsWithMatrix.length > 0) return jdsWithMatrix;
    const jdId = matchContextFromState?.jdId;
    const title = matchContextFromState?.jdSource?.title;
    if (jdId != null && title) {
      return [{ id: jdId, title, status: "published" as const, competency_matrix: matchContextFromState?.competencyMatrixId ? { id: matchContextFromState.competencyMatrixId } : undefined } as JDDraft];
    }
    return [];
  }, [jdsWithMatrix, matchContextFromState?.jdId, matchContextFromState?.jdSource?.title, matchContextFromState?.competencyMatrixId]);

  // Clear error when JD/context changes
  useEffect(() => {
    setMatchError(null);
  }, [selectedJdId, effectiveMatchContext?.competencyMatrixId, effectiveMatchContext?.jdId]);

  // Load saved match results when we have a JD/matrix (from dropdown or from Competency Matrix navigation)
  useEffect(() => {
    if ((effectiveMatrixId != null || effectiveJdId != null) && !matchLoading) {
      fetchMatchResults({ competencyMatrixId: effectiveMatrixId, jdId: effectiveJdId })
        .then((r) => setLearners(Array.isArray(r.data) ? (r.data as Learner[]) : []))
        .catch(() => {});
    }
  }, [effectiveMatrixId, effectiveJdId, matchLoading]);

  // When we have a JD selected but 0 learners (e.g. user came back while matching was in progress), poll to pick up results
  useEffect(() => {
    if ((effectiveMatrixId == null && effectiveJdId == null) || matchLoading || learners.length > 0) return;
    let count = 0;
    const maxPolls = 40;
    const interval = setInterval(() => {
      count += 1;
      fetchMatchResults({ competencyMatrixId: effectiveMatrixId, jdId: effectiveJdId })
        .then((r) => {
          const list = Array.isArray(r.data) ? (r.data as Learner[]) : [];
          if (list.length > 0) setLearners(list);
        })
        .catch(() => {});
      if (count >= maxPolls) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [effectiveMatrixId, effectiveJdId, matchLoading, learners.length]);

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Talent Discovery</h1>
          <p className="text-sm text-muted-foreground mt-1">Find and shortlist candidates matched to your job requirements.</p>
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

      {/* JD selection + Filters + AI match — show when we have JDs or matchContext from Competency Matrix */}
      {(jdsWithMatrix.length > 0 || (matchContextFromState?.jdId != null && (matchContextFromState?.competencies?.length > 0 || matchContextFromState?.jdText))) && (
        <Card className="border border-border/60 shadow-sm bg-card">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">Job description</span>
              {effectiveMatchContext?.jdSource?.title && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {effectiveMatchContext.jdSource.title}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedJdId != null && displayJdList.some((j) => j.id === selectedJdId) ? String(selectedJdId) : ""}
                onValueChange={(v) => setSelectedJdId(v ? Number(v) : null)}
                disabled={loadingJdContext}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Choose a JD to find matches…" />
                </SelectTrigger>
                <SelectContent>
                  {displayJdList.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.title || `JD #${j.id}`}
                      {formatJdDate(j) ? ` · ${formatJdDate(j)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {effectiveMatchContext?.competencyMatrixId && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Vacancies</Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={vacancies}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 1) setVacancies(v);
                      else if (e.target.value === "") setVacancies(1);
                    }}
                    onBlur={async (e) => {
                      const v = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1));
                      setVacancies(v);
                      if (effectiveMatchContext?.competencyMatrixId && v !== (effectiveMatchContext.vacancies ?? 1)) {
                        setSavingVacancies(true);
                        updateCompetency(effectiveMatchContext.competencyMatrixId, { vacancies: v })
                          .then(() => setSelectedMatchContext((prev) => prev ? { ...prev, vacancies: v } : null))
                          .catch(() => {})
                          .finally(() => setSavingVacancies(false));
                      }
                    }}
                    className="w-16 h-9"
                  />
                  {savingVacancies && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              )}
              {loadingJdContext && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Filters commented out for now
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground text-sm">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {activeFilterCount} active
                    </Badge>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search name..."
                      value={filters.name}
                      onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Education</Label>
                  <Select value={filters.education_level || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, education_level: v === "any" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {EDUCATION_LEVELS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">College</Label>
                  <Select value={filters.college || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, college: v === "any" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="College name..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {filterOptions.colleges.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
                  <Select value={filters.branch || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, branch: v === "any" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Branch..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {filterOptions.branches.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Specialisation</Label>
                  <Select value={filters.specialisation || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, specialisation: v === "any" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Specialisation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {filterOptions.specialisations.length > 0
                        ? filterOptions.specialisations.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))
                        : SPECIALISATIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">University</Label>
                  <Select value={filters.university || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, university: v === "any" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="University" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {filterOptions.universities.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Minimum quiz score</Label>
                  <Select value={filters.minScore || "any"} onValueChange={(v) => setFilters((f) => ({ ...f, minScore: v === "any" ? "" : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Any (default 9)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <SelectItem key={n} value={String(n)}>&gt; {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Filters narrow the candidate pool. Change a JD or run &quot;Find AI matches&quot; to refresh.
              </p>
            </div>
            */}

            {effectiveMatchContext && (effectiveMatchContext.competencies?.length > 0 || effectiveMatchContext.jdText) && (
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                <Button onClick={runMatchWithAi} disabled={matchLoading} size="default" className="gap-2 font-medium">
                  {matchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {matchLoading ? "Finding matches…" : "Find AI matches"}
                </Button>
                {effectiveMatchContext.jdSource?.title && (
                  <Badge variant="outline" className="text-xs">{effectiveMatchContext.jdSource.title}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {matchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {matchError}
        </div>
      )}

      {(loading || matchLoading) && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{matchLoading ? "Finding matching candidates…" : "Loading candidates…"}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && filteredLearners.map((s, idx) => (
          <Card key={getStudentDocId(s) || (s as { id?: string }).id || `student-${idx}`} className="group border border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 flex flex-col overflow-hidden">
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-foreground truncate text-base">{s.name || "—"}</h3>
                {typeof s.matchScore === "number" && (
                  <Badge variant="default" className="shrink-0 text-xs font-medium bg-primary/90 hover:bg-primary">
                    {s.matchScore}% match
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground/70" /> {collegeName(s)}
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground/90">Branch:</span> {branchName(s)}</p>
                {s.specialisation && (
                  <p><span className="font-medium text-foreground/90">Specialisation:</span> {s.specialisation}</p>
                )}
                {careerAspiration(s) && (
                  <p><span className="font-medium text-foreground/90">Career aspiration:</span> {careerAspiration(s)}</p>
                )}
                {s.education_level && <p><span className="font-medium text-foreground/90">Education:</span> {s.education_level}</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2 h-9 text-sm font-medium"
                  onClick={() => setStudentDetailPopup(s)}
                >
                  <Eye className="h-4 w-4" />
                  View profile {Array.isArray(s.studentCompetencyMatrix) && s.studentCompetencyMatrix.length > 0 ? "& skills" : ""}
                </Button>
              </div>
              {interests(s).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
                  {interests(s).map((st) => (
                    <Badge key={st} variant="secondary" className="text-xs font-normal">{st}</Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50 shrink-0">
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
              <p className="font-medium text-foreground">Select a job description</p>
              <p className="text-sm mt-2 text-muted-foreground">Choose a job description from the dropdown above to discover matched candidates.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">
                {effectiveMatchContext.jdSource?.title ? (
                  <>No students yet for <span className="text-primary font-semibold">{effectiveMatchContext.jdSource.title}</span></>
                ) : (
                  "No students yet for this JD."
                )}
              </p>
              <p className="text-sm mt-2 mb-3 text-muted-foreground">Click &quot;Find AI matches&quot; above to discover candidates. Use &quot;Refresh results&quot; to load saved matches.</p>
              <Button variant="outline" size="sm" onClick={refetchMatchResults} disabled={refetching}>
                {refetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {refetching ? "Refreshing…" : "Refresh results"}
              </Button>
            </>
          )}
        </div>
      )}

      {!loading && !matchLoading && learners.length > 0 && filteredLearners.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="font-medium text-foreground">No candidates match the current filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try clearing or relaxing filters to see more results.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
        </div>
      )}
      {!loading && !matchLoading && filteredLearners.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
          <span>
            {filteredLearners.length} candidate{filteredLearners.length !== 1 ? "s" : ""} for this role
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

      <Dialog open={!!studentDetailPopup} onOpenChange={(open) => !open && setStudentDetailPopup(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl">
          {studentDetailPopup && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg">
                  {studentDetailPopup.name || "—"}
                  {typeof studentDetailPopup.matchScore === "number" && (
                    <Badge variant="default" className="text-xs font-medium">Match {studentDetailPopup.matchScore}%</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-5 space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">Profile</h4>
                  <div className="grid gap-2 text-sm">
                    <p><span className="font-medium text-foreground/80">Name:</span> {studentDetailPopup.name || "—"}</p>
                    <p><span className="font-medium text-foreground/80">College:</span> {collegeName(studentDetailPopup)}</p>
                    <p><span className="font-medium text-foreground/80">University:</span> {(studentDetailPopup.university as { name?: string } | null)?.name ?? "—"}</p>
                    <p><span className="font-medium text-foreground/80">Branch:</span> {branchName(studentDetailPopup)}</p>
                    <p><span className="font-medium text-foreground/80">Specialisation:</span> {studentDetailPopup.specialisation || "—"}</p>
                    <p><span className="font-medium text-foreground/80">Education:</span> {studentDetailPopup.education_level || "—"}</p>
                    {careerAspiration(studentDetailPopup) && (
                      <p><span className="font-medium text-foreground/80">Career aspiration:</span> {careerAspiration(studentDetailPopup)}</p>
                    )}
                    {interests(studentDetailPopup).length > 0 && (
                      <p><span className="font-medium text-foreground/80">Interests:</span> {interests(studentDetailPopup).join(", ")}</p>
                    )}
                    {studentDetailPopup.user?.email && (
                      <p><span className="font-medium text-foreground/80">Email:</span>{" "}
                        <a href={`mailto:${studentDetailPopup.user.email}`} className="text-primary hover:underline">{studentDetailPopup.user.email}</a>
                      </p>
                    )}
                    {studentDetailPopup.designation && (
                      <p><span className="font-medium text-foreground/80">Designation:</span> {studentDetailPopup.designation}</p>
                    )}
                    {studentDetailPopup.total_years_of_experience != null && (
                      <p><span className="font-medium text-foreground/80">Experience:</span> {studentDetailPopup.total_years_of_experience} years</p>
                    )}
                  </div>
                </div>
                {Array.isArray(studentDetailPopup.studentCompetencyMatrix) && studentDetailPopup.studentCompetencyMatrix.length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-foreground">Skills & competency</h4>
                    <div className="space-y-4">
                      {studentDetailPopup.studentCompetencyMatrix.map((grp, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-foreground mb-2">{grp.category || "Category"}</p>
                          <div className="grid gap-1.5 pl-2">
                            {(grp.skills ?? []).map((sk, i) => (
                              <div key={i} className="flex justify-between items-center gap-2 py-1 border-b border-border/50 last:border-0">
                                <span className="text-muted-foreground">{sk.skill ?? "—"}</span>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {levelLabel(sk.level ?? 0)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
