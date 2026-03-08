import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Zap, Globe, Lightbulb, Code, Trophy, GraduationCap, Heart, ExternalLink, RefreshCw, Clock, Eye } from "lucide-react";
import { fetchIndustryContribute, fetchTalentPush, refreshTalentPush, talentPushShortlist, talentPushSchedule, postContributionInterest, fetchTalentPushStudentCompetency, type EcosystemProgram, type EcosystemContribution } from "@/lib/api";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = { Globe, Users, Code, Trophy, Lightbulb, Zap };

type Learner = {
  id: string | number;
  name?: string;
  user_category?: string;
  education_level?: string;
  specialisation?: string;
  master_college?: { name?: string } | null;
  university?: { name?: string } | null;
  branch?: { name?: string } | null;
  career_aspiration?: { title?: string } | null;
  user?: { email?: string; username?: string } | null;
  career_interests?: { interests?: Array<{ career_interest?: string }> } | null;
};

function buildLearnerSnapshot(s: Learner): Record<string, unknown> {
  const docId = (s as Learner & { documentId?: string }).documentId ?? String(s.id);
  const fitScore = (s as Learner & { fitScore?: number }).fitScore;
  return {
    id: s.id,
    documentId: docId,
    name: s.name,
    user_category: s.user_category,
    education_level: s.education_level,
    specialisation: s.specialisation,
    master_college: s.master_college,
    university: s.university,
    branch: s.branch,
    career_aspiration: s.career_aspiration,
    user: s.user,
    career_interests: s.career_interests,
    ...(typeof fitScore === "number" && { fitScore, matchScore: fitScore }),
  };
}

export default function Contribute() {
  const [programs, setPrograms] = useState<EcosystemProgram[]>([]);
  const [contributions, setContributions] = useState<EcosystemContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [programDetail, setProgramDetail] = useState<EcosystemProgram | null>(null);
  const [interestLoadingId, setInterestLoadingId] = useState<number | null>(null);

  const [students, setStudents] = useState<Learner[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<Learner | null>(null);
  const [competencyLoading, setCompetencyLoading] = useState(false);
  const [competencySkillGroups, setCompetencySkillGroups] = useState<Array<{ category?: string; weight?: number; skills?: Array<{ skill?: string; level?: number }> }>>([]);
  const competencyCacheRef = useRef<Record<string, { skillGroups: Array<{ category?: string; weight?: number; skills?: Array<{ skill?: string; level?: number }> }> }>>({});
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ interview_date: "", interview_time: "", interview_location: "", interview_type: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("programs");
  const talentPushAutoRefreshed = useRef(false);
  const isMountedRef = useRef(true);

  const loadContribute = useCallback(() => {
    setLoading(true);
    fetchIndustryContribute()
      .then((data) => {
        setPrograms(Array.isArray(data.programs) ? data.programs : []);
        setContributions(Array.isArray(data.contributions) ? data.contributions : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadContribute();
  }, [loadContribute]);

  const handleShowInterest = async (c: EcosystemContribution) => {
    if (c.interested) return;
    setInterestLoadingId(c.id);
    try {
      await postContributionInterest(c.id);
      setContributions((prev) => prev.map((x) => (x.id === c.id ? { ...x, interested: true } : x)));
    } catch (_) {}
    finally {
      setInterestLoadingId(null);
    }
  };

  const loadTalentPush = useCallback(() => {
    setStudentsLoading(true);
    fetchTalentPush()
      .then(({ students: list, computedAt: at }) => {
        setStudents(Array.isArray(list) ? (list as Learner[]) : []);
        setComputedAt(at);
      })
      .catch(() => {
        setStudents([]);
        setComputedAt(null);
      })
      .finally(() => setStudentsLoading(false));
  }, []);

  const handleRefreshTalentPush = useCallback(() => {
    setRefreshLoading(true);
    refreshTalentPush()
      .then(({ students: list, computedAt: at }) => {
        if (isMountedRef.current) {
          setStudents(Array.isArray(list) ? (list as Learner[]) : []);
          setComputedAt(at);
        }
        talentPushAutoRefreshed.current = true;
      })
      .catch(() => {})
      .finally(() => {
        if (isMountedRef.current) setRefreshLoading(false);
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load talent push only when user opens the Talent Push tab (avoids API call on mount that could fail and cause blank page)
  useEffect(() => {
    if (activeTab === "talent") loadTalentPush();
  }, [activeTab, loadTalentPush]);

  // Fetch AI competency breakdown when student profile modal opens; use cache so we don't call twice
  useEffect(() => {
    if (!studentDetail) {
      setCompetencySkillGroups([]);
      return;
    }
    const docId = (studentDetail as Learner & { documentId?: string }).documentId ?? String(studentDetail.id);
    const cacheKey = docId || `snap-${studentDetail.id}`;
    const cached = competencyCacheRef.current[cacheKey];
    if (cached && Array.isArray(cached.skillGroups) && cached.skillGroups.length > 0) {
      setCompetencySkillGroups(cached.skillGroups);
      setCompetencyLoading(false);
      return;
    }
    setCompetencyLoading(true);
    setCompetencySkillGroups([]);
    fetchTalentPushStudentCompetency({
      documentId: docId || undefined,
      learnerSnapshot: buildLearnerSnapshot(studentDetail),
    })
      .then(({ skillGroups }) => {
        const groups = skillGroups ?? [];
        setCompetencySkillGroups(groups);
        if (cacheKey && groups.length > 0) competencyCacheRef.current[cacheKey] = { skillGroups: groups };
      })
      .catch(() => {})
      .finally(() => setCompetencyLoading(false));
  }, [studentDetail]);

  // Weekly auto-refresh: when cache is older than 7 days, trigger refresh once per session
  useEffect(() => {
    if (!computedAt || studentsLoading || refreshLoading || talentPushAutoRefreshed.current) return;
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const nextAt = new Date(new Date(computedAt).getTime() + WEEK_MS).getTime();
    if (Date.now() >= nextAt) {
      talentPushAutoRefreshed.current = true;
      handleRefreshTalentPush();
    }
  }, [computedAt, studentsLoading, refreshLoading, handleRefreshTalentPush]);

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const nextRefreshAt = computedAt ? new Date(new Date(computedAt).getTime() + WEEK_MS).getTime() : null;
  const now = Date.now();
  const isStale = nextRefreshAt !== null && now >= nextRefreshAt;
  const secondsUntilRefresh = nextRefreshAt != null && nextRefreshAt > now ? Math.max(0, Math.floor((nextRefreshAt - now) / 1000)) : 0;
  const daysUntil = Math.floor(secondsUntilRefresh / 86400);
  const hoursUntil = Math.floor((secondsUntilRefresh % 86400) / 3600);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Contribute to Ecosystem</h2>
        <p className="text-muted-foreground mt-1">Support the next generation of AI talent through meaningful engagement.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="contribute">Contribute</TabsTrigger>
          <TabsTrigger value="talent">Talent Push</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          <p className="text-sm text-muted-foreground">Currently active programs on the platform you can support.</p>
          {loading && <p className="text-muted-foreground">Loading…</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardContent className="pt-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{p.title}</h3>
                    <Badge variant={p.status === "Active" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.students_count} students enrolled{p.program_type ? ` · ${p.program_type}` : ""}
                  </p>
                  {p.summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.summary}</p>}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full gap-1.5"
                    onClick={() => setProgramDetail(p)}
                  >
                    View more <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Sheet open={!!programDetail} onOpenChange={(open) => !open && setProgramDetail(null)}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{programDetail?.title}</SheetTitle>
              </SheetHeader>
              {programDetail && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={programDetail.status === "Active" ? "default" : "secondary"}>{programDetail.status}</Badge>
                    {programDetail.program_type && <Badge variant="outline">{programDetail.program_type}</Badge>}
                    <span className="text-sm text-muted-foreground">{programDetail.students_count} students enrolled</span>
                  </div>
                  {programDetail.summary && <p className="text-sm text-muted-foreground">{programDetail.summary}</p>}
                  {programDetail.body && <div className="text-sm whitespace-pre-wrap border-t pt-3 mt-3">{programDetail.body}</div>}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </TabsContent>

        <TabsContent value="contribute" className="space-y-4">
          <p className="text-sm text-muted-foreground">Ways your company can contribute to the talent ecosystem. Show interest to get involved.</p>
          {loading && <p className="text-muted-foreground">Loading…</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributions.map((c) => {
              const Icon = c.icon ? iconMap[c.icon] ?? Globe : Globe;
              return (
                <Card key={c.id} className="hover:shadow-lg transition-shadow group flex flex-col">
                  <CardContent className="pt-5 space-y-3 flex flex-col flex-1">
                    <Icon className="h-8 w-8 text-primary" />
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <p className="text-sm text-muted-foreground flex-1">{c.description || c.title}</p>
                    <div className="flex gap-2">
                      <Button
                        variant={c.interested ? "secondary" : "default"}
                        size="sm"
                        className="rounded-lg flex-1 gap-1.5"
                        onClick={() => handleShowInterest(c)}
                        disabled={interestLoadingId === c.id || c.interested}
                      >
                        {interestLoadingId === c.id ? "…" : c.interested ? "Interested" : "Show interest"}
                        {c.interested && <Heart className="h-3.5 w-3.5 fill-current" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="talent" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshTalentPush}
              disabled={studentsLoading || refreshLoading}
              className="gap-1.5"
            >
              <RefreshCw className={refreshLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {refreshLoading ? "Recalculating in background…" : "Refresh"}
            </Button>
            {refreshLoading && (
              <span className="text-xs text-muted-foreground">
                You can switch tabs or leave this page; results will update when you return.
              </span>
            )}
            {computedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Last updated: {new Date(computedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
            {nextRefreshAt != null && (
              <span className="text-xs text-muted-foreground">
                {isStale
                  ? "Results may be outdated. Click Refresh to recalculate."
                  : `Next auto-refresh in ${daysUntil}d ${hoursUntil}h`}
              </span>
            )}
          </div>
          {studentsLoading && !refreshLoading && <p className="text-muted-foreground">Loading…</p>}
          {!studentsLoading && students.length === 0 && !refreshLoading && (
            <p className="text-muted-foreground">
              No matched students yet. Complete your Company Profile (preferred roles & skill domains), then click Refresh to run AI matching. Students come from MindMatrix learners with program completion &gt;= 0%.
            </p>
          )}
          {!studentsLoading && students.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">Talent relevant to your company profile and hiring preferences</p>
              <div className="space-y-4">
                {students.map((s) => {
                  const college = s.master_college?.name ?? "—";
                  const branch = s.branch?.name ?? "—";
                  const aspiration = s.career_aspiration?.title ?? null;
                  const rawInterests = Array.isArray(s.career_interests?.interests) ? s.career_interests.interests : [];
                  const interests = rawInterests.slice(0, 3).map((i) => i?.career_interest).filter(Boolean) as string[];
                  const fitScore = typeof (s as Learner & { fitScore?: number }).fitScore === "number" ? (s as Learner & { fitScore: number }).fitScore : null;
                  return (
                    <Card key={String(s.id)} className="flex flex-col">
                      <CardContent className="pt-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{s.name ?? "—"}</h3>
                          {s.user_category && (
                            <Badge variant="outline" className="text-xs shrink-0">{s.user_category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0" /> {college}
                        </p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {branch && <p><span className="font-medium text-foreground/80">Branch:</span> {branch}</p>}
                          {s.specialisation && <p><span className="font-medium text-foreground/80">Specialisation:</span> {s.specialisation}</p>}
                          {aspiration && <p><span className="font-medium text-foreground/80">Career:</span> {aspiration}</p>}
                        </div>
                        {interests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t">
                            {interests.map((i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full gap-1.5"
                          onClick={() => setStudentDetail(s)}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {fitScore != null && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Fit score</p>
                            <div className="flex items-center gap-2">
                              <Progress value={fitScore ?? 0} className="h-2 flex-1" />
                              <span className="text-xs font-medium text-foreground tabular-nums shrink-0">{fitScore}%</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
          {studentDetail && (
            <Dialog open={true} onOpenChange={(open) => { if (!open) { setStudentDetail(null); setShowScheduleForm(false); setScheduleForm({ interview_date: "", interview_time: "", interview_location: "", interview_type: "" }); } }}>
              <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Student Profile</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</p>
                      <p className="text-foreground font-medium">{studentDetail.name ?? "—"}</p>
                    </div>
                    {(studentDetail.user?.email || studentDetail.user?.username) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</p>
                        <p className="text-sm text-foreground">{studentDetail.user.email ?? studentDetail.user.username ?? "—"}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Education</p>
                      <p className="text-sm text-foreground">{studentDetail.education_level ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">College / University</p>
                      <p className="text-sm text-foreground">{studentDetail.master_college?.name ?? studentDetail.university?.name ?? "—"}</p>
                    </div>
                    {studentDetail.branch?.name && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</p>
                        <p className="text-sm text-foreground">{studentDetail.branch.name}</p>
                      </div>
                    )}
                    {studentDetail.specialisation && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specialisation</p>
                        <p className="text-sm text-foreground">{studentDetail.specialisation}</p>
                      </div>
                    )}
                    {studentDetail.career_aspiration?.title && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Career aspiration</p>
                        <p className="text-sm text-foreground">{studentDetail.career_aspiration.title}</p>
                      </div>
                    )}
                    {Array.isArray(studentDetail.career_interests?.interests) && studentDetail.career_interests.interests.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Career interests</p>
                        <div className="flex flex-wrap gap-1.5">
                          {studentDetail.career_interests.interests.map((i) => (
                            <Badge key={String(i?.career_interest)} variant="secondary">{i?.career_interest}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {studentDetail.user_category && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</p>
                        <p className="text-sm text-foreground">{studentDetail.user_category}</p>
                      </div>
                    )}
                    {/* Fit score — bar style (only score shown in view) */}
                    {typeof (studentDetail as Learner & { fitScore?: number }).fitScore === "number" && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Fit score</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(studentDetail as Learner & { fitScore: number }).fitScore ?? 0} className="h-2 flex-1" />
                          <span className="text-sm font-medium text-foreground tabular-nums shrink-0">{(studentDetail as Learner & { fitScore: number }).fitScore}%</span>
                        </div>
                      </div>
                    )}
                    {/* Competency breakdown: bars scaled 0–10 (level/5 → x/10) */}
                    {competencyLoading && <p className="text-sm text-muted-foreground">Loading competency…</p>}
                    {!competencyLoading && competencySkillGroups.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Competency breakdown</p>
                        <div className="space-y-3">
                          {competencySkillGroups.map((g, i) => (
                            <div key={i} className="text-sm">
                              <p className="font-medium text-foreground/90 mb-1.5">{g.category ?? "Category"}</p>
                              <div className="space-y-1.5">
                                {Array.isArray(g.skills) &&
                                  g.skills.slice(0, 10).map((s, j) => {
                                    const skillName = typeof s === "object" && s !== null && "skill" in s ? (s as { skill?: string }).skill : String(s);
                                    const level = typeof (s as { level?: number })?.level === "number" ? (s as { level: number }).level : null;
                                    const outOf10 = level != null ? Math.round((level / 5) * 10) : 0;
                                    const barPct = level != null ? (level / 5) * 100 : 0;
                                    return (
                                      <div key={j} className="flex items-center gap-2">
                                        <span className="text-muted-foreground shrink-0 w-32 truncate" title={skillName}>{skillName}</span>
                                        <Progress value={barPct} className="h-2 flex-1 min-w-0" />
                                        <span className="text-foreground/80 tabular-nums shrink-0 text-xs">({outOf10}/10)</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {showScheduleForm ? (
                    <div className="space-y-3 pt-3 border-t">
                      <p className="text-sm font-medium">Schedule interview</p>
                      <div className="grid gap-2">
                        <div>
                          <Label htmlFor="tp-date">Date</Label>
                          <Input id="tp-date" type="date" value={scheduleForm.interview_date} onChange={(e) => setScheduleForm((f) => ({ ...f, interview_date: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="tp-time">Time</Label>
                          <Input id="tp-time" placeholder="e.g. 10:00 AM" value={scheduleForm.interview_time} onChange={(e) => setScheduleForm((f) => ({ ...f, interview_time: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="tp-location">Location</Label>
                          <Input id="tp-location" placeholder="e.g. Zoom / Office" value={scheduleForm.interview_location} onChange={(e) => setScheduleForm((f) => ({ ...f, interview_location: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="tp-type">Type</Label>
                          <Input id="tp-type" placeholder="e.g. Video / In-person" value={scheduleForm.interview_type} onChange={(e) => setScheduleForm((f) => ({ ...f, interview_type: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowScheduleForm(false)} disabled={actionLoading}>Cancel</Button>
                        <Button size="sm" disabled={actionLoading} onClick={async () => {
                          const docId = (studentDetail as Learner & { documentId?: string }).documentId ?? String(studentDetail.id);
                          if (!docId) return;
                          setActionLoading(true);
                          try {
                            await talentPushSchedule({
                              documentId: docId,
                              interview_date: scheduleForm.interview_date || undefined,
                              interview_time: scheduleForm.interview_time || undefined,
                              interview_location: scheduleForm.interview_location || undefined,
                              interview_type: scheduleForm.interview_type || undefined,
                              learnerSnapshot: buildLearnerSnapshot(studentDetail),
                            });
                            setStudentDetail(null);
                            setShowScheduleForm(false);
                          } finally {
                            setActionLoading(false);
                          }
                        }}>Confirm</Button>
                      </div>
                    </div>
                  ) : (
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="outline" size="sm" disabled={actionLoading} onClick={async () => {
                        const docId = (studentDetail as Learner & { documentId?: string }).documentId ?? String(studentDetail.id);
                        if (!docId) return;
                        setActionLoading(true);
                        try {
                          await talentPushShortlist({ documentId: docId, learnerSnapshot: buildLearnerSnapshot(studentDetail) });
                          setStudentDetail(null);
                        } finally {
                          setActionLoading(false);
                        }
                      }}>Shortlist</Button>
                      <Button size="sm" disabled={actionLoading} onClick={() => setShowScheduleForm(true)}>Schedule interview</Button>
                    </DialogFooter>
                  )}
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
