# Rescript by Reynov

Independent fork based on the original ReScript app by Wassim Gharbi and contributors. Not affiliated with or endorsed by the original project.

Fork repository: https://github.com/andrey-reynov/rescript

Original work: [ReScript by Wassim Gharbi and contributors](https://github.com/wassgha/rescript). Original copyright notices and the [PolyForm Noncommercial license](LICENSE) are retained.

## Local fork

A transcript/audio-centric rough-cut editor for commentary and gameplay. Transcribe and edit locally, then hand off to an NLE for finishing. This is not intended to replace Resolve.

Usage telemetry, Google/Vercel analytics, and remote crash reporting have been removed. Errors remain available locally for troubleshooting. Automatic application updates are removed; install updates manually. Speech models may still require an initial download.

## Development

Active work happens on the development branch.

```sh
git switch development
npm ci
npm run electron:dev
```

Build a local Windows installer with `npm run dist -- --win --publish never`. Output is in `dist/`.

The app uses Next.js, React, TypeScript, Zustand, Electron, local speech models, and ffmpeg.wasm.

See [the roadmap](Docs/Roadmap/Roadmap.md) for milestones and acceptance criteria.
