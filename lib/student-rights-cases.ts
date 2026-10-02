import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";

const CASE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

export class CaseValidationError extends Error {}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new CaseValidationError(`${field}_REQUIRED`);
  const trimmed = value.trim();
  if (!trimmed) throw new CaseValidationError(`${field}_REQUIRED`);
  if (trimmed.length > maxLength) throw new CaseValidationError(`${field}_TOO_LONG`);
  return trimmed;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new CaseValidationError(`${field}_INVALID`);
  return value;
}

export function parseCaseInput(body: unknown) {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const input = body as Record<string, unknown>;
  const publicCaseNo = requiredText(input.publicCaseNo, "PUBLIC_CASE_NO", 64).toUpperCase();
  if (!CASE_NUMBER_PATTERN.test(publicCaseNo)) throw new CaseValidationError("PUBLIC_CASE_NO_INVALID");

  return {
    publicCaseNo,
    category: requiredText(input.category, "CATEGORY", 64),
    currentStatus: requiredText(input.currentStatus, "CURRENT_STATUS", 64),
    publicSummary: requiredText(input.publicSummary, "PUBLIC_SUMMARY", 4000),
    isPublic: optionalBoolean(input.isPublic, "IS_PUBLIC"),
  };
}

export function parseEventInput(body: unknown) {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const input = body as Record<string, unknown>;
  const occurredAt = requiredText(input.occurredAt, "OCCURRED_AT", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) throw new CaseValidationError("OCCURRED_AT_INVALID");
  const parsedDate = new Date(`${occurredAt}T12:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) throw new CaseValidationError("OCCURRED_AT_INVALID");

  return {
    occurredAt: parsedDate,
    status: requiredText(input.status, "STATUS", 64),
    publicNote: requiredText(input.publicNote, "PUBLIC_NOTE", 4000),
    isPublic: optionalBoolean(input.isPublic, "IS_PUBLIC"),
  };
}

export function isStudentRightsCaseManager(session: Session | null): boolean {
  const user = session?.user;
  const email = user?.email?.toLowerCase().trim();
  if (!email || !user) return false;
  if (user.role === "admin") return true;

  const managers = (process.env.STUDENT_RIGHTS_CASE_ADMIN_EMAILS || "")
    .split(",")
    .map((manager) => manager.toLowerCase().trim())
    .filter(Boolean);
  return managers.includes(email);
}

export function publicCaseSort<T extends { occurredAt: Date; createdAt: Date }>(events: T[]): T[] {
  return [...events].sort((a, b) =>
    a.occurredAt.getTime() - b.occurredAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

export function toAuditSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
