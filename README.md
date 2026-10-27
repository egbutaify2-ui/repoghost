# RepoGhost

**Evidence-backed intelligence for public GitHub developers and repositories.** RepoGhost helps people understand public developer portfolios, compare accounts against a role or use case, investigate repository health, and find relevant projects or contribution leads. Findings link back to GitHub sources, uncertainty stays visible, and recommendations never pretend to reveal private work or prove a person’s ability.

> RepoGhost is read-only. It does not clone repositories, execute repository code, open user-supplied links from repository text, or change the repository it investigates.

## Creator

Built by **Egbuta Ifeanyi Chukwu**. Follow my work on the [DEV profile](https://dev.to/egbutaify2ui) or explore my projects on the [GitHub profile](https://github.com/egbutaify2-ui).

## What it does

- **Investigates public GitHub accounts:** accepts usernames, `@handles`, or public profile URLs and lists returned public repositories for users and organizations.
- **Answers account follow-ups:** supports evidence-backed natural-language questions about public repository metadata, language/activity summaries, and sampled recent commits. Greetings and acknowledgements are handled as conversation instead of being misrouted into research.
- **Assesses developer evidence for a role:** connects a target role to relevant public repositories, observed technology signals, activity dates, evidence gaps, and interview questions. It is a screening aid—not a hiring verdict.
- **Compares two GitHub accounts:** uses explicit role-relevance, visible technology signals, activity, and shared-signal criteria, keeping each account’s evidence and citations separate. When metadata has no direct match, it samples a small number of recent public repositories and checks their available READMEs before reporting an evidence gap. The comparison still shows repository counts, observed languages, and recent repository links when exact role matches are absent.
- **Investigates repository health:** inspects a bounded sample of commits and open issues, the README excerpt, repository metadata, and the latest-release endpoint to identify maintenance signals and source-linked next steps.
- **Recommends projects and contribution leads:** matches returned account repositories to a stated goal, highlights license cautions, and links to actual sampled issues where available.
- **Preserves evidence and uncertainty:** distinguishes facts from hypotheses, never treats missing data as proof of missing skill, and does not call a quiet repository abandoned from activity alone.
- **Stays read-only:** never executes repository code, automatically forks projects, creates branches, opens issues or pull requests, or writes to GitHub.

- Accepts a public `https://github.com/owner/repository` URL and rejects unsupported hosts and malformed paths.
- Accepts a GitHub username, `@handle`, or public profile URL and discovers public repositories for users and organizations, with client-side search and sorting before the user chooses a repository to investigate.
- Provides **Account Intelligence Q&A** after account discovery: ask natural-language questions about public repository metadata, language/activity summaries, and a small sample of recent commits. Answers link to validated public evidence sources; unsupported questions return limitations rather than invented facts.
- Reuses the discovered account snapshot for five minutes on the running instance and limits extra commit lookups to the three most recently pushed, non-archived, non-fork repositories to reduce repeated API calls.
- Collects repository metadata, README content (when present), recent commits, open issues (excluding pull requests), and latest release data (when present) through GitHub's public REST API.
- Asks an **open-weight language model** to summarize the project, assess health from observable signals, surface potential maintenance risks, and propose exactly three evidence-linked next steps.
- Connects important findings to source IDs that are validated against the actual evidence returned by GitHub. Citations that are missing or invalid are discarded; an invalid analysis is not shown as fact.
- Clearly reports when inference is not configured or unavailable while preserving repository evidence. There is no silent closed-model fallback and no fabricated AI report.
- Uses bounded requests, timeouts, basic request-size limits, useful GitHub/API errors, and a responsive dark interface.

## Developer intelligence suite

The developer-intelligence workbench adds four read-only workflows to the existing account and repository investigation UI:

- **Developer assessment** accepts a public account and target role, then identifies relevant repository metadata and inspected README signals, demonstrated technology indicators, recent push dates, evidence gaps, and role-specific interview questions. It is a screening aid, not a hiring decision.
- **Account comparison** compares two distinct public accounts against an explicit goal. It shows the relevant repository match counts, technologies observed in the selected sample, latest recorded push dates, shared signals, and the evidence limits for each side. It does not produce a universal developer score.
- **Repository health and revival plan** examines repository metadata, a bounded sample of recent commits and open issues, the available README excerpt, and the latest-release endpoint. It highlights observable maintenance signals and gives three source-linked next steps. An old push date is not treated as proof of abandonment.
- **Repository recommendations** matches an account's returned public repositories to a stated use case, surfaces relevant metadata and license cautions, and links to real sampled open issues when available. Recommendations are keyword-relevance signals, not guarantees that a project is suitable.

The JSON endpoints are `POST /api/intelligence/assess`, `POST /api/intelligence/compare`, `POST /api/intelligence/health`, and `POST /api/intelligence/recommend`. All use the existing request-size validation, public GitHub evidence collector, repository evidence cache, request IDs, and consistent error envelopes. Core results are deterministic and remain available without AI inference; they do not invent facts or rely on a model to count repositories. Detail collection is bounded and sequential to reduce GitHub API pressure.

The new frontend is available from the **Developer Intelligence** panel and has responsive forms, evidence links, loading and failure states, scope warnings, and role-specific output. It can prefill account inputs after the existing username search. All workflows are read-only: RepoGhost does not fork a project, open issues, create branches or pull requests, or modify source repositories.

## Stack

- Node.js 22+ using native HTTP, `fetch`, and the Node test runner. No third-party runtime dependencies are required.
- Static HTML/CSS/JavaScript frontend served by the same Node process.
- GitHub REST API for repository evidence. A token is optional for basic public lookups but strongly recommended on hosted runtimes where outbound IPs may be shared.
- OpenRouter's OpenAI-compatible chat-completions API for inference.

The MVP uses plain JavaScript deliberately: the connected development environment does not have package-registry network access, and a dependency-free implementation keeps the first vertical slice runnable and auditable without a build toolchain. The modules are small and can be migrated to TypeScript once the deployment/build pipeline is established.

## Open-weight model and open innovation

The default model setting uses OpenRouter's `openrouter/free` router, which selects from currently available free compatible models. `OPENROUTER_MODEL` can override that setting, and the account and repository analysis paths have bounded fallback behavior for model-routing failures. Free-model availability and provider limits can change; a free endpoint is not a service-level guarantee.

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
| `GITHUB_TOKEN` | Recommended | Server-side token for authenticated public GitHub API requests and a higher request allowance. Never expose it in frontend code. |
| `APP_URL` | No | Public URL sent as inference-provider attribution. Set this to the deployed domain. |
| `PORT` | Usually set by host | HTTP listening port; defaults to `3000`. |

No account, GitHub token, database, or API key is required from visitors. Configure `GITHUB_TOKEN` on the server for a more reliable GitHub API allowance, and `OPENROUTER_API_KEY` to enable model inference. Keep both as server-side secrets. When the OpenRouter key is missing, the app tells visitors and displays collected repository evidence only.

## Run and test

A GitHub Actions workflow runs `npm run check` on pull requests targeting `main` and pushes to `main` or the developer-intelligence feature branch.

Requires Node.js 20+; Node.js 22 LTS is recommended.

```bash
npm start
npm test
npm run check
```

`npm test` uses Node's built-in test runner and mocked upstream responses. It covers URL and GitHub account validation, public-repository evidence retrieval and account discovery, account Q&A evidence collection and citation validation, open-weight model request/error handling, user and organization repository lists, missing README/release/issue data, GitHub 404 and rate-limit handling, prompt-injection boundaries, HTTP routes and secure response headers, plus role-relevant developer assessment, two-account source separation, read-only repository health planning, goal-based recommendations, and all four intelligence API endpoints.

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

RepoGhost remains an early-stage, read-only product. The new assessment, comparison, and recommendation workflows use deterministic relevance signals from returned public metadata and bounded README samples; they do not prove engineering skill or project suitability. Repository-health and contribution plans describe observed signals, not maintainer intent. RepoGhost does not clone repositories, install dependencies, execute code, run project test suites, write to GitHub, or store a database of past investigations. The account/repository AI paths require a configured provider and still need live inference verification in addition to mocked tests.

## License

MIT. See [LICENSE](./LICENSE).
