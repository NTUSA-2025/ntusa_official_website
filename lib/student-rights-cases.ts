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

function parseTagSelection(input: Record<string, unknown>) {
  const tagIds = input.tagIds;
  const newTagNames = input.newTagNames;
  if (tagIds !== undefined && (!Array.isArray(tagIds) || tagIds.some((id) => typeof id !== "string" || !id.trim()))) {
    throw new CaseValidationError("TAGS_INVALID");
  }
  if (newTagNames !== undefined && (!Array.isArray(newTagNames) || newTagNames.some((name) => typeof name !== "string" || !name.trim() || name.trim().length > 40))) {
    throw new CaseValidationError("TAGS_INVALID");
  }
  if (Array.isArray(newTagNames) && newTagNames.length > 0 && tagIds === undefined) {
    throw new CaseValidationError("TAGS_INVALID");
  }
  const ids = tagIds === undefined ? undefined : [...new Set(tagIds as string[])];
  const names = newTagNames === undefined ? [] : [...new Map((newTagNames as string[]).map((name) => [name.trim().toLocaleLowerCase(), name.trim()])).values()];
  if ((ids?.length ?? 0) + names.length > 10) throw new CaseValidationError("TAGS_TOO_MANY");
  return { tagIds: ids, newTagNames: names };
}

export function parseCaseInput(body: unknown) {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const input = body as Record<string, unknown>;
  return {
    openedAt: requiredDate(input.openedAt, "OPENED_AT"),
    currentSituation: requiredText(input.currentSituation, "CURRENT_SITUATION", 4000),
    publicSummary: requiredText(input.publicSummary, "PUBLIC_SUMMARY", 4000),
    isPublic: optionalBoolean(input.isPublic, "IS_PUBLIC"),
    ...parseTagSelection(input),
  };
}

export function parseCaseUpdateInput(body: unknown) {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const input = body as Record<string, unknown>;
  return {
    publicSummary: requiredText(input.publicSummary, "PUBLIC_SUMMARY", 4000),
    isPublic: optionalBoolean(input.isPublic, "IS_PUBLIC"),
    ...parseTagSelection(input),
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

export function assertProgressVisibilityAllowed(caseIsPublic: boolean, previousIsPublic: boolean, nextIsPublic: boolean): void {
  if (!caseIsPublic && previousIsPublic !== nextIsPublic) {
    throw new CaseValidationError("CASE_MUST_BE_PUBLIC");
  }
}

export function latestPublicProgress(events: { publicNote: string }[]): string {
  return events[0]?.publicNote ?? "";
}

export function isStudentRightsCaseManager(session: Session | null): boolean {
  return isStudentRightsOrInformationDepartment(session);
}

export function canManageStudentRightsCaseTags(session: Session | null): boolean {
  return Boolean(session?.user?.email && (session.user.department === "學權部" || session.user.role === "admin"));
}

export function parseCaseTagName(body: unknown): { name: string; nameKey: string } {
  if (!body || typeof body !== "object") throw new CaseValidationError("INVALID_BODY");
  const name = requiredText((body as Record<string, unknown>).name, "TAG_NAME", 40);
  return { name, nameKey: name.toLocaleLowerCase() };
}

export function isCaseTagNameConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function resolveCaseTagIds(
  tx: Prisma.TransactionClient,
  tagIds: string[] | undefined,
  newTagNames: string[],
  canCreateTags: boolean,
): Promise<string[] | undefined> {
  if (tagIds === undefined && newTagNames.length === 0) return undefined;
  if (newTagNames.length > 0 && !canCreateTags) throw new CaseValidationError("TAG_CREATE_FORBIDDEN");

  const existing = tagIds?.length ? await tx.caseTag.findMany({ where: { id: { in: tagIds } }, select: { id: true } }) : [];
  if (existing.length !== (tagIds?.length ?? 0)) throw new CaseValidationError("TAGS_INVALID");

  const createdOrFound = await Promise.all(newTagNames.map((name) => tx.caseTag.upsert({
    where: { nameKey: name.toLocaleLowerCase() },
    update: {},
    create: { name, nameKey: name.toLocaleLowerCase() },
    select: { id: true },
  })));
  return [...new Set([...existing.map(({ id }) => id), ...createdOrFound.map(({ id }) => id)])];
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
