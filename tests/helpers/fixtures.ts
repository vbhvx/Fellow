import crypto from 'crypto';
import { Client } from 'pg';
import { AuthService } from '@/server/services/auth.service';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import { WorkflowService } from '@/server/services/workflow.service';
import { resolveDatabaseUrl } from '@/db/client';
import { EVENT_CHANNEL } from '@/server/realtime/bus';
import type { CollaborationEnvelope } from '@/server/realtime/broker';

const unique = () => crypto.randomUUID().slice(0, 8);

export async function createUser(label = 'user') {
  const { user, token } = await AuthService.register({
    name: `${label} ${unique()}`,
    email: `${label}_${unique()}@example.com`,
    password: 'password123',
  });
  return { ...user, token };
}

/** An owner with an organization, an org-visible project, and its default columns. */
export async function createWorkspace(label = 'ws') {
  const owner = await createUser(`${label}_owner`);
  const org = await OrganizationService.createOrganization(owner.id, { name: `${label} org ${unique()}` });
  const project = await ProjectService.createProject(owner.id, org.id, { name: `${label} board` });
  const statuses = await WorkflowService.getProjectStatuses(owner.id, project.id);
  return { owner, org, project, statuses, todo: statuses[0], doing: statuses[1] };
}

export async function addOrgMember(ownerId: string, organizationId: string, role: 'member' | 'viewer' = 'member') {
  const member = await createUser(role);
  const invite = await OrganizationService.inviteMember(ownerId, organizationId, { email: member.email, role });
  await OrganizationService.acceptInvitation(member.id, invite.token);
  return member;
}

/**
 * A raw LISTEN connection standing in for "another app instance": anything it receives went
 * through Postgres, not through in-process memory.
 */
export async function listenAsRemoteInstance() {
  const client = new Client({ connectionString: resolveDatabaseUrl() });
  await client.connect();
  const messages: Array<{ envelope?: CollaborationEnvelope; ref?: number }> = [];
  client.on('notification', (msg) => {
    if (msg.channel === EVENT_CHANNEL && msg.payload) messages.push(JSON.parse(msg.payload));
  });
  await client.query(`LISTEN ${EVENT_CHANNEL}`);
  return {
    messages,
    forResource: (resourceId: string) =>
      messages.filter((m) => m.envelope?.resourceId === resourceId).map((m) => m.envelope!),
    close: () => client.end(),
  };
}

export async function waitFor<T>(fn: () => T | undefined | false, timeoutMs = 3000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
