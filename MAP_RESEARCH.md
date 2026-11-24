# Random Kingdoms 2.0 — geometry prototype

This is a research-only branch. The playable main branch still uses the original generator. The deployed M3 AI is unchanged.

## Algorithm
The coastline uses a multi-frequency radial shape with additional directional bays and peninsulas, normalized to a tall bounding box. Eighteen dispersed seeds grow connected regions through a priority queue, with spatially varying traversal costs and different growth speeds. Shared cell labels define all territorial geometry and adjacency. Validation rejects undersized or excessively disparate territories, disconnected land, and maps lacking room for the designated castle and horse footprints. Six home positions are spread out and assigned factions randomly. Sherwood Forest must fit inland and avoid the six initial castle/horse pairs.

## Validation
Node 22 local run: seeds 1–1000, all 1000 maps passed independent connectivity, adjacency, and footprint checks. Mean height/width 1.289 (range 1.141–1.543); mean largest/smallest area 3.044 (range 2.039–4.957); mean adjacency 4.125; observed degree 1–8; mean coast complexity 1.662. Average attempts 2.481, maximum 16. Accepted styles: Elongated 119, Peninsular 346, Divided 265, Coastal 270. Style frequency is not uniform because retries select new styles; 481/1000 maps achieved the initial area ratio target of 3–5. No assertion of perfectly balanced starting positions is made.

Run: node validate-map.js 1 1000 validation.json

## Comparison
The checked-in map-comparison.json records 600 matched campaigns (50 seeds, 3 difficulties, expert/defensive policies, old/new geometry) using the current M3 engine. Both panels had zero observed state errors. For the 50 paired maps: height/width .874 -> 1.288; largest/smallest territory area 2.365 -> 3.092; raster coastline complexity 1.519 -> 1.671; internal boundary length normalized by sqrt(area) 8.136 -> 8.208; degree 4.207 -> 4.111. Original England graph mean degree 3.889, min 1 and max 7. The original raster was not decoded, so precise England coastline or area comparisons are not asserted. Gameplay sample does not establish balance.

## Preview
Actual generated map seeds, grouped by style: Elongated 8/22/34; Peninsular 4/5/7; Divided 2/10/18; Coastal 1/3/6. Colors in previews distinguish adjacent regions and are not starting faction assignments.

## Before deploying
Refine internal boundaries and ensure style diversity. Test broad seed distribution, browser generation speed, rendering and tap detection. Existing random castle exclusion rectangles are more conservative than the rendered art; integrate accurate footprint-based checks and test moving/stacked horses and secondary castles. Improve the parchment background; preserve original England artwork and mechanics. Conduct additional gameplay balancing, not just legality checks. No production map changes yet.
