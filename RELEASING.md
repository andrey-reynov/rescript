# Local builds and future releases

Work on the development branch. Build a Windows installer with:

```sh
npm ci
npm run dist -- --win --publish never
```

Installers are written to dist/. Windows builds are unsigned. Keep all original copyright and license notices.

Automatic updating and the upstream update feed are removed. Usage telemetry, analytics, remote crash reporting, and Sentry source-map uploads are also removed. Model downloads remain available for local transcription.

Publishing is not configured (build.publish is null). Do not use release/tag scripts until fork publishing is explicitly configured and tested. The retained release workflow refers to andrey-reynov/rescript; development branch pushes do not trigger its tag-based release jobs.

See [Optional Fork Updates](Docs/Roadmap/10-Optional-Fork-Updates.md) before restoring opt-in updates for this fork.
