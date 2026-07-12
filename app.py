from __future__ import annotations

import json
import mimetypes
import os
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
def resolve_db_path() -> Path:
    explicit_path = os.environ.get("PANTRIFY_DB")
    if explicit_path:
        return Path(explicit_path)

    railway_volume = os.environ.get("RAILWAY_VOLUME_MOUNT_PATH")
    if railway_volume:
        return Path(railway_volume) / "pantrify.sqlite3"

    return ROOT / "pantrify.sqlite3"


DB_PATH = resolve_db_path()
CATEGORIES = ("Staples", "Fruit & Vege", "Snacks", "Household", "Drinks")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connection() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connection() as db:
        db.executescript(
            """
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                purchased_at TEXT
            );
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity TEXT NOT NULL DEFAULT '',
                purchased_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_items_active ON items(purchased_at, category);
            CREATE INDEX IF NOT EXISTS idx_purchases_name ON purchases(name COLLATE NOCASE, purchased_at DESC);
            """
        )


def state() -> dict:
    with connection() as db:
        items = db.execute(
            """SELECT i.*,
                      (SELECT MAX(p.purchased_at) FROM purchases p
                       WHERE p.name = i.name COLLATE NOCASE) AS last_purchased
               FROM items i ORDER BY (i.purchased_at IS NOT NULL), i.id DESC"""
        ).fetchall()
        recent = db.execute(
            """SELECT name, category, quantity, MAX(purchased_at) AS purchased_at,
                      COUNT(*) AS purchase_count
               FROM purchases GROUP BY lower(name)
               ORDER BY purchased_at DESC LIMIT 30"""
        ).fetchall()
    return {"categories": CATEGORIES, "items": [dict(x) for x in items], "recent": [dict(x) for x in recent]}


class Handler(BaseHTTPRequestHandler):
    server_version = "Pantrify/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def send_json(self, data: object, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def serve_file(self, relative: str) -> None:
        path = (ROOT / relative).resolve()
        if ROOT not in path.parents or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/state":
            self.send_json(state())
        elif path in ("/", "/index.html"):
            self.serve_file("static/index.html")
        elif path.startswith("/static/"):
            self.serve_file(path.lstrip("/"))
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            data = self.read_json()
            if path == "/api/items":
                name = " ".join(str(data.get("name", "")).split())
                category = str(data.get("category", ""))
                quantity = " ".join(str(data.get("quantity", "")).split())[:40]
                if not name or category not in CATEGORIES:
                    return self.send_json({"error": "A product and valid category are required."}, 400)
                with connection() as db:
                    existing = db.execute(
                        "SELECT id FROM items WHERE purchased_at IS NULL AND name = ? COLLATE NOCASE", (name,)
                    ).fetchone()
                    if existing:
                        return self.send_json({"error": "That item is already on the list."}, 409)
                    db.execute(
                        "INSERT INTO items(name, category, quantity, created_at) VALUES (?, ?, ?, ?)",
                        (name[:120], category, quantity, now_iso()),
                    )
                self.send_json(state(), 201)
            elif path == "/api/items/new-list":
                with connection() as db:
                    current_staples = db.execute(
                        "SELECT name, quantity FROM items WHERE category = ? ORDER BY id DESC",
                        ("Staples",),
                    ).fetchall()
                    purchased_staples = db.execute(
                        "SELECT name, quantity FROM purchases WHERE category = ? ORDER BY purchased_at DESC",
                        ("Staples",),
                    ).fetchall()
                    recurring = {}
                    for staple in (*current_staples, *purchased_staples):
                        recurring.setdefault(staple["name"].casefold(), (staple["name"], staple["quantity"]))
                    db.execute("DELETE FROM items")
                    db.executemany(
                        "INSERT INTO items(name, category, quantity, created_at) VALUES (?, 'Staples', ?, ?)",
                        ((name, quantity, now_iso()) for name, quantity in recurring.values()),
                    )
                self.send_json(state())
            elif path == "/api/items/clear-purchased":
                with connection() as db:
                    db.execute("DELETE FROM items WHERE purchased_at IS NOT NULL")
                self.send_json(state())
            elif path.startswith("/api/items/") and path.endswith("/purchase"):
                item_id = int(path.split("/")[3])
                purchased_at = now_iso()
                with connection() as db:
                    item = db.execute("SELECT * FROM items WHERE id = ? AND purchased_at IS NULL", (item_id,)).fetchone()
                    if not item:
                        return self.send_json({"error": "Item not found."}, 404)
                    db.execute("UPDATE items SET purchased_at = ? WHERE id = ?", (purchased_at, item_id))
                    db.execute(
                        "INSERT INTO purchases(item_id, name, category, quantity, purchased_at) VALUES (?, ?, ?, ?, ?)",
                        (item_id, item["name"], item["category"], item["quantity"], purchased_at),
                    )
                self.send_json(state())
            elif path == "/api/repeat":
                name = str(data.get("name", "")).strip()
                with connection() as db:
                    previous = db.execute(
                        "SELECT name, category, quantity FROM purchases WHERE name = ? COLLATE NOCASE ORDER BY purchased_at DESC LIMIT 1",
                        (name,),
                    ).fetchone()
                    if not previous:
                        return self.send_json({"error": "Purchase not found."}, 404)
                    exists = db.execute(
                        "SELECT 1 FROM items WHERE purchased_at IS NULL AND name = ? COLLATE NOCASE", (name,)
                    ).fetchone()
                    if not exists:
                        db.execute(
                            "INSERT INTO items(name, category, quantity, created_at) VALUES (?, ?, ?, ?)",
                            (previous["name"], previous["category"], previous["quantity"], now_iso()),
                        )
                self.send_json(state(), 201)
            else:
                self.send_json({"error": "Not found."}, 404)
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "Invalid request."}, 400)
        except sqlite3.Error as exc:
            print(f"Database error: {exc}")
            self.send_json({"error": "Database error."}, 500)


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Pantrify is running at http://localhost:{port}")
    print(f"Database: {DB_PATH}")
    print("Open the same address using this computer's local IP to share it on your Wi-Fi.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Pantrify.")
    finally:
        server.server_close()
