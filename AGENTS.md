# Working on Melorina

The canonical project is https://github.com/axsimarosmelos/Melorina-.
The owner wants all project updates maintained in this repository, including
code, tests, setup instructions, design decisions, and documentation.

- For an authorized project change, implement it, run relevant checks, commit,
  and push to GitHub. A local file or downloadable preview alone is not delivery.
- Check the current remote branch before editing or pushing. Preserve unrelated
  changes and use non-force updates. Work on `main` unless the user specifies a
  different branch or workflow.
- Report the commit or pull request link and the actual verification performed.
  Distinguish mocked checks from live API, browser, and deployment verification.
- Keep secrets out of commits and browser builds. Real API keys belong only in
  server configuration. Do not commit learner recordings or private transcripts.
- GitHub Pages serves the browser app from `main` at the repository root. The
  public URL is https://axsimarosmelos.github.io/Melorina-/.
- GitHub Pages does not run the Node/OpenAI backend. Do not claim AI voice is live
  there until a separately hosted, authenticated backend has been connected and
  tested. Keep setup and deployment documentation accurate.
