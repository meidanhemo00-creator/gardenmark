# GardenMark website concept

Static site (Vite, vanilla JS/CSS). Pages:

- `index.html`: homepage
- `brand.html`: logo refinement (original vs proposed)
- `strategy.html`: research synthesis, audiences, headline tests, claims register, missing assets, test log (internal, noindex)

```
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

## Content rules
- Every product or performance statement must trace to a row in the claims register (`strategy.html`, section 6).
- Photos in `public/img/gm/` are GardenMark's own (from gardenmark.com). Photos in `public/img/life/` are Unsplash-licensed lifestyle images and must keep their "Illustrative" tag.
- The dealer form only composes a `mailto:` draft. Connect a real endpoint (CRM or form service) before launch and update the privacy policy.

## Sources
`research/` holds the downloaded GardenMark PDFs and original images used for verification. `scripts-images.mjs` regenerates the optimized WebP files.
