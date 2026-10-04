# Ferrosift

Ferrosift's public concept website. Real photography, concise industry evidence, and a separate interactive engineering explorer.

**Live:** https://gtamerlan.github.io/ferrosift/

## Editing and preview

- `index.html`: homepage content and source credits
- `styles.css`: responsive layout and self-hosted D-DIN typography
- `site.js`: navigation, source disclosure, and restrained entrance effects
- `explorer.html`: Brandon's interactive engineering concept, preserved from commit `1dc8dbd`
- `assets/images`: real photographs; attribution and licensing in `SOURCES.md`
- `assets/fonts`: D-DIN font files and SIL Open Font License

No build step or runtime packages. Preview with `python3 -m http.server 8766` and open http://localhost:8766.

GitHub Pages publishes the repository root on `main`. `.nojekyll` enables plain static-file hosting. All homepage assets are hosted in this repository. The explorer retains its existing external Google Fonts dependency.

Industry results are not Ferrosift results. Ferrosift is an early-stage concept; its system and beyond-Earth plans are not demonstrated product capabilities. No AI-generated photographs are used.
