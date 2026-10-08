import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";

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

function requiredDate(value: unknown, field: string): Date {
  const dateText = requiredText(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new CaseValidationError(`${field}_INVALID`);
  const date = new Date(`${dateText}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) {
    throw new CaseValidationError(`${field}_INVALID`);
  }
  return date;
}

export function parseCaseInput(body: unknown) {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const input = body as Record<string, unknown>;
  return {
    openedAt: requiredDate(input.openedAt, "OPENED_AT"),
    currentSituation: requiredText(input.currentSituation, "CURRENT_SITUATION", 4000),
    publicSummary: requiredText(input.publicSummary, "PUBLIC_SUMMARY", 4000),
    isPublic: optionalBoolean(input.isPublic, "IS_PUBLIC"),
  };
}

export function parseEventInput(body: unknown) {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const input = body as Record<string, unknown>;
  return {
    occurredAt: requiredDate(input.occurredAt, "OCCURRED_AT"),
    publicNote: requiredText(input.publicNote, "PUBLIC_NOTE", 4000),
    isPublic: optionalBoolean(input.isPublic, "IS_PUBLIC"),
  };
}

export function isStudentRightsCaseManager(session: Session | null): boolean {
  return isStudentRightsOrInformationDepartment(session);
}

export function canViewStudentRightsCaseAudit(session: Session | null): boolean {
  return isStudentRightsOrInformationDepartment(session);
}

function isStudentRightsOrInformationDepartment(session: Session | null): boolean {
  const user = session?.user;
  if (!user?.email) return false;

  return user.department === "資訊部" || user.department === "學權部";
}

export function publicCaseSort<T extends { occurredAt: Date; createdAt: Date }>(events: T[]): T[] {
  return [...events].sort((a, b) =>
    a.occurredAt.getTime() - b.occurredAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

export function toAuditSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function isPublicCaseTableMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "P2021" || error.code === "P2022");
}
