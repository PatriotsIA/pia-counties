import type { Candidate, CandidateScope } from "../data/candidates";

const configuredApiBase = String(import.meta.env.VITE_CANDIDATE_API_BASE || "").replace(/\/+$/, "");
const apiBase = import.meta.env.DEV && configuredApiBase ? "/api/candidate-api" : configuredApiBase;
const cognitoRegion = String(import.meta.env.VITE_CANDIDATE_COGNITO_REGION || "");
const cognitoClientId = String(import.meta.env.VITE_CANDIDATE_COGNITO_CLIENT_ID || "");
let reviewerSession: CandidateReviewerSession | undefined;

type ApiPage<T> = { data: T[]; nextCursor?: string };
type ApiItem<T> = { data: T };

type CandidateRecordResponse = {
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

export type CandidateReviewStatus = "pending" | "approved" | "denied";

export type CandidateReviewRecord = CandidateSubmission & {
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
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error?.message === "string"
          ? body.error.message
        : typeof body?.error === "string"
          ? body.error
          : `Candidate API request failed (${response.status}).`;
    throw new Error(message);
  }
  return body as T;
}

export function candidateApiIsConfigured() {
  return Boolean(apiBase);
}

export async function fetchApprovedCandidates(): Promise<Candidate[]> {
  if (!apiBase) return [];
  const candidates: Candidate[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${apiBase}/v1/candidates`, window.location.origin);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await readJson<ApiPage<Candidate>>(response);
    candidates.push(...body.data);
    cursor = body.nextCursor;
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
  return readJson(response);
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

export async function fetchCandidateSubmissions(
  session: CandidateReviewerSession,
  status: CandidateReviewStatus | "all" = "pending",
) {
  const records: CandidateReviewRecord[] = [];
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ limit: "100" });
    if (status !== "all") query.set("status", status);
    if (cursor) query.set("cursor", cursor);
    const body = await adminRequest<ApiPage<CandidateRecordResponse>>(
      session,
      `/v1/admin/candidates?${query.toString()}`,
    );
    records.push(...body.data.map(flattenCandidateRecord));
    cursor = body.nextCursor;
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
