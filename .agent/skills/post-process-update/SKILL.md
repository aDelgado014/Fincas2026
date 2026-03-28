---
name: post-process-update
description: Workflow to update the repository and documentation after completing a task or process.
---

# Post-Process Update Skill

This skill ensures that the repository and all related documentation are synchronized after each significant update or completion of a phase.

## Instructions

Whenever you (the agent) finish a task or a major process, YOU MUST follow these steps:

1. **Update `walkthrough.md`**: Document the changes made, the files affected, and the results of the verification process. Embed any relevant screenshots or recordings.
2. **Update `task.md`**: Ensure all completed tasks are marked with `[x]` and any new next steps are clearly defined.
3. **Synchronize Repository**:
   - Check `git status` to see all changed files.
   - Stage the changes: `git add .` (unless specific files should be excluded).
   - Commit the changes with a concise and descriptive message: `git commit -m "feat: description of changes"`.
   - If a remote origin exists and it's safe to do so, push the changes: `git push`.
4. **Update README.md**: If the changes affect the project's structure, installation process, or core features, update the `README.md` to reflect the current state.
5. **Clean Up**: Remove any temporary files or scratch scripts created during the process.

## Triggers

- Completion of a Phase in the `task.md`.
- After successful verification of a major feature.
- When the user explicitly requests to "update the repository".

## Important Notes

- Always use absolute paths for artifact files.
- Ensure commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) if applicable.
