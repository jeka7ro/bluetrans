---
trigger: always_on
---
# Protocol Pre-Push Obligatoriu (`audit-gatekeeper`)

Înainte de **orice** `git commit` sau `git push`, agentul trebuie să ruleze:
```bash
python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py
```
și să ceară permisiunea utilizatorului pentru push **doar** când verdictul final este `🟢 VERDE — 100% SIGUR PENTRU PUSH`.

