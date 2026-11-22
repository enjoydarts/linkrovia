# Upgrading Linkrovia

Your GitHub deployment copy has its own history. Follow the [upstream repository](https://github.com/enjoydarts/linkrovia) for changes and release instructions. To bring in an update, use GitHub's **Sync fork** if your copy is a fork and can be updated directly, or merge the upstream changes in a pull request. If your copy is an independent repository, track the upstream repository as a separate Git remote and bring the changes in through a pull request. Review changes before merging to the branch connected to your Worker.

1. Read the release notes and review the changes under `migrations/`. Preserve the Worker name, `DB` database ID, and any installation-specific settings in your configuration.
2. Download a Linkrovia configuration backup and record a D1 recovery point before updating. The configuration backup covers selected settings and records. D1 recovery can restore database state across a failed upgrade. [Backup and restore](backup.md)
3. Merge the update into the deployment branch. Cloudflare Workers Builds runs the configured build and deploy commands for that branch. The deploy script applies pending D1 migrations before uploading the application and halts if a migration fails.
4. After a successful build, check `/health`, sign in with an existing owner passkey, and follow an existing short link. Check analytics if you use it.

## Database compatibility and recovery

Published migrations are append-only. Preserve previously applied migration files and their names. Plan schema changes so the previous Worker can keep serving requests while the migration runs. Breaking changes require an explicit upgrade procedure, with a backup and recovery instructions in the release notes.

If a migration fails, correct the cause before retrying. D1 rolls back the failing migration and retains earlier successful migrations. If the deployment fails after migrations finish, the previous Worker can still be active against the updated database. Review migration compatibility before rolling back the Worker. A Worker rollback changes the application version and leaves D1 at its current state. Restore D1 separately only when necessary, after accounting for writes made since the recovery point. [D1 migrations](https://developers.cloudflare.com/d1/wrangler-commands/#d1-migrations-apply) · [Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
