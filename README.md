# RepoGhost

**Evidence-backed archaeology for public GitHub repositories.** RepoGhost follows README, commit, release, and issue trails so a new maintainer can understand a codebase without confusing observable facts with guesses about the people who built it.

> RepoGhost is read-only. It does not clone repositories, execute repository code, open user-supplied links from repository text, or change the repository it investigates.

## What it does

- Accepts a public `https://github.com/owner/repository` URL and rejects unsupported hosts and malformed paths.
- Collects repository metadata, README content (when present), recent commits, open issues (excluding pull requests), and latest release data (when present) through GitHub's public REST API.
- Asks an **open-weight language model** to summarize the project, assess health from observable signals, surface potential maintenance risks, and propose exactly three evidence-linked next steps.
- Connects important findings to source IDs that are validated against the actual evidence returned by GitHub. Citations that are missing or invalid are discarded; an invalid analysis is not shown as fact.
- Clearly reports when inference is not configured or unavailable while preserving repository evidence. There is no silent closed-model fallback and no fabricated AI report.
- Uses bounded requests, timeouts, basic request-size limits, useful GitHub/API errors, and a responsive dark interface.

## Stack

- Node.js 22+ using native HTTP, `fetch`, and the Node test runner. No third-party runtime dependencies are required.
- Static HTML/CSS/JavaScript frontend served by the same Node process.
- GitHub REST API for repository evidence; no GitHub personal access token is needed for the basic public-repository path.
- OpenRouter's OpenAI-compatible chat-completions API for inference.

The MVP uses plain JavaScript deliberately: the connected development environment does not have package-registry network access, and a dependency-free implementation keeps the first vertical slice runnable and auditable without a build toolchain. The modules are small and can be migrated to TypeScript once the deployment/build pipeline is established.

## Open-weight model and open innovation

Default model: [`google/gemma-4-26b-a4b-it:free`](https://openrouter.ai/google/gemma-4-26b-a4b-it%3Afree), Google DeepMind Gemma 4 26B A4B IT, listed by OpenRouter as open-weight and Apache-2.0 licensed. The `:free` variant is currently listed at zero token price; OpenRouter's free tier is rate limited (currently 50 free-model requests/day without purchased credits, with provider availability and limits subject to change). A free endpoint is not a service-level guarantee.

Why open innovation matters to RepoGhost:

- **Replaceable inference:** `OPENROUTER_MODEL` is configuration, not hard-coded to a closed assistant. The analysis interface is isolated from GitHub collection, making model swaps possible.
- **Auditable behavior:** the system prompt, data handling, citation validator, and inference contract are part of this repository and can be inspected or adapted.
- **Evidence over authority:** model output is constrained to source IDs actually collected from GitHub. A model cannot create a new citation URL in the displayed result.
- **Self-hosting path:** because the inference contract is a server-side chat-completions call, an operator can route to a self-hosted open-weight endpoint later without changing repository collection or the UI.

RepoGhost does not claim that an externally hosted inference call is private or offline. Repository text sent for analysis is sent to the configured inference provider. Review that provider's terms before analyzing sensitive private information; this MVP supports public repositories only.

## Configuration

Copy `.env.example` to `.env` for a local run, or configure the same values in the hosting provider's environment-variable settings. Never commit `.env` or place the key in frontend JavaScript.

| Variable | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | For AI analysis | Server-side key from [OpenRouter API Keys](https://openrouter.ai/keys). Leave unset to use the repository-evidence view without generating an AI answer. |
| `OPENROUTER_MODEL` | No | Model ID. Default: `google/gemma-4-26b-a4b-it:free`. Do not silently replace it with a closed model. |
| `APP_URL` | No | Public URL sent as inference-provider attribution. Set this to the deployed domain. |
| `PORT` | Usually set by host | HTTP listening port; defaults to `3000`. |

No account, GitHub token, database, or API key is required from visitors. The owner must configure `OPENROUTER_API_KEY` on the server to enable actual model inference. When it is missing, the app tells users so and displays collected evidence only.

## Run and test

Requires Node.js 20+; Node.js 22 LTS is recommended.

```bash
npm start
npm test
npm run check
```

`npm test` uses Node's built-in test runner and mocked upstream responses. It covers URL validation, public-repository evidence retrieval (with a test HTTP client), missing README/release/issue data, GitHub 404 and rate-limit handling, model configuration and failure states, evidence-source validation, prompt-injection boundaries, the HTTP route, and secure response headers.

These tests are deterministic mocks. They do **not** establish that the GitHub API or OpenRouter inference succeeded against live services. A live validation should be completed after the app is deployed and `OPENROUTER_API_KEY` is configured. `/api/health` checks that the server is responding; `aiConfigured` reports only whether the server has a key, not whether a live inference request will succeed.

## Deploy online with Render

`render.yaml` describes a free Node web service with `/api/health` as the health-check route. It runs the test suite before starting the app. The hosted service needs a Git repository connected to Render.

1. Create the public GitHub repository `egbutaify2-ui/repoghost` and push the files in this directory to its default branch.
2. In the Render dashboard, create a **free** web service from this repository (or use the Blueprint in `render.yaml`). Do not choose a paid plan.
3. In the Render service's **Environment** page, set `OPENROUTER_API_KEY` to the key you create on OpenRouter, `OPENROUTER_MODEL` to the default shown above, and `APP_URL` to the deployed service URL. Keep the key in the server environment only.
4. Wait for the deploy to finish, then verify `/api/health`, a real public repository lookup, and an AI-enabled investigation. The live test should be recorded separately from the mocked unit tests.

Repository creation and deployment permissions are environment-dependent. The initial cloud session did not expose a GitHub repository-creation action, and Render requires the user to select a workspace before the service can be created. Those steps must be completed online in the connected accounts before a live public URL can be reported.

## Evidence and safety model

The server gathers a bounded evidence set. README text, issue titles and bodies, commit messages, descriptions, topics, and release metadata are treated as untrusted input. The system prompt explicitly tells the model to ignore embedded instructions in repository content. RepoGhost never runs repository code. Model citations are filtered against the source IDs captured from GitHub, and an AI analysis with no valid evidence-backed three-step plan is withheld.

The app intentionally avoids claiming a project is “abandoned” from inactivity alone. Quiet history, old releases, or open issues are signals to inspect, not proof of why maintainers acted or stopped acting. All generated risks remain hypotheses and should be checked against the linked repository records.

## Project status

This is an MVP vertical slice, not a finished maintainer platform. It does not install dependencies from third parties, clone repositories, run static analysis, infer maintainers' intent, write code back to GitHub, or keep a database of prior investigations. Partner observability integrations are intentionally deferred until core live inference and deployment have been verified.

## License

MIT. See [LICENSE](./LICENSE).
