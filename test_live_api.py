import urllib.request
import json

def test_api():
    print("--- TESTING LIVE GAIA CONTROL CENTER (http://100.65.0.15:8899) ---")
    
    # 1. Health
    with urllib.request.urlopen("http://100.65.0.15:8899/api/health") as res:
        print("Health Endpoint:", res.read().decode())

    # 2. Login
    login_data = json.dumps({"username": "admin", "password": "gaia2026"}).encode()
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

if __name__ == "__main__":
    test_api()
