# AI 1.0 baseline — development panel

## Scope
12,000 campaigns; 250 shared initialization seeds per map × difficulty × player-policy cell. Each campaign ends at human victory, defeat, or 60 attempted monthly rounds. England and browser-generated random kingdoms; eight independent scripted player policies. Production baseline: `57d8c952028717cdba8ebf96e54692e6fefff97d`. The validation and holdout panels were not run.

## Outcome dashboard
| Scenario | Campaigns | Human win | Human defeat | Unresolved | Stall proxy |
|---|---:|---:|---:|---:|---:|
| all | 12000 | 10.80% | 79.31% | 9.89% | 9.23% |
| easy | 4000 | 28.35% | 57.58% | 14.07% | 13.45% |
| medium | 4000 | 3.83% | 84.25% | 11.93% | 10.65% |
| hard | 4000 | 0.23% | 96.10% | 3.67% | 3.60% |
| england | 6000 | 11.27% | 77.95% | 10.78% | 9.77% |
| random | 6000 | 10.33% | 80.67% | 9.00% | 8.70% |

## Player strategy comparison
| Scenario | Campaigns | Human win | Human defeat | Unresolved | Stall proxy |
|---|---:|---:|---:|---:|---:|
| passive | 1500 | 0.53% | 99.20% | 0.27% | 0.20% |
| beginner | 1500 | 9.93% | 89.67% | 0.40% | 0.13% |
| expansionist | 1500 | 7.07% | 92.20% | 0.73% | 0.27% |
| defensive | 1500 | 0.00% | 30.80% | 69.20% | 68.73% |
| aggressive | 1500 | 22.20% | 74.87% | 2.93% | 1.47% |
| siege | 1500 | 16.47% | 82.13% | 1.40% | 0.80% |
| economic | 1500 | 12.07% | 85.80% | 2.13% | 1.07% |
| expert | 1500 | 18.13% | 79.80% | 2.07% | 1.20% |

## Expert-policy difficulty
| Difficulty | Campaigns | Human win | Human defeat | Unresolved |
|---|---:|---:|---:|---:|
| easy | 500 | 45.80% | 50.60% | 3.60% |
| medium | 500 | 8.20% | 89.20% | 2.60% |
| hard | 500 | 0.40% | 99.60% | 0.00% |

## Additional results
- 721,826 AI turns; 120,538 guard turns (16.70%).
- 25,068 Norman siege attempts; 95.84% of campaigns saw at least one. Mean first siege month 8.43 among campaigns with a siege.
- 82,267 AI hostile captures or battles against the human; 6,157 Norman-on-Norman battles or hostile captures.
- 59,764 opening neutral AI claims in 60,000 opening AI turns (99.61%).
- No observed state-check errors in the corrected full panel.
- 1,108 campaigns (9.23%) meet the stall proxy: unresolved at 60 months with at least one AI lord experiencing nine consecutive no-progress turns at some point. This is a screening metric, not proof of an irrecoverable stalemate.

## Interpretation
The original concern is reproduced under the defensive policy: 1,038 of 1,500 campaigns remained unresolved, 1,031 met the stall proxy, and 47.73% of AI turns were guard orders. Most other strategies rarely reached the time horizon. The defensive policy never attempts victory; these rates measure the opponents' ability to overcome sustained defense, not player skill. The expert policy is a heuristic, not a validated proxy for a skilled human; low win rates alone do not establish real-world difficulty. Nevertheless, they flag a calibration risk. Prioritize opponent-specific recruitment and siege composition, then strategic replanning and diplomacy. Keep the opening expansion logic as a candidate control; evaluate every feature on matched development scenarios. Record cost, odds, target and rejected actions once a challenger supports decision instrumentation. No production AI changes have been made.

## Reproduction
```sh
node simulation/cli.js --split=development --out=simulation-output/baseline
node --test simulation/simulation.test.js
```
The full per-campaign dataset is reproducible with the CLI; checked-in JSON files contain actual aggregate results from four batches, plus the combined summary. The monthly and decision traces are available for individual campaigns. All figures are descriptive, not out-of-sample validation or inferential statistics.
