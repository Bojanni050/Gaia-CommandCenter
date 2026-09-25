import os
import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def test_api():
    print("--- TESTING LIVE GAIA CONTROL CENTER (http://100.65.0.15:8899) ---")
    
    # 1. Health
    with urllib.request.urlopen("http://100.65.0.15:8899/api/health") as res:
        print("Health Endpoint:", res.read().decode())

    # 2. Login
    username = os.getenv("ADMIN_USERNAME", "Bojan")
    password = os.getenv("ADMIN_PASSWORD", "P9jJXLxtOFj8YA")
    login_data = json.dumps({"username": username, "password": password}).encode()
    req = urllib.request.Request(
        "http://100.65.0.15:8899/api/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        login_res = json.loads(res.read().decode())
        token = login_res["access_token"]
        print("Login Success, Token acquired:", token[:15] + "...")

    # 3. System Metrics
    req = urllib.request.Request(
        "http://100.65.0.15:8899/api/system",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        sys_data = json.loads(res.read().decode())
        print(f"\nHost Metrics:")
        print(f"  CPU Load: {sys_data['cpu']['percent']}% (cores: {sys_data['cpu']['core_count']}, load: {sys_data['cpu']['load_average']})")
        print(f"  Memory: {sys_data['memory']['percent']}% ({round(sys_data['memory']['used'] / (1024**3), 1)}GB / {round(sys_data['memory']['total'] / (1024**3), 1)}GB)")
        print(f"  Disk: {sys_data['disk']['percent']}% ({round(sys_data['disk']['used'] / (1024**3), 0)}GB / {round(sys_data['disk']['total'] / (1024**3), 0)}GB)")
        print(f"  Uptime: {sys_data['uptime']['formatted']}")
        print(f"  Docker: {sys_data['docker']['server_version']} ({sys_data['docker']['containers_running']} running / {sys_data['docker']['containers_total']} total)")

    # 4. Gaia Components
    req = urllib.request.Request(
        "http://100.65.0.15:8899/api/components",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        comps = json.loads(res.read().decode())
        print(f"\nGaia Components ({len(comps)} registered):")
        for c in comps:
            c_name = c.get("container") or c.get("process_name") or "integrated"
            hc = c.get("health_check")
            hc_info = f"Health: {hc['status']} ({hc['latency_ms']}ms)" if hc else "No healthcheck"
            stats = c.get("container_stats")
            stats_info = f"CPU: {stats['cpu_percent']}%, RAM: {round(stats['memory_usage']/1048576)}MB" if stats and "cpu_percent" in stats else "No stats"
            ui_info = f"UI: {c['ui_url']}" if c.get("has_ui") else "No UI"
            print(f"  [{c['composite_status'].upper()}] {c['name']} ({c['category']}) | {c_name} | {hc_info} | {stats_info} | {ui_info}")

    # 5. Containers
    req = urllib.request.Request(
        "http://100.65.0.15:8899/api/containers",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        conts = json.loads(res.read().decode())
        print(f"\nDocker Containers ({len(conts)} discovered):")
        for cont in conts:
            gaia_tag = f"GAIA: {cont['gaia_meta']['component_name']}" if cont['gaia_meta']['is_gaia'] else ("INFRA" if cont['gaia_meta'].get('is_infrastructure') else "OTHER")
            print(f"  [{cont['status'].upper()}] {cont['name']} ({cont['image']}) | {gaia_tag} | Ports: {', '.join(cont['ports'][:2])}")
    # 6. Log Analyzer (Standard defaults: last 25 hours, 20 rows)
    req = urllib.request.Request(
        "http://100.65.0.15:8899/api/logs/analyze",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        analysis = json.loads(res.read().decode())
        summary = analysis['summary']
        print(f"\nLog Analyzer Report (Standard Defaults: period={summary.get('since_hours')}h, rows={summary.get('tail')}):")
        print(f"  Health Score: {summary['health_score']}/100")
        print(f"  Scanned Containers: {summary['scanned_containers_count']} ({len(analysis['scanned_containers'])})")
        print(f"  Total Issues: {summary['total_issues']} (Critical: {summary['critical_count']}, Warnings: {summary['warning_count']})")
        print(f"\n  Top Detected Issues:")
        for iss in analysis['issues'][:6]:
            print(f"    - [{iss['severity'].upper()}] {iss['container']} ({iss['category']} / {iss['title']}):")
            print(f"      Regel: {iss['matched_line'][:90]}...")
            print(f"      Suggestie: {iss['suggestion'][:90]}...")

    # 7. Log Analyzer (Custom: last 1 hour, 50 rows)
    req_custom = urllib.request.Request(
        "http://100.65.0.15:8899/api/logs/analyze?since_hours=1&tail=50",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req_custom) as res:
        analysis_custom = json.loads(res.read().decode())
        summary_custom = analysis_custom['summary']
        print(f"\nLog Analyzer Report (Custom: period={summary_custom.get('since_hours')}h, rows={summary_custom.get('tail')}):")
        print(f"  Health Score: {summary_custom['health_score']}/100")
        print(f"  Total Issues: {summary_custom['total_issues']} (Critical: {summary_custom['critical_count']}, Warnings: {summary_custom['warning_count']})")

if __name__ == "__main__":
    test_api()
