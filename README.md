# AI Screening Portal

A recruiter's screening portal — a React frontend over a small Python service
that keeps the data in SQLite on the recruiter's own machine.

It is being built one feature at a time; each lands on its own branch.

| Feature | Branch | State |
| --- | --- | --- |
| Job roles — create a role from a pasted job description, edit it, trash and restore it | `kanwar/job-roles` | in review |
| Assessments | — | not started |
| Live tests and recordings | — | not started |
| Reports | — | not started |

## Layout

```
frontend/   the portal — React + Vite
backend/    the local service — FastAPI over SQLite
```

The database lives under `backend/data/` and is git-ignored: it is the
recruiter's data, not the project's. The service binds to loopback, so nothing
here leaves the machine it runs on.
