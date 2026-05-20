import { google } from 'googleapis';

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ?.replace(/^["']|["']$/g, '') // Remove wrapping quotes if any
  ?.replace(/\\n/g, '\n');

const GOOGLE_WORKSPACE_ADMIN_EMAIL = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;

if (GOOGLE_PRIVATE_KEY && !GOOGLE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')) {
  console.error('GOOGLE_PRIVATE_KEY does not appear to be a valid PEM key. It should start with "-----BEGIN PRIVATE KEY-----"');
}

const auth = new google.auth.JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: [
    'https://www.googleapis.com/auth/admin.directory.group.readonly',
    'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
  ],
  subject: GOOGLE_WORKSPACE_ADMIN_EMAIL,
});

const admin = google.admin({ version: 'directory_v1', auth });

export interface GoogleGroup {
  email?: string | null;
  name?: string | null;
}

export type GroupMemberRole = 'OWNER' | 'MANAGER' | 'MEMBER';

/**
 * Retrieves the list of Google Workspace groups for a given user email.
 * Requires Domain-Wide Delegation and the Admin SDK Directory API enabled.
 */
export async function getUserGroups(userKey: string): Promise<GoogleGroup[]> {
  console.log(`[GoogleAdmin] Fetching groups for: ${userKey}`);
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_WORKSPACE_ADMIN_EMAIL) {
    console.warn('[GoogleAdmin] Credentials not fully configured. Skipping group fetch.');
    return [];
  }

  try {
    const response = await admin.groups.list({ userKey });
    console.log(`[GoogleAdmin] Groups found for ${userKey}:`, response.data.groups?.map(g => g.email) || []);
    return response.data.groups || [];
  } catch (error) {
    console.error(`[GoogleAdmin] Error fetching groups for ${userKey}:`, error);
    return [];
  }
}

/**
 * Returns the caller's role within a specific group: 'OWNER' | 'MANAGER' | 'MEMBER',
 * or null if not a member / on error. Used to gate elevated actions (e.g., approval)
 * behind group ownership rather than mere membership.
 */
export async function getMemberRoleInGroup(
  groupKey: string,
  memberKey: string,
): Promise<GroupMemberRole | null> {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_WORKSPACE_ADMIN_EMAIL) {
    console.warn('[GoogleAdmin] Credentials not fully configured. Skipping member role lookup.');
    return null;
  }

  try {
    const response = await admin.members.get({ groupKey, memberKey });
    const role = response.data.role as GroupMemberRole | undefined;
    console.log(`[GoogleAdmin] Role of ${memberKey} in ${groupKey}: ${role ?? 'none'}`);
    return role ?? null;
  } catch (error: unknown) {
    const status = (error as { code?: number })?.code;
    // 404 = not a member; treat as null without noisy logging
    if (status === 404) return null;
    console.error(`[GoogleAdmin] Error fetching role of ${memberKey} in ${groupKey}:`, error);
    return null;
  }
}
