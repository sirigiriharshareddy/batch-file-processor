"""
===============================================================================
 Batch File Processor — Flask Web Server
 Serves the frontend UI and exposes REST API endpoints for the processor.
===============================================================================
"""

import os
import json
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from processor import run_batch_processor, discover_csv_files, setup_logger

# ---------------------------------------------------------------------------
# App Initialisation
# ---------------------------------------------------------------------------

BASE_DIR   = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR   = BASE_DIR / "data"
OUTPUT_PATH = str(BASE_DIR / "final_output.csv")
LOG_DIR    = str(BASE_DIR / "logs")

app = Flask(__name__, static_folder=str(STATIC_DIR))
CORS(app)  # Enable CORS for frontend fetch calls


# ---------------------------------------------------------------------------
# Frontend Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the main frontend page."""
    return send_from_directory(str(STATIC_DIR), "index.html")


@app.route("/<path:path>")
def serve_static(path):
    """Serve all other static assets (CSS, JS)."""
    return send_from_directory(str(STATIC_DIR), path)


# ---------------------------------------------------------------------------
# API: List detected CSV files
# ---------------------------------------------------------------------------

@app.route("/api/files", methods=["GET"])
def list_files():
    """
    GET /api/files
    Returns the list of CSV files found in the data/ directory.
    """
    try:
        logger = setup_logger(LOG_DIR)
        files = discover_csv_files(str(DATA_DIR), logger)
        file_info = []
        for fp in files:
            p = Path(fp)
            file_info.append({
                "name": p.name,
                "size_bytes": p.stat().st_size,
                "size_kb": round(p.stat().st_size / 1024, 2),
            })
        return jsonify({"success": True, "files": file_info, "count": len(file_info)})
    except FileNotFoundError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"success": False, "error": f"Unexpected error: {exc}"}), 500


# ---------------------------------------------------------------------------
# API: Run the batch processor
# ---------------------------------------------------------------------------

@app.route("/api/process", methods=["POST"])
def process_files():
    """
    POST /api/process
    Accepts CSV files via multipart/form-data, processes them, and returns stats.
    """
    tmp_upload_dir = BASE_DIR / "tmp_uploads"
    tmp_upload_dir.mkdir(exist_ok=True)

    try:
        # 1. Handle File Uploads
        files = request.files.getlist("files")
        if not files or files[0].filename == "":
            # Fallback to data dir if no files uploaded (for testing/compatibility)
            input_dir = str(DATA_DIR)
        else:
            # Clear previous tmp files
            for f in tmp_upload_dir.glob("*.csv"):
                f.unlink()
            
            # Save new files
            for file in files:
                if file.filename.endswith(".csv"):
                    file.save(str(tmp_upload_dir / file.filename))
            input_dir = str(tmp_upload_dir)

        output_path = OUTPUT_PATH

        stats = run_batch_processor(
            input_dir=input_dir,
            output_path=output_path,
            log_dir=LOG_DIR,
        )

        # Build a JSON-serialisable response
        response = {
            "success": True,
            "stats": {
                "files_found":        stats.get("files_found", 0),
                "files_processed":    stats.get("files_processed", 0),
                "files_skipped":      stats.get("files_skipped", 0),
                "records_before":     stats.get("records_before", 0),
                "records_after":      stats.get("records_after", 0),
                "duplicates_removed": stats.get("duplicates_removed", 0),
                "elapsed_seconds":    stats.get("elapsed_seconds", 0),
                "output_path":        stats.get("output_path", ""),
                "per_file_rows":      stats.get("per_file_rows", {}),
                "data_preview":       stats.get("data_preview", []),
                "columns":            stats.get("columns", []),
            },
        }
        return jsonify(response)

    except FileNotFoundError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 422
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"success": False, "error": f"Unexpected error: {exc}"}), 500


# ---------------------------------------------------------------------------
# API: Health check
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "2.0.0"})


# ---------------------------------------------------------------------------
# API: Authentication & Persistence
# ---------------------------------------------------------------------------

class UserStore:
    def __init__(self, storage_path):
        self.path = Path(storage_path)
        if not self.path.exists():
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._save([])

    def _load(self):
        try:
            with open(self.path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save(self, users):
        with open(self.path, "w") as f:
            json.dump(users, f, indent=4)

    def find_user(self, username):
        users = self._load()
        return next((u for u in users if u["username"] == username), None)

    def add_user(self, username, password):
        users = self._load()
        if any(u["username"] == username for u in users):
            return False
        users.append({"id": len(users) + 1, "username": username, "password": password})
        self._save(users)
        return True

user_store = UserStore(DATA_DIR / "users.json")

@app.route("/api/signup", methods=["POST"])
def signup():
    """
    POST /api/signup
    Create a new user.
    """
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required"}), 400

    if user_store.add_user(username, password):
        user = user_store.find_user(username)
        return jsonify({"success": True, "user": {"id": user["id"], "username": user["username"]}})
    
    return jsonify({"success": False, "error": "Username already exists"}), 409

@app.route("/api/login", methods=["POST"])
def login():
    """
    POST /api/login
    Validate user against stored JSON.
    """
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = user_store.find_user(username)
    if user and user["password"] == password:
        return jsonify({"success": True, "user": {"id": user["id"], "username": user["username"]}})
    
    return jsonify({"success": False, "error": "Invalid credentials"}), 401


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)
