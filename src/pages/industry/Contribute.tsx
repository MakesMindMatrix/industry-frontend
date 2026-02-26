import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Users, Zap, Globe, Lightbulb, Code, Trophy, GraduationCap, ChevronLeft, ChevronRight, Heart, ExternalLink } from "lucide-react";
import { fetchIndustryContribute, fetchLearners, postContributionInterest, type EcosystemProgram, type EcosystemContribution } from "@/lib/api";

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

const PAGE_SIZE = 24;

export default function Contribute() {
  const [programs, setPrograms] = useState<EcosystemProgram[]>([]);
  const [contributions, setContributions] = useState<EcosystemContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [programDetail, setProgramDetail] = useState<EcosystemProgram | null>(null);
  const [interestLoadingId, setInterestLoadingId] = useState<number | null>(null);

  const [students, setStudents] = useState<Learner[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsPageCount, setStudentsPageCount] = useState(0);

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

  const loadStudents = useCallback((page: number) => {
    setStudentsLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
      populate: "*",
    };
    fetchLearners(params)
      .then((res: { data?: Learner[]; meta?: { pagination?: { total?: number; pageCount?: number } } }) => {
        setStudents(Array.isArray(res.data) ? res.data : []);
        setStudentsTotal(res.meta?.pagination?.total ?? 0);
        setStudentsPageCount(res.meta?.pagination?.pageCount ?? 0);
        setStudentsPage(page);
      })
      .catch(() => {
        setStudents([]);
        setStudentsTotal(0);
        setStudentsPageCount(0);
      })
      .finally(() => setStudentsLoading(false));
  }, []);

  useEffect(() => {
    loadStudents(1);
  }, [loadStudents]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Contribute to Ecosystem</h2>
        <p className="text-muted-foreground mt-1">Support the next generation of AI talent through meaningful engagement.</p>
      </div>

      <Tabs defaultValue="programs" className="space-y-6">
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
          <p className="text-sm text-muted-foreground">All students/learners from the MindMatrix ecosystem. Browse and discover talent.</p>
          {studentsLoading && <p className="text-muted-foreground">Loading students…</p>}
          {!studentsLoading && students.length === 0 && (
            <p className="text-muted-foreground">No student data available.</p>
          )}
          {!studentsLoading && students.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Showing page {studentsPage} of {studentsPageCount || 1} • {studentsTotal} total students
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((s) => {
                  const college = s.master_college?.name ?? "—";
                  const branch = s.branch?.name ?? "—";
                  const aspiration = s.career_aspiration?.title ?? null;
                  const rawInterests = Array.isArray(s.career_interests?.interests) ? s.career_interests.interests : [];
                  const interests = rawInterests.slice(0, 3).map((i) => i?.career_interest).filter(Boolean) as string[];
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
                          {s.education_level && <p><span className="font-medium text-foreground/80">Education:</span> {s.education_level}</p>}
                        </div>
                        {interests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                            {interests.map((i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {studentsPageCount > 1 && (
                <div className="flex items-center justify-between gap-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadStudents(studentsPage - 1)}
                    disabled={studentsPage <= 1 || studentsLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {studentsPage} of {studentsPageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadStudents(studentsPage + 1)}
                    disabled={studentsPage >= studentsPageCount || studentsLoading}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
