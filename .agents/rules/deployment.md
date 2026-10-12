# Automatic Deployment to Staging Rule

When completing feature implementations, bug fixes, or design tool updates:
1. Always stage and commit the changes to the active feature branch (`feature/modular-architecture` or current branch).
2. Push the feature branch to GitHub (`git push origin <branch>`).
3. Merge the changes into `staging` and push `staging` to GitHub (`git push origin staging`) so the Azure Static Web Apps CI/CD workflow automatically builds and deploys the latest version to the Azure staging site.
4. Switch back to the active feature branch so the workspace remains in a clean state for ongoing development.
