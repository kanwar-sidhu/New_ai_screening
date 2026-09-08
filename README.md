# AI Screening Portal — job roles

The first feature of the recruiter portal: **a recruiter pastes a job
description, and the role is created from it.** Created roles are listed, opened,
edited, deleted to a trash, and restored from it.

Nothing else is in this branch yet. Assessments, live tests, recordings and
reports are separate features and land in their own branches.

## What it does

**Create a role from the JD.** There is one input on the create screen: the job
description, pasted whole. As it is typed, `frontend/src/lib/jd.js` reads the
title, department, location, employment type, experience and three skill lists
back out of it, and shows them beside the text so what will be saved is never a
surprise. Nothing is invented — a field the description does not contain is left
blank.

The reader is deliberately plain string work rather than a model call: it runs in
the browser with nothing to start and nothing to pay for, and every field it
fills in can be traced to a line of the text. It recognises three things, in
order, and an earlier rule always wins:

1. labelled lines — `Location: Bengaluru`
2. sections — a heading such as `Must-have skills:` and the bullets under it
3. loose patterns — `5+ years`, `Full-time`, a known technology name

**The role list.** Newest first, each card showing its role code (`JR-001` — a
number that is never reused), its details behind an info button, and when it was
created.

**The role page.** Everything saved for one opening: the facts, the three skill
lists, and the description itself. Edit re-opens the paste screen on the JD that
was saved.

**The trash.** Deleting a role moves it to the trash rather than removing it. An
entry can be restored or deleted for good, and drops out on its own after 15
days — the countdown is on the row.

## Running it

Two processes: the store service, and the portal.

```bash
# once
python -m venv backend/.venv
backend/.venv/Scripts/pip install -r backend/requirements.txt   # Windows
npm install

# every time — two terminals
backend/.venv/Scripts/python backend/server.py                  # http://127.0.0.1:8765
npm run dev                                                     # http://localhost:5173
```

## How it is put together

```
frontend/
  src/App.jsx                     the state: roles, the trash, and which screen is up
  src/components/
    Shell.jsx                     the frame — sidebar and header
    Home.jsx                      the role list
    RoleForm.jsx                  paste a JD, see what was read out of it
    RoleWorkspace.jsx             one role, read back; edit and delete live here
    Trash.jsx                     deleted roles, with what is left of their 15 days
    ui.jsx  icons.jsx             the markup written out more than once
  src/lib/
    jd.js                         the reader — JD text in, fields out
    store.js                      the portal's side of the service; the trash rules
    api.js                        the one address the portal knows
    format.js  hooks.js           dates, monograms, and the Escape-closes-it hook
backend/
  server.py                       two routes: the dataset out, the dataset back
  db.py                           SQLite — one `roles` table, where the trash is a
                                  state of a role (`deleted_at`) not a second copy
```

The dataset is a file on the recruiter's own machine, under `backend/data/`, and
the service binds to loopback: nothing here leaves the desk. That folder is
git-ignored — it is the recruiter's data, not the project's.
