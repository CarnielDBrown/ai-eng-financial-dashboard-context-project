# Performance Skill Audit

## Scope and Choice

The `performance` skill from `addyosmani/web-quality-skills` was selected after `npx skills find performance` surfaced it. The existing Vite build warns that the JavaScript chunk exceeds 500 KB before compression, making bundle size a relevant audit target.

## Evidence

| Signal | Evidence | Interpretation |
| --- | --- | --- |
| JavaScript bundle | Vite reports 584.01 KB raw and 175.07 KB gzip after the accessibility and metadata changes. The prior build measured 583.75 KB raw and 174.97 KB gzip. | Compressed JavaScript remains below the performance skill's 300 KB starting guardrail. The accessibility change added about 0.10 KB compressed. |
| CSS and HTML | Current build reports 17.87 KB raw / 4.39 KB gzip CSS and 0.62 KB raw / 0.37 KB gzip HTML. | Combined compressed HTML, CSS, and JavaScript is about 180 KB before runtime data. |
| Images and fonts | The dashboard UI has no content images and does not load a web font; `frontend/src/index.css` uses a font stack with system fallbacks. | No image or font transfer is currently contributing to initial page weight. |
| Field data | The audited page is localhost. | CrUX/RUM field data is unavailable; this is not evidence that field performance passes. |
| Browser lab data | Lighthouse could not find a system Chrome/Chromium. Playwright's downloaded headless shell could not start because `libatk-1.0.so.0` is unavailable. | LCP, CLS, and TBT could not be measured in a browser trace in this environment. |

## Decision

No code-splitting change was made. The charts are central content rendered on the initial dashboard, and the only bundle warning is based on the uncompressed chunk size; current gzip size is below the skill's starting budget. Deferring the charts would delay visible core content, and no browser trace demonstrates a user-facing bottleneck. Treat that decision as a static audit, not as a measured performance pass. Re-run a mobile Lighthouse/DevTools trace in an environment with a working browser before making further performance changes.