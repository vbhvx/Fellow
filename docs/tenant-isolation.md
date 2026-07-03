# Multi-Tenant Data Isolation Strategy

## Core Principles

The foundational tenet of Fellow is:
**Every task belongs to a well-defined security boundary, every change follows an explicit permission policy, and no organization's data is ever exposed to another.**

### 1. Authoritative Server-Side Query Scoping
Client-supplied parameters such as `organizationId` or `projectId` are never treated as proof of entitlement. For every protected query or mutation:
1. The authenticated user ID is extracted from the cryptographic session token.
2. The user's active membership in `organization_memberships` is resolved.
3. If accessing a project, `project_memberships` and `projects.visibility` are checked against centralized policy.
4. Database queries filter by `WHERE organization_id = :authorizedOrgId`.

### 2. Concealment of Resource Existence (404 vs 403)
When a user attempts to access a resource (project, task, comment) that does not exist in their authorized scope, the platform returns:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "requestId": "req_8x29a0f1"
  }
}
```
Returning `403 Forbidden` for a random ID would inform an attacker that the resource exists. Fellow emits `404 Not Found` for un-owned or cross-tenant IDs.

### 3. Nested Resource Boundary Inheritance
Nested resources (e.g., task comments, task activity logs, task attachments) do not rely solely on their own primary key for authorization. Access checks verify the parent `task`, its parent `project`, and its owning `organization`.

### 4. Search and Notification Scoping
- **Global Search:** `/api/v1/search?organizationId=...&q=...` first resolves all projects the caller is permitted to view. The task query is strictly bounded using `tasks.project_id IN (:authorizedProjectIds)`. Inaccessible project tasks are never queried or leaked.
- **Notifications:** Before rendering a notification (such as an assignment or mention), the system verifies that the recipient still retains active access to the referenced project. If project access has been revoked, the notification content is suppressed.

### 5. Cross-Tenant Task Assignment Prevention
When a task is created or updated with an `assigneeId`, the application verifies that the assignee has an active record in `organization_memberships` for that organization. Assigning a task to a user belonging to another organization is rejected with `400 Bad Request`.

