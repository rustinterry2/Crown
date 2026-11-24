# Recruitment architecture screen: M0–M3
## Method
9,600 campaigns, 2,400 per model. Matched development seeds 1–50, 3 difficulties, 2 map types, 8 independent scripted player policies, maximum 60 months. Same baseline game mechanics, unchanged live main branch. See [protocol](../ABLATION_PROTOCOL.md). All comparisons are descriptive development results, not holdout validation. The baseline sample is a subset of the earlier 12,000-campaign baseline.

## Results
| Model | Stall proxy | Defensive unresolved | Guard turns | Expert human win | State errors |
|---|---:|---:|---:|---:|---:|
| M0 | 8.63% | 64.67% | 15.17% | 16.00% | 0 |
| M1 | 0.08% | 1.67% | 0.16% | 18.00% | 0 |
| M2 | 2.88% | 24.33% | 3.47% | 18.00% | 0 |
| M3 | 0.08% | 1.33% | 0.15% | 18.00% | 0 |

M3 reduced stall proxy from 207 to 2 campaigns (99.03% relative reduction). Defensive unresolved campaigns dropped from 194/300 to 4/300. M1 and M3 each removed all 207 matched baseline stall cases and introduced two new ones. M3 left 17 campaigns unresolved overall (versus 224 in M0), and 197 matched previously unresolved campaigns ended in human defeat, 13 in victory; 3 previously resolved campaigns became unresolved. These changes are not independent estimates because the same initialization seeds are used across policies and maps. Combat streams can diverge following actions.

M3 versus M1: 143,195 vs 159,195 soldiers purchased; 7,483 vs 6,885 catapults purchased; 385,540 vs 393,210 total AI gold spent; 124,681 vs 127,902 troops lost. Differences in campaign length and trajectories mean aggregate spending/losses are not pure per-action efficiency estimates. In defensive scenarios, M3 mean campaign duration was 19.49 vs 20.39 months, and total AI spending was 135,777 vs 143,446 gold. No model purchased knights: existing unit economics and the local optimizer favor soldiers and siege equipment. Do not change unit prices as part of this ablation.

Expert-policy victory rates by difficulty (100 campaigns each): M0 easy 39%, medium 8%, hard 1%; M3 easy 46%, medium 8%, hard 0%. These remain below provisional target ranges and should not be interpreted as actual human skill. The defensive policy does not attempt conquest. Opening AI neutral claim share remains 99.77% in every model.

## Fortified scenario
A Norman with 75 soldiers, one catapult and 500 gold faces a 150-soldier Saxon castle. The projected siege win chance is 22.45%; baseline has no viable plan. M1 and M3 purchase 25 soldiers, raising projected odds to 33.55%; M2 buys one catapult, raising odds to 27.59%. This demonstrates the cap can be exceeded under M1/M3, and composition is evaluated under M2/M3. It is a constructed stress test, not a reconstruction of the recorded game.

## Decision
Advance M3 as a provisional development challenger; retain M1 as the simpler comparator. M3 provides marginal improvement over M1, not a statistically established superiority. Next: matched architectural experiments for multi-turn strategic planning, threat assessment, diplomacy, and stagnation detection. Instrument decision traces and calibrate difficulty; do not deploy before independent validation and playtesting. Validation/holdout seeds remain untouched.

## Reproduce
```sh
node simulation/ablation-cli.js --start=1 --end=50 --out=simulation-output/ablation
node --test simulation/challengers.test.js
```
Actual aggregate files: recruitment-ablation-england.json, recruitment-ablation-random.json, recruitment-ablation-summary.json.
