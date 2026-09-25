import re
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.docker_service import docker_service
from app.registry import registry_manager

# Known diagnostic patterns
PATTERNS = [
    # 1. DATABASE ISSUES
    {
        "regex": r"(?:connect\s+ECONNREFUSED|ECONNREFUSED\s+[0-9.:]+|connection\s+refused|could\s+not\s+connect\s+to\s+server|password\s+authentication\s+failed|terminating\s+connection\s+due\s+to\s+administrator\s+command|57P03|deadlock\s+detected|too\s+many\s+connections|PostgresError)",
        "severity": "critical",
        "category": "database",
        "title": "PostgreSQL Database Connectiefout",
        "suggestion": "De container kan geen verbinding maken met PostgreSQL (poort 5432/5434). Controleer of de bijbehorende database container (bijv. chronicle-db of gaia-cognition-db) draait en gereed is.",
    },
    # 2. FATAL PYTHON / NODE EXCEPTIONS & TRACEBACKS
    {
        "regex": r"(?:Traceback\s+\(most\s+recent\s+call\s+last\)|panic:\s+|fatal\s+error:\s+|Segmentation\s+fault|SIGSEGV|Uncaught\s+Exception|Uncaught\s+Error|FATAL\s+[A-Za-z0-9_]+)",
        "severity": "critical",
        "category": "runtime_crash",
        "title": "Kritieke Stacktrace / Runtime Crash",
        "suggestion": "Er is een onbehandelde fout of crash opgetreden in de applicatie. Controleer de code stacktrace en omgevingsvariabelen van deze service.",
    },
    # 3. LLM / AI API QUOTA & RATE LIMITS
    {
        "regex": r"(?:RateLimitError|insufficient_quota|exceeded\s+your\s+current\s+quota|429\s+Too\s+Many\s+Requests|quota_exceeded|context_length_exceeded|maximum\s+context\s+length)",
        "severity": "warning",
        "category": "llm_quota",
        "title": "LLM API Rate Limit of Quotum Overschreden",
        "suggestion": "De AI model provider (OpenAI, Anthropic, Nous of lokale vLLM) weigert verzoeken wegens rate limits of een leeg API-tegoed. Controleer het accountsaldo of verlaag request-concurrency.",
    },
    # 4. MEMORY & RESOURCE EXHAUSTION
    {
        "regex": r"(?:Out\s+of\s+memory|OOMKilled|JavaScript\s+heap\s+out\s+of\s+memory|no\s+space\s+left\s+on\s+device|disk\s+full|ENOSPC)",
        "severity": "critical",
        "category": "memory",
        "title": "Geheugen- of Schijflimiet Bereikt (OOM)",
        "suggestion": "De container of host heeft de geheugen- of schijfruimte-limiet bereikt. Voer een docker image/prune cleanup uit of vergroot de RAM toewijzing.",
    },
    # 5. NETWORK & TIMEOUTS
    {
        "regex": r"(?:ReadTimeout|ConnectTimeout|504\s+Gateway\s+Timeout|502\s+Bad\s+Gateway|ConnectionResetError|Broken\s+pipe|ETIMEDOUT|request\s+timeout)",
        "severity": "warning",
        "category": "timeout",
        "title": "Netwerktimeout / Onbereikbare Gateway",
        "suggestion": "Een downstream service reageerde niet binnen de tijdslimiet. Controleer of de afhankelijke API-poorten open staan en luisteren.",
    },
    # 6. SECURITY & CONFIG WARNINGS
    {
        "regex": r"(?:API\s+server\s+is\s+network-accessible.*unsandboxed|No\s+env\s+user\s+allowlists\s+configured|Permission\s+denied|EACCES|401\s+Unauthorized|403\s+Forbidden)",
        "severity": "warning",
        "category": "security",
        "title": "Beveiligings- of Rechtenwaarschuwing",
        "suggestion": "De service meldt een mogelijke configuratie- of toegangsrechtenwaarschuwing. Controleer bestandsrechten en netwerk-toegangsbeleid.",
    },
    # 7. INTERNAL SERVER ERRORS (HTTP 500)
    {
        "regex": r"(?:500\s+Internal\s+Server\s+Error|->\s+500|status:\s*500\b|code:\s*500\b)",
        "severity": "warning",
        "category": "http_error",
        "title": "HTTP 500 Interne Serverfout",
        "suggestion": "De service ontving of genereerde een HTTP 500 foutmelding. Inspecteer de foutcontext rondom dit tijdstip.",
    },
]

TIMESTAMP_REGEX = re.compile(
    r"^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)"
)

class LogAnalyzer:
    def __init__(self):
        pass

    def analyze_container_logs(
        self,
        container_name: str,
        tail: int = 250,
        mapping: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Scan logs of a single container against known diagnostic patterns."""
        if mapping is None:
            mapping = registry_manager.get_container_to_component_map()

        meta = mapping.get(container_name, {
            "component_id": None,
            "component_name": None,
            "is_gaia": False,
        })

        raw_logs = docker_service.get_container_logs(container_name, tail=tail, timestamps=True)
        if not raw_logs or "Docker daemon niet bereikbaar" in raw_logs:
            return []

        lines = raw_logs.split("\n")
        issues: List[Dict[str, Any]] = []

        # Deduplication tracker: pattern_index -> last_seen line index
        seen_patterns: Dict[str, Dict[str, Any]] = {}

        for line_idx, line in enumerate(lines):
            clean_line = line.strip()
            if not clean_line:
                continue

            for pattern in PATTERNS:
                if re.search(pattern["regex"], clean_line, re.IGNORECASE):
                    # Extract timestamp if present at beginning of line
                    ts_match = TIMESTAMP_REGEX.match(clean_line)
                    ts = ts_match.group(1) if ts_match else None
                    snippet_line = clean_line[len(ts):].strip() if ts else clean_line

                    # Context window (up to 3 surrounding lines)
                    start_ctx = max(0, line_idx - 1)
                    end_ctx = min(len(lines), line_idx + 3)
                    context_snippet = "\n".join(lines[start_ctx:end_ctx])

                    dedup_key = f"{pattern['title']}:{snippet_line[:60]}"
                    if dedup_key in seen_patterns:
                        seen_patterns[dedup_key]["count"] += 1
                        seen_patterns[dedup_key]["last_seen"] = ts or datetime.now(timezone.utc).isoformat()
                    else:
                        issue_obj = {
                            "container": container_name,
                            "component_id": meta.get("component_id"),
                            "component_name": meta.get("component_name"),
                            "is_gaia": meta.get("is_gaia", False),
                            "severity": pattern["severity"],
                            "category": pattern["category"],
                            "title": pattern["title"],
                            "suggestion": pattern["suggestion"],
                            "snippet": context_snippet,
                            "matched_line": snippet_line,
                            "line_number": line_idx + 1,
                            "timestamp": ts or datetime.now(timezone.utc).isoformat(),
                            "count": 1,
                        }
                        seen_patterns[dedup_key] = issue_obj

        # Return list sorted by severity (critical first)
        severity_weight = {"critical": 0, "warning": 1, "info": 2}
        results = list(seen_patterns.values())
        results.sort(key=lambda x: (severity_weight.get(x["severity"], 3), -x["count"]))
        return results

    def analyze_all_containers(self, tail: int = 250) -> Dict[str, Any]:
        """Scan all running containers in parallel and compute system log health."""
        containers = docker_service.list_containers(all_containers=False)
        mapping = registry_manager.get_container_to_component_map()

        all_issues: List[Dict[str, Any]] = []
        scanned_containers = []

        def analyze_one(c_name):
            try:
                return c_name, self.analyze_container_logs(c_name, tail=tail, mapping=mapping)
            except Exception as e:
                return c_name, []

        container_names = [c["name"] for c in containers if c.get("raw_status") == "running"]

        with ThreadPoolExecutor(max_workers=min(10, len(container_names) or 1)) as executor:
            futures = [executor.submit(analyze_one, name) for name in container_names]
            for f in as_completed(futures):
                c_name, issues = f.result()
                scanned_containers.append(c_name)
                all_issues.extend(issues)

        # Sort all issues: critical first, then warning
        severity_weight = {"critical": 0, "warning": 1, "info": 2}
        all_issues.sort(key=lambda x: (severity_weight.get(x["severity"], 3), -x["count"]))

        critical_count = sum(1 for i in all_issues if i["severity"] == "critical")
        warning_count = sum(1 for i in all_issues if i["severity"] == "warning")

        # Health score algorithm: 100 base, -15 per critical (max 60 deducted), -5 per warning (max 30 deducted)
        deduction = min(60, critical_count * 15) + min(30, warning_count * 5)
        health_score = max(10, 100 - deduction)

        return {
            "summary": {
                "health_score": health_score,
                "total_issues": len(all_issues),
                "critical_count": critical_count,
                "warning_count": warning_count,
                "scanned_containers_count": len(scanned_containers),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "scanned_containers": scanned_containers,
            "issues": all_issues,
        }

log_analyzer = LogAnalyzer()
