# rdprassy portfolio

Source for [www.rdprassy.com](https://www.rdprassy.com), the portfolio of Devi Prasad Choudhary Ratnala.

The site includes live products, engineering case studies, applied AI work, interactive artifacts, résumé editions, writing, a ten-film [Project Cinema](https://www.rdprassy.com/project-cinema.html), and a playable [RD Arcade](https://www.rdprassy.com/games.html).

## Local build

```sh
npm run build
```

The static site is published from the `gh-pages` branch.

## Project films

The tracked production source lives in `video-production/`. The generated narration, frames, captions, and MP4 files remain local so large media files do not slow down the GitHub Pages repository.

On macOS, with FFmpeg installed, regenerate the films with:

```sh
npm run videos
```
