# rdprassy portfolio

Source for [www.rdprassy.com](https://www.rdprassy.com), the portfolio of Devi Prasad Choudhary Ratnala.

The site includes live products, engineering case studies, an open [RAG Studio](https://www.rdprassy.com/rag-studio.html) showcase with executable evaluation and a walkthrough, applied AI work, interactive artifacts, résumé editions, a dedicated showcase for the 92-page novel [The Art of Making](https://www.rdprassy.com/the-art-of-making.html), writing, a ten-film [Project Cinema](https://www.rdprassy.com/project-cinema.html), a privacy-aware [Watch & Listen media lounge](https://www.rdprassy.com/watch-listen.html), an eleven-game [RD Arcade](https://www.rdprassy.com/games.html), and a device-local [Eisenhower Task Matrix](https://www.rdprassy.com/task-manager.html).

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
