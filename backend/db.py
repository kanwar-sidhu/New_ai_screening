"""
The store. SQLite, in a file on the recruiter's own machine.

The dataset is relational and is stored that way: a job role is a row with
columns, and the trash is a state of a role (`deleted_at`) rather than a second
copy of it. It was one JSON string in `localStorage` before this, which meant a
cleared cache was a deleted database and no query could ask a question the
portal had not already loaded the answer to.

Tables

  roles     one per opening; a row with `deleted_at` set is in the trash
  counters  the role numbering sequence, which only ever goes up
"""

from __future__ import annotations

import os
import sqlite3
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("SCREENER_DATA_DIR") or os.path.join(HERE, "data")
DB_PATH = os.path.join(DATA_DIR, "screener.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS roles (
  id               TEXT PRIMARY KEY,
  code_no          INTEGER NOT NULL,
  title            TEXT NOT NULL,
  department       TEXT NOT NULL DEFAULT '',
  location         TEXT NOT NULL DEFAULT '',
  employment_type  TEXT NOT NULL DEFAULT '',
  experience       TEXT NOT NULL DEFAULT '',
  skills           TEXT NOT NULL DEFAULT '',
  must_skills      TEXT NOT NULL DEFAULT '',
  good_skills      TEXT NOT NULL DEFAULT '',
  preferred_skills TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  created_at       INTEGER NOT NULL,
  -- set together, and only for a role in the trash
  trash_id         TEXT,
  deleted_at       INTEGER
);
CREATE INDEX IF NOT EXISTS roles_deleted ON roles (deleted_at);

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
"""

# One connection, one lock. Requests do overlap — but this is one recruiter on
# one machine, and a lock around a WAL connection is both correct and less to
# get wrong than a pool.
_lock = threading.RLock()
_conn: sqlite3.Connection | None = None


def connect() -> sqlite3.Connection:
    global _conn
    with _lock:
        if _conn is None:
            os.makedirs(DATA_DIR, exist_ok=True)
            conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA foreign_keys = ON")
            conn.executescript(SCHEMA)
            conn.commit()
            _conn = conn
        return _conn


def close() -> None:
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
            _conn = None


def now_ms() -> int:
    return int(time.time() * 1000)


def _int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _text(value) -> str:
    return "" if value is None else str(value)


# --------------------------------------------------------------- reading

def _role(row) -> dict:
    return {
        "id": row["id"],
        "codeNo": row["code_no"],
        "title": row["title"],
        "department": row["department"],
        "location": row["location"],
        "employmentType": row["employment_type"],
        "experience": row["experience"],
        "skills": row["skills"],
        "mustSkills": row["must_skills"],
        "goodSkills": row["good_skills"],
        "preferredSkills": row["preferred_skills"],
        "description": row["description"],
        "createdAt": row["created_at"],
    }


def read_state() -> dict:
    """
    The whole dataset, in the shape the portal holds it in.

    One read per screen would be the better API for a service with users; this
    one has a single tab talking to it, and handing back the whole thing keeps
    the portal's state a plain object it can render from without a loading
    spinner on every panel.
    """
    conn = connect()
    with _lock:
        roles, trash = [], []
        for row in conn.execute("SELECT * FROM roles ORDER BY created_at DESC"):
            if row["deleted_at"] is None:
                roles.append(_role(row))
            else:
                trash.append({
                    "id": row["trash_id"] or f"t{row['id']}",
                    "kind": "role",
                    "deletedAt": row["deleted_at"],
                    "role": _role(row),
                })
        trash.sort(key=lambda e: e["deletedAt"], reverse=True)

        counter = conn.execute("SELECT value FROM counters WHERE name = 'role'").fetchone()

    return {
        "roles": roles,
        "trash": trash,
        "counters": {"role": counter["value"] if counter else 0},
    }


def is_empty() -> bool:
    """Whether anything has ever been saved — what the portal's one-time import asks."""
    conn = connect()
    with _lock:
        return conn.execute("SELECT 1 FROM roles LIMIT 1").fetchone() is None


# --------------------------------------------------------------- writing

def write_state(state: dict) -> None:
    """
    Replace the dataset with the one the portal is holding.

    The portal edits a whole state object and writes it back, so this is a
    delete-and-reinsert inside one transaction rather than a diff: at this size
    it is a millisecond, and it cannot leave the two sides disagreeing about a
    row nobody thought to compare.
    """
    conn = connect()
    with _lock, conn:
        conn.execute("DELETE FROM roles")

        trash_of = {}
        for entry in state.get("trash") or []:
            role = entry.get("role")
            if isinstance(role, dict) and role.get("id"):
                trash_of[role["id"]] = entry

        rows = [(r, None) for r in state.get("roles") or []]
        rows += [(e["role"], e) for e in trash_of.values()]
        for role, entry in rows:
            if not isinstance(role, dict) or not role.get("id"):
                continue
            conn.execute(
                """INSERT OR REPLACE INTO roles
                   (id, code_no, title, department, location, employment_type, experience,
                    skills, must_skills, good_skills, preferred_skills, description,
                    created_at, trash_id, deleted_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    role["id"],
                    _int(role.get("codeNo"), 0),
                    _text(role.get("title")),
                    _text(role.get("department")),
                    _text(role.get("location")),
                    _text(role.get("employmentType")),
                    _text(role.get("experience")),
                    _text(role.get("skills")),
                    _text(role.get("mustSkills")),
                    _text(role.get("goodSkills")),
                    _text(role.get("preferredSkills")),
                    _text(role.get("description")),
                    _int(role.get("createdAt"), now_ms()),
                    entry.get("id") if entry else None,
                    _int(entry.get("deletedAt"), now_ms()) if entry else None,
                ),
            )

        role_counter = _int((state.get("counters") or {}).get("role"), 0)
        conn.execute(
            "INSERT OR REPLACE INTO counters (name, value) VALUES ('role', ?)", (role_counter,)
        )


def stats() -> dict:
    """What /health reports about the store."""
    conn = connect()
    with _lock:
        live = conn.execute(
            "SELECT COUNT(*) AS n FROM roles WHERE deleted_at IS NULL").fetchone()["n"]
        binned = conn.execute(
            "SELECT COUNT(*) AS n FROM roles WHERE deleted_at IS NOT NULL").fetchone()["n"]
    return {"path": DB_PATH, "roles": live, "trash": binned}
