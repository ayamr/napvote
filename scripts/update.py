"""Chaîne complète : collecte CEP -> construction -> www/. Usage : python3 scripts/update.py [--no-fetch]
Nécessite : shapely (pip install shapely). Code de sortie 2 si la collecte est refusée (données suspectes)."""
import os, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
S = os.path.join(ROOT, "scripts")
D = os.path.join(ROOT, "data")

def run(script, cwd):
    r = subprocess.run([sys.executable, os.path.join(S, script)], cwd=cwd)
    if r.returncode:
        sys.exit(r.returncode)

if "--no-fetch" not in sys.argv:
    run("fetch_cep.py", ROOT)
os.makedirs(os.path.join(D, "_build"), exist_ok=True)
for s in ["build.py", "build_hist.py", "build_election.py", "build_bios.py", "assemble_live.py"]:
    run(s, D)
run("build_photos.py", ROOT)
run("build_sw.py", ROOT)
