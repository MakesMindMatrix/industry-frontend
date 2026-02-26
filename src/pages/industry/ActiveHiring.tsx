import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Calendar, FileText, Mail, Loader2, Users, GraduationCap, Building2 } from "lucide-react";
import { fetchActiveHiring } from "@/lib/api";

type StudentItem = {
  name?: string;
  documentId?: string;
  matchScore?: number;
  interview_date?: string;
  interview_time?: string;
  interview_location?: string;
  interview_type?: string;
  user?: { email?: string };
  education_level?: string;
  specialisation?: string;
  master_college?: { name?: string };
  university?: { name?: string };
  branch?: { name?: string };
  career_aspiration?: { title?: string };
};

type JdGroup = {
  jdId: number;
  jdTitle: string;
  shortlisted: StudentItem[];
  scheduled: StudentItem[];
};

export default function ActiveHiring() {
  const [data, setData] = useState<JdGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchActiveHiring()
      .then((r) => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading active hiring…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Active Hiring</h2>
        <p className="text-muted-foreground mt-1">
          Shortlisted and scheduled interview students by Job Description.
        </p>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No shortlisted or scheduled students yet.</p>
            <p className="text-sm mt-2">
              Go to Talent Discovery, select a JD, run &quot;See AI matches&quot;, then shortlist or schedule students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {data.map((group) => (
            <Card key={group.jdId} className="border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {group.jdTitle || `JD #${group.jdId}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.shortlisted.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <UserPlus className="h-3.5 w-3.5" /> Shortlisted ({group.shortlisted.length})
                    </h4>
                    <ul className="space-y-2">
                      {group.shortlisted.map((s, i) => (
                        <li
                          key={s.documentId || i}
                          className="rounded-md border bg-card px-3 py-3 text-sm space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{s.name || s.documentId || "—"}</span>
                            {s.matchScore != null && (
                              <Badge variant="secondary">Match {s.matchScore}%</Badge>
                            )}
                          </div>
                          {(s.master_college?.name || s.university?.name || s.branch?.name || s.education_level) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs mt-1">
                              {(s.master_college?.name || s.university?.name) && (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3 shrink-0" />
                                  {s.master_college?.name || s.university?.name}
                                </span>
                              )}
                              {s.branch?.name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  {s.branch.name}
                                </span>
                              )}
                              {s.education_level && <span>{s.education_level}</span>}
                            </div>
                          )}
                          {s.user?.email && (
                            <a href={`mailto:${s.user.email}`} className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1">
                              <Mail className="h-3 w-3" /> {s.user.email}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {group.scheduled.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Calendar className="h-3.5 w-3.5" /> Scheduled interviews ({group.scheduled.length})
                    </h4>
                    <ul className="space-y-2">
                      {group.scheduled.map((s, i) => (
                        <li
                          key={s.documentId || i}
                          className="rounded-md border bg-card px-3 py-3 text-sm space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{s.name || s.documentId || "—"}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {s.interview_date && (
                                <Badge variant="outline">{s.interview_date}</Badge>
                              )}
                              {s.interview_time && (
                                <Badge variant="outline">{s.interview_time}</Badge>
                              )}
                              {s.interview_type && (
                                <Badge variant="secondary">{s.interview_type}</Badge>
                              )}
                            </div>
                          </div>
                          {(s.master_college?.name || s.university?.name || s.branch?.name) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs mt-1">
                              {(s.master_college?.name || s.university?.name) && (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3 shrink-0" />
                                  {s.master_college?.name || s.university?.name}
                                </span>
                              )}
                              {s.branch?.name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  {s.branch.name}
                                </span>
                              )}
                            </div>
                          )}
                          {s.interview_location && (
                            <p className="text-muted-foreground text-xs mt-0.5">Location: {s.interview_location}</p>
                          )}
                          {s.user?.email && (
                            <a href={`mailto:${s.user.email}`} className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1">
                              <Mail className="h-3 w-3" /> {s.user.email}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {group.shortlisted.length === 0 && group.scheduled.length === 0 && (
                  <p className="text-sm text-muted-foreground">No shortlisted or scheduled students for this JD.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
