import type { Candidate, CandidateScope } from "../data/candidates";

const configuredApiBase = String(import.meta.env.VITE_CANDIDATE_API_BASE || "").trim().replace(/\/+$/, "");
const apiBase = import.meta.env.DEV && configuredApiBase ? "/api/candidate-api" : configuredApiBase;
const cognitoRegion = String(import.meta.env.VITE_CANDIDATE_COGNITO_REGION || "");
const cognitoClientId = String(import.meta.env.VITE_CANDIDATE_COGNITO_CLIENT_ID || "");
let reviewerSession: CandidateReviewerSession | undefined;

type ApiPage<T> = { data: T[]; nextCursor?: string };
type ApiItem<T> = { data: T };

type CandidateRecordResponse = {
  source?: "submission" | "seed" | "research" | "change-request";
  changeRequest?: CandidateChangeRequestMetadata;
  submissionId: string;
  candidate: Candidate;
  submitter?: {
    submitterName: string;
    submitterEmail: string;
    submitterPhone?: string;
    submitterRole: string;
  };
  consent: boolean;
  attestation: boolean;
  status: CandidateReviewStatus;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  revision: number;
  reviewReason?: string;
  reviewer?: { username?: string; email?: string };
};

export type CandidateSubmission = Omit<Candidate, "id"> & {
  id?: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string;
  submitterRole: string;
  attestation: boolean;
  publicationConsent: boolean;
  honeypot?: string;
};

export const candidatePatchFields = [
  "name", "office", "stateSlug", "scope", "officeLevel", "countySlugs", "countySlug", "countyName", "district", "profileUrl", "party", "ballotpediaUrl", "email", "phone", "websiteUrl", "image", "videoEmbedUrl", "videoTitle", "bio", "electionYear", "incumbent", "facebookUrl", "xUrl", "instagramUrl", "youtubeUrl",
] as const satisfies readonly (keyof Omit<Candidate, "id">)[];
export type CandidatePatch = { [K in keyof Omit<Candidate, "id">]?: Candidate[K] | null };
export type CandidateChangeTarget = { candidate: Candidate; submissionId: string; revision: number; status: "approved" };

export async function fetchCandidateChangeTarget(candidateId: string): Promise<CandidateChangeTarget> {
  const response = await fetch(`${requireApiBase()}/v1/candidates/${encodeURIComponent(candidateId)}/change-target`, {
    headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20_000),
  });
  const { data } = await readJson<ApiItem<CandidateChangeTarget>>(response);
  const candidate = data?.candidate;
  const invalid = () => new Error("Candidate service returned an invalid change target. Please load the profile again.");
  if (!data || data.status !== "approved" || typeof data.submissionId !== "string" || !data.submissionId.trim() || !Number.isSafeInteger(data.revision) || data.revision < 1 || !candidate || candidate.id !== candidateId) throw invalid();
  if (["name", "office", "stateSlug"].some((field) => typeof candidate[field as keyof Candidate] !== "string" || !String(candidate[field as keyof Candidate]).trim()) || !candidateScopes.some((scope) => scope.value === candidate.scope)) throw invalid();
  const publicFields: Record<string, unknown> = { id: candidate.id };
  for (const field of candidatePatchFields) {
    const entry = candidate[field];
    if (entry === undefined) continue;
    const valid = field === "countySlugs" ? Array.isArray(entry) && entry.every((slug) => typeof slug === "string")
      : field === "incumbent" ? typeof entry === "boolean"
      : field === "electionYear" ? Number.isSafeInteger(entry)
      : field === "officeLevel" ? candidateOfficeLevels.some((level) => level.value === entry)
      : typeof entry === "string";
    if (!valid) throw invalid();
    publicFields[field] = entry;
  }
  return { candidate: publicFields as Candidate, submissionId: data.submissionId, revision: data.revision, status: "approved" };
}

export type CandidateChangeRequest = {
  requestId: string;
  targetSubmissionId: string;
  targetStatus: "pending" | "approved";
  expectedTargetRevision?: number;
  candidate?: CandidatePatch;
  reason: string;
  submitter: { submitterName: string; submitterEmail: string; submitterPhone?: string; submitterRole: string };
  consent: boolean;
  attestation: boolean;
  honeypot: string;
};

export type CandidateChangeReceipt = { submissionId: string; status: CandidateReviewStatus; createdAt: string; revision: number };

export async function submitCandidateChangeRequest(payload: CandidateChangeRequest): Promise<CandidateChangeReceipt> {
  if (!/^change-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(payload.requestId)) throw new Error("The change request ID is invalid. Please try again.");
  if (typeof payload.targetSubmissionId !== "string" || !payload.targetSubmissionId.trim()) throw new Error("A submission reference is required.");
  if (!["pending", "approved"].includes(payload.targetStatus)) throw new Error("Choose a valid change request type.");
  if (typeof payload.reason !== "string" || !payload.reason.trim() || payload.reason.length > 2000) throw new Error("Requested changes must contain between 1 and 2000 characters.");
  if (!payload.submitter?.submitterName?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.submitter.submitterEmail) || !payload.submitter.submitterRole?.trim()) throw new Error("Enter your name, valid email, and relationship to the campaign.");
  if (payload.consent !== true || payload.attestation !== true) throw new Error("Consent and attestation are required.");
  if (payload.targetStatus === "approved" && (!Number.isSafeInteger(payload.expectedTargetRevision) || (payload.expectedTargetRevision || 0) < 1)) throw new Error("The target revision is missing or invalid. Load the published profile again.");
  const candidate = Object.fromEntries(candidatePatchFields.filter((field) => payload.candidate && Object.hasOwn(payload.candidate, field)).map((field) => [field, payload.candidate![field] ?? null]));
  if (payload.targetStatus === "approved" && !Object.keys(candidate).length) throw new Error("Change at least one profile field before submitting.");
  const body = {
    requestId: payload.requestId,
    targetSubmissionId: payload.targetSubmissionId,
    targetStatus: payload.targetStatus,
    ...(payload.targetStatus === "approved" ? { expectedTargetRevision: payload.expectedTargetRevision, candidate } : {}),
    reason: payload.reason,
    submitter: {
      submitterName: payload.submitter.submitterName,
      submitterEmail: payload.submitter.submitterEmail,
      ...(payload.submitter.submitterPhone ? { submitterPhone: payload.submitter.submitterPhone } : {}),
      submitterRole: payload.submitter.submitterRole,
    },
    consent: payload.consent,
    attestation: payload.attestation,
    honeypot: payload.honeypot,
  };
  const response = await fetch(`${requireApiBase()}/v1/candidates/change-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify(body),
  });
  const { data } = await readJson<ApiItem<CandidateChangeReceipt>>(response);
  if (typeof data?.submissionId !== "string" || !data.submissionId.trim() || !["pending", "approved", "denied"].includes(data.status) || !Number.isSafeInteger(data.revision) || data.revision < 1 || typeof data.createdAt !== "string" || !Number.isFinite(Date.parse(data.createdAt))) throw new Error("Submission receipt could not be confirmed. Please try again.");
  return { submissionId: data.submissionId, status: data.status, revision: data.revision, createdAt: data.createdAt };
}

export type CandidateReviewStatus = "pending" | "approved" | "denied";

export type CandidateReviewRecord = CandidateSubmission & {
  source?: "submission" | "seed" | "research" | "change-request";
  changeRequest?: CandidateChangeRequestMetadata;
  submissionId: string;
  id: string;
  status: CandidateReviewStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
  moderationReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type CandidateChangeRequestMetadata = {
  targetSubmissionId: string;
  targetStatus: "pending" | "approved";
  targetRevision: number;
  baseCandidate: Candidate;
  reason: string;
};

export type CandidateReviewerSession = {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
  username: string;
};

export type CandidateReviewerLoginChallenge = {
  challengeName: "SOFTWARE_TOKEN_MFA" | "SMS_MFA";
  cognitoSession: string;
  username: string;
};

function requireApiBase() {
  if (!apiBase) throw new Error("Candidate API is not configured.");
  return apiBase;
}

async function readJson<T = unknown>(response: Response): Promise<T> {
  const body = await response.json().catch(() => { throw new Error("Candidate service returned an invalid response. Please try again."); });
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Candidate service returned an invalid response. Please try again.");
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error?.message === "string"
          ? body.error.message
        : typeof body?.error === "string"
          ? body.error
          : `Candidate API request failed (${response.status}).`;
    const details = Array.isArray(body?.error?.details) ? body.error.details.map((detail: { path?: string; message?: string }) => `${detail.path || "Field"}: ${detail.message || "Invalid value"}`).join("; ") : "";
    throw new Error(details ? `${message}. ${details}` : message);
  }
  return body as T;
}

export function candidateApiIsConfigured() {
  return Boolean(apiBase);
}

export async function fetchApprovedCandidates(): Promise<Candidate[]> {
  if (!apiBase) return [];
  const candidates: Candidate[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const url = new URL(`${apiBase}/v1/candidates`, window.location.origin);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const body = await readJson<ApiPage<Candidate>>(response);
    if (!Array.isArray(body.data) || body.data.some((candidate) => !candidate?.id || !candidate.name || !candidate.office || !candidate.stateSlug)) throw new Error("Candidate service returned an invalid directory.");
    candidates.push(...body.data);
    cursor = body.nextCursor;
    if (cursor && (typeof cursor !== "string" || seenCursors.has(cursor) || seenCursors.size >= 100)) throw new Error("Candidate directory pagination could not be completed.");
    if (cursor) seenCursors.add(cursor);
  } while (cursor);

  return candidates;
}

export async function submitCandidateProfile(payload: CandidateSubmission) {
  const {
    submitterName,
    submitterEmail,
    submitterPhone,
    submitterRole,
    attestation,
    publicationConsent,
    honeypot,
    ...candidate
  } = payload;
  const response = await fetch(`${requireApiBase()}/v1/candidates/submissions`, {
    signal: AbortSignal.timeout(20_000),
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      candidate,
      submitter: {
        submitterName,
        submitterEmail,
        ...(submitterPhone ? { submitterPhone } : {}),
        submitterRole,
      },
      consent: publicationConsent,
      attestation,
      honeypot: honeypot || "",
    }),
  });
  const receipt = await readJson<{ data?: { submissionId?: string; status?: string } }>(response);
  if (!receipt.data?.submissionId || !["pending", "approved", "denied"].includes(receipt.data.status || "")) throw new Error("Submission receipt could not be confirmed. Please try again.");
  return receipt.data;
}

function decodeTokenPayload(token: string) {
  try {
    const encoded = token.split(".")[1];
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(normalized)) as { exp?: number; email?: string; "cognito:username"?: string };
  } catch {
    return {};
  }
}

export function readCandidateReviewerSession() {
  if (!reviewerSession?.idToken || reviewerSession.expiresAt <= Date.now() + 15_000) {
    reviewerSession = undefined;
    return undefined;
  }
  return reviewerSession;
}

export function clearCandidateReviewerSession() {
  reviewerSession = undefined;
}

export async function signOutCandidateReviewer(session: CandidateReviewerSession) {
  clearCandidateReviewerSession();
  if (!session.accessToken || !cognitoRegion) return;
  try {
    await fetch(`https://cognito-idp.${cognitoRegion}.amazonaws.com/`, {
      signal: AbortSignal.timeout(20_000),
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.GlobalSignOut",
      },
      body: JSON.stringify({ AccessToken: session.accessToken }),
    });
  } catch {
    // The local session is already cleared; remote revocation is best effort.
  }
}

export async function changeCandidateReviewerPassword(session: CandidateReviewerSession, currentPassword: string, newPassword: string) {
  if (!session.accessToken || !cognitoRegion) throw new Error("Sign in again before changing your password.");
  const response = await fetch(`https://cognito-idp.${cognitoRegion}.amazonaws.com/`, {
    signal: AbortSignal.timeout(20_000),
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "AWSCognitoIdentityProviderService.ChangePassword" },
    body: JSON.stringify({ AccessToken: session.accessToken, PreviousPassword: currentPassword, ProposedPassword: newPassword }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || "Your password could not be changed.");
  // ChangePassword updates the credential in place. Keep the authenticated
  // session and the reviewer's unsaved form; do not perform global sign-out.
}

function storeAuthenticationResult(
  result: { IdToken?: string; AccessToken?: string; RefreshToken?: string; ExpiresIn?: number },
  username: string,
) {
  if (!result.IdToken) throw new Error("Cognito did not return an ID token.");
  const tokenPayload = decodeTokenPayload(result.IdToken);
  const session: CandidateReviewerSession = {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresAt: (tokenPayload.exp || Math.floor(Date.now() / 1000) + Number(result.ExpiresIn || 3600)) * 1000,
    username: tokenPayload.email || tokenPayload["cognito:username"] || username,
  };
  reviewerSession = session;
  return session;
}

export async function loginCandidateReviewer(username: string, password: string) {
  if (!cognitoRegion || !cognitoClientId) {
    throw new Error("Candidate review authentication is not configured.");
  }

  const response = await fetch(`https://cognito-idp.${cognitoRegion}.amazonaws.com/`, {
      signal: AbortSignal.timeout(20_000),
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: cognitoClientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || "Sign in failed.");
  }
  if (
    (body.ChallengeName === "SOFTWARE_TOKEN_MFA" || body.ChallengeName === "SMS_MFA") &&
    body.Session
  ) {
    return {
      challengeName: body.ChallengeName,
      cognitoSession: body.Session,
      username: body.ChallengeParameters?.USER_ID_FOR_SRP || username,
    } as CandidateReviewerLoginChallenge;
  }
  if (body.ChallengeName) {
    throw new Error("This account requires an administrator to set a permanent password before signing in.");
  }

  return storeAuthenticationResult(body.AuthenticationResult || {}, username);
}

export async function completeCandidateReviewerMfa(
  challenge: CandidateReviewerLoginChallenge,
  code: string,
) {
  const codeKey = challenge.challengeName === "SMS_MFA" ? "SMS_MFA_CODE" : "SOFTWARE_TOKEN_MFA_CODE";
  const response = await fetch(`https://cognito-idp.${cognitoRegion}.amazonaws.com/`, {
      signal: AbortSignal.timeout(20_000),
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
    },
    body: JSON.stringify({
      ChallengeName: challenge.challengeName,
      ClientId: cognitoClientId,
      Session: challenge.cognitoSession,
      ChallengeResponses: {
        USERNAME: challenge.username,
        [codeKey]: code.trim(),
      },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || "The verification code was not accepted.");
  return storeAuthenticationResult(body.AuthenticationResult || {}, challenge.username);
}

async function adminRequest<T = unknown>(
  session: CandidateReviewerSession,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${requireApiBase()}${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.idToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 || response.status === 403) {
    clearCandidateReviewerSession();
  }
  return readJson<T>(response);
}

function flattenCandidateRecord(record: CandidateRecordResponse): CandidateReviewRecord {
  return {
    ...record.candidate,
    source: record.source,
    changeRequest: record.changeRequest,
    submissionId: record.submissionId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revision: record.revision,
    submitterName: record.submitter?.submitterName || "",
    submitterEmail: record.submitter?.submitterEmail || "",
    submitterPhone: record.submitter?.submitterPhone,
    submitterRole: record.submitter?.submitterRole || "",
    attestation: record.attestation,
    publicationConsent: record.consent,
    moderationReason: record.reviewReason,
    reviewedAt: record.statusUpdatedAt,
    reviewedBy: record.reviewer?.email || record.reviewer?.username,
  };
}

export async function fetchCandidateSubmission(session: CandidateReviewerSession, submissionId: string): Promise<CandidateReviewRecord> {
  const body = await adminRequest<ApiItem<CandidateRecordResponse>>(session, `/v1/admin/candidates/${encodeURIComponent(submissionId)}`);
  return flattenCandidateRecord(body.data);
}

export async function fetchCandidateSubmissions(
  session: CandidateReviewerSession,
  status: CandidateReviewStatus | "all" = "pending",
) {
  const records: CandidateReviewRecord[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ limit: "100" });
    if (status !== "all") query.set("status", status);
    if (cursor) query.set("cursor", cursor);
    const body = await adminRequest<ApiPage<CandidateRecordResponse>>(
      session,
      `/v1/admin/candidates?${query.toString()}`,
    );
    if (!Array.isArray(body.data)) throw new Error("Candidate service returned an invalid review queue.");
    records.push(...body.data.map(flattenCandidateRecord));
    cursor = body.nextCursor;
    if (cursor && (typeof cursor !== "string" || seenCursors.has(cursor) || seenCursors.size >= 100)) throw new Error("Candidate review pagination could not be completed.");
    if (cursor) seenCursors.add(cursor);
  } while (cursor);

  return records;
}

export async function updateCandidateSubmission(
  session: CandidateReviewerSession,
  submissionId: string,
  payload: Partial<CandidateReviewRecord>,
) {
  if (!payload.revision) throw new Error("The candidate revision is missing. Refresh and try again.");
  const requiredFields = ["name", "office", "stateSlug", "scope"] as const;
  const optionalFields = [
    "officeLevel",
    "countySlugs",
    "countySlug",
    "countyName",
    "district",
    "profileUrl",
    "party",
    "ballotpediaUrl",
    "email",
    "phone",
    "websiteUrl",
    "image",
    "videoEmbedUrl",
    "videoTitle",
    "bio",
    "electionYear",
    "incumbent",
    "facebookUrl",
    "xUrl",
    "instagramUrl",
    "youtubeUrl",
  ] as const;
  const candidate: Record<string, unknown> = {};
  requiredFields.forEach((field) => {
    if (payload[field] !== undefined) candidate[field] = payload[field];
  });
  optionalFields.forEach((field) => {
    if (field in payload) candidate[field] = payload[field] ?? null;
  });

  const body = await adminRequest<ApiItem<CandidateRecordResponse>>(
    session,
    `/v1/admin/candidates/${encodeURIComponent(submissionId)}`,
    {
    method: "PATCH",
      body: JSON.stringify({
        expectedRevision: payload.revision,
        candidate,
        ...("moderationReason" in payload ? { reviewReason: payload.moderationReason ?? null } : {}),
      }),
    },
  );
  return flattenCandidateRecord(body.data);
}

export async function moderateCandidateSubmission(
  session: CandidateReviewerSession,
  submissionId: string,
  action: "approve" | "deny",
  expectedRevision: number,
  reason?: string,
) {
  const body = await adminRequest<ApiItem<CandidateRecordResponse>>(
    session,
    `/v1/admin/candidates/${encodeURIComponent(submissionId)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({
        expectedRevision,
        ...(reason ? { reason } : {}),
      }),
    },
  );
  return flattenCandidateRecord(body.data);
}

export const candidateScopes: Array<{ value: CandidateScope; label: string }> = [
  { value: "statewide", label: "Statewide" },
  { value: "district", label: "District" },
  { value: "county", label: "County" },
  { value: "precinct", label: "Precinct" },
  { value: "city", label: "City" },
];

export const candidateOfficeLevels = [
  { value: "local", label: "Local / county / city" },
  { value: "state", label: "State" },
  { value: "federal", label: "Federal / national" },
] as const;

export async function uploadCandidatePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("Choose a photo no larger than 5 MB.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("This image could not be opened. Choose another photo."); });
  let blob: Blob | null;
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 64_000_000) throw new Error("Choose a photo smaller than 64 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser cannot prepare this photo.");
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } finally { bitmap.close(); }
  if (!blob || blob.size > 2 * 1024 * 1024) throw new Error("This photo is still too large. Choose a smaller image.");
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("This photo could not be read."));
    reader.readAsDataURL(blob);
  });
  const response = await fetch(`${requireApiBase()}/v1/candidates/photos`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(30_000), body: JSON.stringify({ contentType: "image/jpeg", dataBase64 }),
  });
  const body = await readJson<ApiItem<{ path: string }>>(response);
  if (!/^\/v1\/candidates\/photos\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(body.data?.path || "")) throw new Error("The uploaded photo could not be confirmed. Please try again.");
  return `${configuredApiBase}${body.data.path}`;
}
