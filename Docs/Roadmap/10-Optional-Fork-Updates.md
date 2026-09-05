# Later — Optional Updates for This Fork

Status: explicitly deferred by the user. Current behavior is manual installation only.

## Current baseline

The automatic updater module and its startup call were removed, and package build.publish was set to null. The desktop title remains Rescript by Reynov. This disables application updating; it does not establish that every other network feature is disabled.

## Future goal

Restore an optional updater that obtains releases exclusively from andrey-reynov/rescript. Never use the original upstream project's release feed.

## Proposed scope

- Add an “Automatically check for updates” setting, off by default.
- Restore updater functionality from Git history if appropriate, adapting it to the fork's release/version strategy.
- Persist the user's preference and clearly identify the fork and offered release.
- Keep manual local installation available.
- Decide and document download/install consent separately from the automatic-check preference; enabling checks must not imply permission to silently replace a running build.
- Account for saved-project compatibility and recovery during version changes.

## Acceptance criteria

- Fresh installations and installations with the setting off make no update checks and schedule no automatic update downloads or installs.
- Enabling checks uses only this fork's release feed.
- Turning the setting off cancels future scheduled checks; pending work follows documented user-controlled behavior.
- Missing releases, offline use, and failed downloads do not disrupt editing or saved projects.
- Updates preserve the fork's identity and title and cannot route back to upstream releases.

## Implementation guidance

Confirm release publishing and manifests belong to the fork before enabling an updater. Review the inherited release scripts and CI configuration rather than assuming they are already configured for it. Test the installed package, preference persistence, failure handling, and project migrations. Do not implement this stage until requested.
