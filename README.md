# News Image — 20 November 2026

[![make.fun · news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/herlienn/news-image-entry-20nov/rank.svg)](https://make.fun/bounty/news-image-20261120/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/herlienn/news-image-entry-20nov/reward.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)

One image that sums up the world's news of Friday, 20 November 2026,
drawn as a one-page newspaper front page. The program draws every pixel
itself: a hand-made 5x7 bitmap font, drawn scenes and pictograms made from
plain shapes, and a hand-written PNG encoder. Standard library only, no
network, and every run writes byte-identical output.

Bounty: https://make.fun/bounty/news-image-20261120

## The model

This entry follows the pattern of the top-ranked entries of the 18 and
19 November editions, which packed 35 stories into one page: a count line
up front ("35 STORIES - 6 CONTINENTS - ONE DAY"), a per-region count bar,
a "Day in Numbers" strip, three large illustrated hero panels, a world map
with pins marking where each story happened, a numbered "Also on" list, a
"By the Clock — UTC" timeline, and a footer with sources and a date check.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).

## What the image covers

- **Lead — Russia strikes Kyiv with ballistic missiles overnight:**
  explosions and fires in several districts, a building hit in Obolonskyi.
- **A tanker catches fire in the Strait of Hormuz after hitting mines:**
  a liquefied gas carrier ablaze; Iran's navy says two more tankers hit.
- **A Houthi missile hits Riyadh's PIF Tower:** the 80-storey home of
  Saudi Arabia's sovereign wealth fund, 7-8 floors damaged, no injuries.
- **Plus 32 more stories** across six continents: Cyclone Akvan's landfall
  in India (80,000+ evacuated), Taiwan's short-selling curbs, New Zealand
  317-6 against India in Wellington, Cyclone Xavier in the Cook Islands,
  Egypt's solar plan for 7,000 factories, the ANC's Johannesburg coalition
  deal, COP31's final day, the Pete Rose pardon, and more — with a world
  map, a numbered list and a UTC timeline.
- **Date check:** the ICJ Rohingya ruling, the Trump-Xi-Putin summit and
  the Senate Iran war vote were all first reported on 19 November, not
  today, so they are deliberately not in this picture, even though they
  led yesterday's news.
