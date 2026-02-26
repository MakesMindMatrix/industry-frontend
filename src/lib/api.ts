const getBaseUrl = () => import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

/** Optional API token (e.g. Strapi API Token with full access). When set in .env as VITE_API_TOKEN, used for auth. */
const getApiToken = (): string | null => {
  const t = import.meta.env.VITE_API_TOKEN;
  return typeof t === "string" && t.trim() ? t.trim() : null;
};

const JWT_KEY = "industry_jwt";
const USER_KEY = "industry_user";

/** Session storage keys for industry pages (persist until refresh or logout). */
export const SESSION_KEYS = {
  TALENT_DISCOVERY: "industry_talent_discovery",
} as const;

export function getSessionState<T>(key: string): T | null {
  try {
    const s = sessionStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function setSessionState(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

/** Clear all industry page session state (call on logout). */
export function clearIndustrySession(): void {
  try {
    Object.values(SESSION_KEYS).forEach((k) => sessionStorage.removeItem(k));
  } catch (_) {}
}

export function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}
export function setToken(jwt: string) {
  localStorage.setItem(JWT_KEY, jwt);
}
export function clearAuth() {
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem(USER_KEY);
  clearIndustrySession();
}
/** Clear only the stored user (e.g. when logging in with null user). */
export function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (_) {}
}
export function setUser(user: { id: number; email?: string; username?: string }) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (_) {}
}
export function getUser(): { id: number; email?: string; username?: string } | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (_) {
    return null;
  }
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const base = getBaseUrl();
  // Prefer JWT (login session) so Node backend accepts it; API token is for legacy Strapi only
  const token = getToken() || getApiToken();
  const headers: HeadersInit = { ...(options.headers as Record<string, string>), "Content-Type": "application/json" };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, { ...options, headers });
  if (res.status === 401) {
    if (!getApiToken()) clearAuth();
    throw new Error("Session expired");
  }
  return res;
}

export async function login(identifier: string, password: string): Promise<{ jwt: string; user: { id: number; email?: string; username?: string } }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || data.message || "Login failed");
  const u = data.user;
  return {
    jwt: data.jwt,
    user: u ? { id: u.id, email: u.email, username: u.username } : { id: 0, email: identifier, username: identifier },
  };
}

export type IndustryRegisterBody = {
  companyName: string;
  officialEmail: string;
  password: string;
  industryType: string;
  companySize?: string;
  headquarters?: string;
  briefDescription?: string;
  hiringIntent?: string;
};

export async function industryRegister(body: IndustryRegisterBody): Promise<{ jwt: string; user: { id: number; email?: string; username?: string } }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/auth/industry-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || data.message || "Signup failed");
  const u = data.user;
  return {
    jwt: data.jwt,
    user: u ? { id: u.id, email: u.email, username: u.username } : { id: 0, email: body.officialEmail, username: body.officialEmail },
  };
}

export type IndustryProfile = {
  id: number;
  companyName: string;
  officialEmail: string;
  industryType: string;
  companySize?: string;
  headquarters?: string;
  briefDescription?: string;
  hiringIntent?: string;
  internshipAvailability?: boolean;
  preferredRoles?: string[];
  preferredSkillDomains?: string[];
  mentorshipInterest?: boolean;
  guestLectureInterest?: boolean;
  hackathonParticipation?: boolean;
  trainForUsModel?: boolean;
  createdAt?: string;
};

export async function getProfile(): Promise<IndustryProfile> {
  const res = await authFetch("/api/industry-profiles/me");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load profile");
  return (typeof data === "object" && data !== null ? data : {}) as IndustryProfile;
}

export async function updateProfile(updates: Partial<IndustryProfile>) {
  const res = await authFetch("/api/industry-profiles/me", { method: "PUT", body: JSON.stringify(updates) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to update profile");
  return data;
}

export type JDDraft = {
  id: number;
  title: string;
  jd?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  competency_matrix?: { id: number; approved?: boolean };
};
export async function getMyJDs(): Promise<JDDraft[]> {
  const res = await authFetch("/api/job-descriptions/mine");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to load JDs");
  return Array.isArray(data) ? data : [];
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string") return d.message;
  if (d.error && typeof (d.error as { message?: string }).message === "string") return (d.error as { message: string }).message;
  if (typeof d.error === "string") return d.error;
  return fallback;
}

export async function createJD(payload: { title: string; jd?: string; status?: string }) {
  const res = await authFetch("/api/job-descriptions", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getErrorMessage(data, "Failed to create JD"));
  return data;
}

export async function updateJD(id: number, payload: { title?: string; jd?: string; status?: string }) {
  const res = await authFetch(`/api/job-descriptions/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getErrorMessage(data, "Failed to update JD"));
  return data;
}

export async function getJD(id: number) {
  const res = await authFetch(`/api/job-descriptions/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to load JD");
  return data;
}

export async function deleteJD(id: number): Promise<void> {
  const res = await authFetch(`/api/job-descriptions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to delete JD");
  }
}

export async function getCompetencyByJd(jdId: number) {
  const res = await authFetch(`/api/competency-matrices/by-jd/${jdId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to load competency");
  return data;
}

export async function createCompetency(payload: { job_description: number; skillGroups?: unknown[]; approved?: boolean }) {
  const res = await authFetch("/api/competency-matrices", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to create competency");
  return data;
}

export async function updateCompetency(id: number, payload: { skillGroups?: unknown[]; approved?: boolean }) {
  const res = await authFetch(`/api/competency-matrices/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to update competency");
  return data;
}

export function getApiUrl(path: string, searchParams?: Record<string, string>): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${p}`;
  if (searchParams && Object.keys(searchParams).length) {
    const params = new URLSearchParams(searchParams);
    return `${url}?${params.toString()}`;
  }
  return url;
}

export async function fetchLearners(params: Record<string, string> = {}) {
  const base = getBaseUrl();
  const search = new URLSearchParams(params).toString();
  const url = `${base}/api/learners${search ? `?${search}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch learners");
  return res.json();
}

export async function fetchIndustryHome() {
  const url = getApiUrl("/api/industry/home");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch home data");
  return res.json();
}

export async function fetchIndustryMetrics() {
  const url = getApiUrl("/api/industry/metrics");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export async function fetchIndustryCompetency() {
  const url = getApiUrl("/api/industry/competency");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch competency");
  return res.json();
}

export async function fetchIndustryFutureHiring() {
  const res = await authFetch("/api/industry/future-hiring");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch future hiring");
  return data;
}

export async function getFutureHiringRequirement(id: number) {
  const res = await authFetch(`/api/industry/future-hiring/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Failed to load requirement");
  return data;
}

export async function postFutureHiringRequirement(payload: {
  role_title: string;
  candidates_count: number;
  timeline: string;
  job_description_id?: number | null;
}) {
  const res = await authFetch("/api/industry/future-hiring", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Failed to submit requirement");
  return data;
}

export async function updateFutureHiringRequirement(
  id: number,
  payload: {
    role_title: string;
    candidates_count: number;
    timeline: string;
    job_description_id?: number | null;
  }
) {
  const res = await authFetch(`/api/industry/future-hiring/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Failed to update requirement");
  return data;
}

export type EcosystemProgram = {
  id: number;
  title: string;
  summary: string;
  body: string;
  status: string;
  program_type: string;
  students_count: number;
  createdAt?: string;
  updatedAt?: string;
};
export type EcosystemContribution = {
  id: number;
  icon: string;
  title: string;
  description: string;
  cta_text: string;
  interested?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchIndustryContribute(): Promise<{
  programs: EcosystemProgram[];
  contributions: EcosystemContribution[];
  talentPush: unknown[];
}> {
  const res = await authFetch("/api/industry/contribute");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to fetch contribute");
  return {
    programs: Array.isArray(data.programs) ? data.programs : [],
    contributions: Array.isArray(data.contributions) ? data.contributions : [],
    talentPush: Array.isArray(data.talentPush) ? data.talentPush : [],
  };
}

export async function postContributionInterest(contributionId: number): Promise<{ success: boolean; interested: boolean }> {
  const res = await authFetch("/api/industry/contribute/interest", {
    method: "POST",
    body: JSON.stringify({ contribution_id: contributionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data?.error?.message) || "Failed to submit interest");
  return data;
}

export async function fetchJdSuggestions() {
  const url = getApiUrl("/api/jd/suggestions");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch JD suggestions");
  return res.json();
}

export type CompetencyFromJdResponse = {
  competencies: { id: number; category: string; skills: string[]; weight: number; importance: string }[];
  suggestions: string[];
};

export async function fetchCompetencyFromJd(body: { title?: string; jd: string }): Promise<CompetencyFromJdResponse> {
  const base = getBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set.");
  const res = await fetch(`${base}/api/jd/competency-from-jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Failed to generate competency");
  return data;
}

export type MatchLearnersBody = {
  jdText?: string;
  title?: string;
  competencies?: { category?: string; skills?: string[]; weight?: number; importance?: string }[];
  competencyMatrixId?: number;
  jdId?: number;
};

/** Student competency matrix from AI matching: same categories as job, each skill has level 1–5 */
export type StudentCompetencySkillGroup = {
  category?: string;
  weight?: number;
  skills?: { skill?: string; level?: number }[];
};

export type MatchLearnersResponse = {
  data: (Record<string, unknown> & {
    studentCompetencyMatrix?: StudentCompetencySkillGroup[];
    matchScore?: number;
  })[];
  meta: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
  suggestedFilters: {
    branchNames: string[];
    careerAspirationTitles: string[];
    specialisations: string[];
    careerInterests: string[];
  };
};

export async function fetchMatchLearners(body: MatchLearnersBody): Promise<MatchLearnersResponse> {
  const base = getBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set.");
  const res = await authFetch("/api/jd/match-learners", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Failed to match learners");
  return data;
}

export async function shortlistMatchResults(competencyMatrixId: number, studentDocumentIds: string[]): Promise<{ ok: boolean; shortlisted: number }> {
  const res = await authFetch("/api/jd/match-results/shortlist", {
    method: "POST",
    body: JSON.stringify({ competencyMatrixId, studentDocumentIds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to shortlist");
  return data;
}

export type ScheduleInterviewDetails = {
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewType?: "virtual" | "in-person" | "online";
};

export async function scheduleMatchResults(
  competencyMatrixId: number,
  studentDocumentIds: string[],
  details?: ScheduleInterviewDetails
): Promise<{ ok: boolean; scheduled: number }> {
  const res = await authFetch("/api/jd/match-results/schedule", {
    method: "POST",
    body: JSON.stringify({
      competencyMatrixId,
      studentDocumentIds,
      interviewDate: details?.interviewDate,
      interviewTime: details?.interviewTime,
      interviewLocation: details?.interviewLocation,
      interviewType: details?.interviewType,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to schedule");
  return data;
}

/** Start AI match in background (saves to JD; keeps running if user navigates away). */
export async function fetchMatchLearnersBackground(body: MatchLearnersBody): Promise<{ started: boolean; message?: string }> {
  const base = getBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set.");
  const res = await authFetch("/api/jd/match-learners-background", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to start matching");
  return data;
}

/** Active hiring: JDs with shortlisted and scheduled students. */
export async function fetchActiveHiring(): Promise<{
  data: Array<{
    jdId: number;
    jdTitle: string;
    shortlisted: unknown[];
    scheduled: unknown[];
  }>;
}> {
  const res = await authFetch("/api/jd/active-hiring");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load active hiring");
  return data;
}

/** Load saved AI match results for a JD (by competency matrix or jd id). */
export async function fetchMatchResults(params: { competencyMatrixId?: number; jdId?: number }): Promise<{ data: unknown[] }> {
  const sp = new URLSearchParams();
  if (params.competencyMatrixId != null) sp.set("competencyMatrixId", String(params.competencyMatrixId));
  if (params.jdId != null) sp.set("jdId", String(params.jdId));
  const res = await authFetch(`/api/jd/match-results?${sp.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load match results");
  return data;
}

/** Stream AI match: onStudent called for each student (match >= 80%), onDone when finished. Runs in background. */
export async function fetchMatchLearnersStream(
  body: MatchLearnersBody,
  callbacks: { onStudent: (student: Record<string, unknown>) => void; onDone: () => void; onError: (message: string) => void }
): Promise<void> {
  const base = getBaseUrl();
  if (!base) {
    callbacks.onError("VITE_API_URL is not set.");
    return;
  }
  const res = await authFetch("/api/jd/match-learners-stream", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    callbacks.onError(data.error || "Stream failed");
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }
  const dec = new TextDecoder();
  let buffer = "";
  const processEvent = (raw: string) => {
    const dataIdx = raw.indexOf("data: ");
    if (dataIdx === -1) return;
    try {
      const obj = JSON.parse(raw.slice(dataIdx + 6).trim()) as { type?: string; student?: Record<string, unknown>; message?: string };
      if (obj.type === "student" && obj.student) callbacks.onStudent(obj.student);
      else if (obj.type === "done") callbacks.onDone();
      else if (obj.type === "error") callbacks.onError(obj.message ?? "Error");
    } catch (_) {}
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) buffer += dec.decode(value, { stream: true });
      while (buffer.includes("\n\n")) {
        const idx = buffer.indexOf("\n\n");
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        processEvent(block);
      }
      if (done) {
        if (buffer.trim()) processEvent(buffer);
        callbacks.onDone();
        break;
      }
    }
  } catch (e) {
    callbacks.onError(e instanceof Error ? e.message : "Stream failed");
  }
}

export async function fetchJdGenerate(body: { prompt: string; answers?: string[]; useCache?: boolean }) {
  const base = getBaseUrl();
  if (!base) {
    throw new Error("VITE_API_URL is not set. Add it to the frontend .env (e.g. VITE_API_URL=http://localhost:1337) and restart the dev server.");
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/jd/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = e as Error;
    throw new Error(
      `Cannot reach the backend at ${base}. Is it running? If frontend and backend are on different ports, set VITE_API_URL in .env. ${err?.message || ""}`
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Failed to generate JD");
  return data;
}

export type JdStreamCallbacks = {
  onChunk: (text: string) => void;
  onDone: (data: { jd?: string; title?: string; questions?: string[]; addonSuggestions?: string[] }) => void;
  onError: (message: string) => void;
};

export async function fetchJdGenerateStream(
  body: { prompt: string; answers?: string[]; useCache?: boolean },
  callbacks: JdStreamCallbacks
): Promise<void> {
  const base = getBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set. Add it to the frontend .env.");
  const res = await fetch(`${base}/api/jd/generate-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = typeof data.message === "string" ? data.message : (typeof data.error === "string" ? data.error : (data.error?.message && typeof data.error.message === "string" ? data.error.message : "Request failed"));
    callbacks.onError(errMsg);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }
  const dec = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === "chunk" && payload.text) callbacks.onChunk(payload.text);
            else if (payload.type === "done") callbacks.onDone({ jd: payload.jd, title: payload.title, questions: payload.questions, addonSuggestions: payload.addonSuggestions });
            else if (payload.type === "error") {
              const errMsg = typeof payload.message === "string" ? payload.message : "Generation failed";
              callbacks.onError(errMsg);
            }
          } catch (_) {}
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// --- Admin (separate JWT) ---
const ADMIN_JWT_KEY = "industry_admin_jwt";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_JWT_KEY);
}
export function setAdminToken(jwt: string) {
  localStorage.setItem(ADMIN_JWT_KEY, jwt);
}
export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_JWT_KEY);
}

export async function adminLogin(email: string, password: string): Promise<{ jwt: string; admin: { id: number; email: string } }> {
  const base = getBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set. Add it to the frontend .env (e.g. VITE_API_URL=http://localhost:1337).");
  let res: Response;
  try {
    res = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    throw new Error(`Cannot reach backend at ${base}. Is it running? ${msg ? msg : ""}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data?.error && typeof data.error === "object" && data.error.message) || data?.message || data?.error;
    throw new Error(typeof msg === "string" ? msg : `Admin login failed (${res.status})`);
  }
  return data;
}

export async function adminFetch(path: string, options: RequestInit = {}) {
  const base = getBaseUrl();
  const token = getAdminToken();
  const headers: HeadersInit = { ...(options.headers as Record<string, string>), "Content-Type": "application/json" };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, { ...options, headers });
  if (res.status === 401) throw new Error("Admin session expired");
  return res;
}

// --- Content (public) ---
export type ContentItem = { id: number; slug: string; title: string | null; body: string | null; published?: boolean; created_at?: string; updated_at?: string };

export async function getContentList(): Promise<ContentItem[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/content`);
  if (!res.ok) throw new Error("Failed to load content");
  return res.json();
}

export async function getContentBySlug(slug: string): Promise<ContentItem> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/content/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("Content not found");
  return res.json();
}

// --- Admin content CRUD ---
export async function getAdminContentList(): Promise<ContentItem[]> {
  const res = await adminFetch("/api/admin/content");
  if (!res.ok) throw new Error("Failed to load content");
  return res.json();
}

export async function createContent(payload: { slug: string; title?: string; body?: string; published?: boolean }) {
  const res = await adminFetch("/api/admin/content", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to create");
  return data;
}

export async function updateContent(id: number, payload: { slug?: string; title?: string; body?: string; published?: boolean }) {
  const res = await adminFetch(`/api/admin/content/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to update");
  return data;
}

export async function deleteContent(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/content/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to delete");
  }
}

// --- Admin Programs & Contributions (Events & Contributions) ---
export async function getAdminPrograms(): Promise<EcosystemProgram[]> {
  const res = await adminFetch("/api/admin/programs");
  if (!res.ok) throw new Error("Failed to load programs");
  return res.json();
}
export async function createProgram(payload: { title: string; summary?: string; body?: string; status?: string; program_type?: string; students_count?: number }) {
  const res = await adminFetch("/api/admin/programs", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to create program");
  return data;
}
export async function updateProgram(id: number, payload: Partial<EcosystemProgram>) {
  const res = await adminFetch(`/api/admin/programs/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to update program");
  return data;
}
export async function deleteProgram(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/programs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete program");
}

export async function getAdminContributions(): Promise<EcosystemContribution[]> {
  const res = await adminFetch("/api/admin/contributions");
  if (!res.ok) throw new Error("Failed to load contributions");
  return res.json();
}
export async function createContributionOption(payload: { icon?: string; title: string; description?: string; cta_text?: string }) {
  const res = await adminFetch("/api/admin/contributions", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to create contribution");
  return data;
}
export async function updateContributionOption(id: number, payload: Partial<EcosystemContribution>) {
  const res = await adminFetch(`/api/admin/contributions/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to update contribution");
  return data;
}
export async function deleteContributionOption(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/contributions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete contribution");
}

// --- Admin Student IDs (CSV / CRUD) ---
export type StudentIdRow = {
  id: number;
  email: string;
  external_id: number | null;
  document_id: string | null;
  source: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getAdminStudents(): Promise<StudentIdRow[]> {
  const res = await adminFetch("/api/admin/students");
  if (!res.ok) throw new Error("Failed to load students");
  return res.json();
}

export async function getAdminStudent(id: number): Promise<StudentIdRow> {
  const res = await adminFetch(`/api/admin/students/${id}`);
  if (!res.ok) throw new Error("Failed to load student");
  return res.json();
}

export async function createAdminStudent(payload: { email: string; external_id?: number | null; document_id?: string | null }): Promise<StudentIdRow> {
  const res = await adminFetch("/api/admin/students", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to create");
  return data;
}

export async function updateAdminStudent(id: number, payload: { email?: string; external_id?: number | null; document_id?: string | null }): Promise<StudentIdRow> {
  const res = await adminFetch(`/api/admin/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to update");
  return data;
}

export async function deleteAdminStudent(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/students/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to delete");
  }
}

export async function loadAdminStudentsFromCsv(): Promise<{ loaded: number; message: string }> {
  const res = await adminFetch("/api/admin/students/load-csv", { method: "POST", body: JSON.stringify({}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to load CSV");
  return data;
}

export async function uploadAdminStudentsCsv(csvText: string): Promise<{ loaded: number; message: string }> {
  const res = await adminFetch("/api/admin/students/upload", { method: "POST", body: JSON.stringify({ csv: csvText }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to upload CSV");
  return data;
}
