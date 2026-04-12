# Authorization & Role-Based Access Control (RBAC) Matrix

## Organization Roles

| Operation | Owner | Admin | Member | Viewer | Guest |
|---|---|---|---|---|---|
| View Organization | Yes | Yes | Yes | Yes | Yes (Scoped) |
| Manage Org Members & Roles | Yes | Yes | No | No | No |
| Transfer Org Ownership | Yes | No | No | No | No |
| Manage Org Settings | Yes | Yes | No | No | No |
| Create Projects | Yes | Yes | Yes | No | No |
| Delete Organization | Yes | No | No | No | No |

## Project Visibility Matrix

| Visibility Mode | Description | Eligible Viewers |
|---|---|---|
| **organization** | Open to all organization members | Owners, Admins, Members, Viewers |
| **private** | Confidential project restricted to designated members | Owners, Admins, Explicit Project Members |
| **guest** | Accessible to external collaborators | Explicit Project Members & Guests, Owners, Admins |

> [!NOTE]
> **Administrative Governance Override Policy:** Organization `Owner` and `Admin` roles hold supervisory audit and governance authority over all projects within their organization, including private projects. However, they **cannot** see or access projects belonging to another tenant under any circumstance.

## Project & Task Operations

| Action | Owner | Admin | Project Lead | Project Member | Viewer | Guest (in project) |
|---|---|---|---|---|---|---|
| View Project & Board | Yes | Yes | Yes | Yes | Yes (if permitted) | Yes |
| Manage Project Settings | Yes | Yes | Yes | No | No | No |
| Manage Project Members | Yes | Yes | Yes | No | No | No |
| Create Tasks | Yes | Yes | Yes | Yes | No | Yes |
| Edit Tasks | Yes | Yes | Yes | Yes | No | Yes |
| Reorder Tasks / Move | Yes | Yes | Yes | Yes | No | Yes |
| Delete Tasks | Yes | Yes | Yes | Creator Only | No | Creator Only |
| Post Comments | Yes | Yes | Yes | Yes | No | Yes |
| Delete Comments | Yes | Yes | Yes | Author Only | No | Author Only |
| Manage Workflow Columns | Yes | Yes | Yes | No | No | No |

## Multi-Tenant Cross-Isolation Rules

1. **Independent Identity:** A user may be an `Owner` in Organization A and a `Viewer` in Organization B. Permissions are strictly evaluated per organization context.
2. **Assignment Integrity:** A user from Organization B cannot be assigned to a task in Organization A (`BadRequestError`).
3. **Immediate Revocation:** Removing a user from an organization immediately invalidates their session access to all organization projects, tasks, comments, and real-time streams.
4. **Ownership Protection:** An organization must always have at least one `Owner`. An operation attempting to remove or downgrade the last remaining owner is rejected (`BadRequestError`).

