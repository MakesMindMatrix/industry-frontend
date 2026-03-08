import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Mail } from "lucide-react";
import { fetchOurStudents } from "@/lib/api";

type OurStudent = {
  id?: string;
  name?: string;
  documentId?: string;
  completion?: number | null;
  education_level?: string;
  specialisation?: string;
  master_college?: { name?: string } | null;
  university?: { name?: string } | null;
  branch?: { name?: string } | null;
  user?: { email?: string; username?: string } | null;
};

export default function OurStudents() {
  const [students, setStudents] = useState<OurStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOurStudents()
      .then((res) => setStudents(res.data as OurStudent[]))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const collegeName = (s: OurStudent) => s.master_college?.name ?? "—";
  const branchName = (s: OurStudent) => s.branch?.name ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Our Students</h2>
        <p className="text-muted-foreground mt-1">
          Students with at least one enrolled program at 0% or more completion.
        </p>
      </div>

      {loading && (
        <p className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!loading &&
          students.map((s, idx) => (
            <Card key={s.documentId ?? s.id ?? `student-${idx}`} className="hover:shadow-md transition-shadow flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground truncate">{s.name ?? "—"}</h3>
                  {s.completion != null && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {s.completion}% complete
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" /> {collegeName(s)}
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground/80">Branch:</span> {branchName(s)}
                  </p>
                  {s.specialisation && (
                    <p>
                      <span className="font-medium text-foreground/80">Specialisation:</span> {s.specialisation}
                    </p>
                  )}
                  {s.education_level && (
                    <p>
                      <span className="font-medium text-foreground/80">Education:</span> {s.education_level}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t shrink-0">
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <a href={s.user?.email ? `mailto:${s.user.email}` : "#"}>
                      <Mail className="h-3.5 w-3.5" /> Contact
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {!loading && students.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium text-foreground">No students found</p>
          <p className="text-sm mt-2">
            No learners have a program with completion greater than 0%.
          </p>
        </div>
      )}

      {!loading && students.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {students.length} student{students.length !== 1 ? "s" : ""} with program completion &gt;= 0%.
        </div>
      )}
    </div>
  );
}
