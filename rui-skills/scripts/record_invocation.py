#!/usr/bin/env python3
"""Record invocation summaries locally; persistent storage is handled by the skill workflow."""
import argparse
import json
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from uuid import uuid4

try:
    SHANGHAI = ZoneInfo("Asia/Shanghai")
except ZoneInfoNotFoundError:
    SHANGHAI = timezone(timedelta(hours=8), "Asia/Shanghai")

def now():
    return datetime.now(SHANGHAI).isoformat(timespec="seconds")

def write_record(path, data):
    tmp = path.with_name(path.name + "." + uuid4().hex + ".tmp")
    try:
        with tmp.open("x", encoding="utf-8") as out:
            json.dump(data, out, ensure_ascii=False, indent=2)
            out.write("\n")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    start = sub.add_parser("start")
    start.add_argument("--skill", required=True, choices=["rui-skills", "write-15-second-storyboards", "character-turnaround-from-image"])
    start.add_argument("--task", required=True)
    start.add_argument("--rules-version", default="unversioned", help="Version actually read; use unversioned when unknown.")
    start.add_argument("--output-dir", required=True)
    event = sub.add_parser("event")
    event.add_argument("--record", required=True)
    event.add_argument("--stage", required=True)
    event.add_argument("--summary", required=True)
    finish = sub.add_parser("finish")
    finish.add_argument("--record", required=True)
    finish.add_argument("--status", required=True, choices=["completed", "failed", "interrupted"])
    finish.add_argument("--summary", required=True)
    args = parser.parse_args()
    timestamp = now()
    if args.command == "start":
        folder = Path(args.output_dir).resolve()
        folder.mkdir(parents=True, exist_ok=True)
        record_id = datetime.now(SHANGHAI).strftime("%Y-%m-%dT%H%M%S+0800") + "-" + uuid4().hex[:12]
        path = folder / (record_id + ".json")
        data = {"schema_version": 1, "id": record_id, "recorded_at": timestamp,
                "timezone": "Asia/Shanghai", "skill": args.skill, "task_summary": args.task,
                "rules_version": args.rules_version,
                "status": "started", "events": [{"at": timestamp, "stage": "start", "summary": args.task}],
                "lessons": [], "validation": {"text": "not_run", "visual": "not_run"},
                "persistence": "pending", "github_sync": "pending"}
    else:
        path = Path(args.record).resolve()
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema_version") != 1 or data.get("status") not in ("started", "in_progress"):
            parser.error("Record must be a schema v1 active invocation; completed records cannot be reopened.")
        stage = args.stage if args.command == "event" else "finish"
        data["events"].append({"at": timestamp, "stage": stage, "summary": args.summary})
        data["status"] = "in_progress" if args.command == "event" else args.status
        if args.command == "finish":
            data["finished_at"] = timestamp
    write_record(path, data)
    print(json.dumps({"id": data["id"], "status": data["status"], "path": str(path)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
