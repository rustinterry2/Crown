# Crown AI research — baseline 1.0
Frozen production commit: 57d8c952028717cdba8ebf96e54692e6fefff97d. Engine snapshot is byte-for-byte unchanged. Maps are copied verbatim from that commit's app.js. Production main is not modified.
## Run
Node 18+; no dependencies. From repository root on branch ai-research:
```sh
node simulation/cli.js --start=1 --end=5 --trace --out=simulation-output/smoke
node simulation/cli.js --split=development --out=simulation-output/baseline
```
Optional filters: --map=england|random, --difficulty=easy|medium|hard, --policy=passive|beginner|expansionist|defensive|aggressive|siege|economic|expert.
Development seeds 1–250 per cell (12,000 campaigns), validation 10001–10084, holdout 20001–20084. Validation and holdout remain unopened until model selection; holdout requires explicit unlock. These disjoint seeds provide approximately a 60/20/20 split. Policies use a separate seeded RNG. The baseline engine retains its original shared RNG, so matched seeds do not guarantee identical combat shocks after divergent decisions. No tuning using validation/holdout.
## Fidelity
The simulation calls the actual baseline engine for movement, purchases, battle, transfers, taxes, rivalry and events. It models invitation choices and the browser's monthly sequence, not graphics. Scripted players are independent of AI decision functions; their heuristics are proxies, not calibrated human skill. They use legal friendly transit and voluntary home return as currently allowed. Robin aid may be selected by competent policies. AI decision trace logs observed actions/objectives, not unimplemented rejected alternatives. Full trace for one campaign uses --trace; campaign rows are always exported.
## Metrics
Outcome is human victory/defeat/ongoing/error. Months counts attempted monthly rounds. First Norman siege counts fought or unopposed fortified AI captures; reported only among campaigns with a siege. Guard streak counts consecutive explicit guard orders per living AI lord. No-progress streak counts consecutive AI turns without purchase, castle construction, claim or successful battle; it is a heuristic, not proof of stalemate. Stalled proxy = ongoing at horizon AND any AI lord had >=9 no-progress turns. AI attacks on human and Norman infighting count battles and unopposed hostile captures. Opening claims count neutral claims by AI lords in round one. Check state after each player/AI action and monthly events; these checks detect negative troops/treasury, invalid owners and army locations, not every possible rule violation. Existing asymmetries (e.g. AI castle garrison size, instant retreat) are deliberately preserved.
## Next
Review baseline before architectural experiments. Build challenger on research branch; keep baseline snapshot and seeds fixed. No AI 2.0 has been deployed. Full outcome data can be regenerated from the CLI. Candidate improvements and scoring weights must be registered before opening holdout.
