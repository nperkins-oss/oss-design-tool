# Automatic Deployment to Staging Rule

When completing feature implementations, bug fixes, or design tool updates:
1. Bump the application version using `node scripts/bump_version.js --patch` (or `--set <version>`) and document all notable changes under `## [<version>] - YYYY-MM-DD` in `CHANGELOG.md`.
2. Run `node scripts/verify_app.js` (`npm run verify`) and confirm 100% of version, changelog, syntax, asset, and headless boot checks pass before committing.
3. Always stage and commit the changes to the active feature branch (`feature/modular-architecture` or current branch).
4. Push the feature branch to GitHub (`git push origin <branch>`).
5. Merge the changes into `staging` and push `staging` to GitHub (`git push origin staging`) so the Azure Static Web Apps CI/CD workflow automatically verifies, builds, and deploys the latest version to the Azure staging site.
6. Switch back to the active feature branch so the workspace remains in a clean state for ongoing development.
