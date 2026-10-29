# RepoGhost

<p align="center">
  <strong>Every GitHub profile leaves a ghost.</strong><br />
  <em>Summon it. Ask anything. Uncover the traces.</em>
</p>

<p align="center">
  <a href="https://repoghost.onrender.com"><strong>Summon RepoGhost →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/egbutaify2-ui/repoghost">Inspect the source</a>
</p>

RepoGhost is an AI-powered investigation tool for public GitHub accounts and repositories. Enter a username, follow the trail through projects, commits, technologies, issues, and README files, then question the ghost about what the public record reveals.

What has this developer been building? Which technologies appear in their projects? What changed recently? Which repositories deserve a closer look? What evidence supports a possible match for a role? Where could someone contribute?

Instead of stopping at a static profile summary, RepoGhost supports follow-up questions about an account's public work. Its answers link back to available evidence and expose gaps when the public trail can't answer a question.

> **The ghost only knows what the evidence can reveal.** RepoGhost does not access private repositories, private messages, or a person's offline life. It must not invent facts when the public record doesn't support an answer.

## The live experience

**[Launch RepoGhost](https://repoghost.onrender.com)**

Enter a public GitHub username or profile URL to discover an account's public repositories. You can also investigate a public repository directly.

### Things to ask the ghost

- Which repositories in this account are most relevant to a particular role or technology?
- What technologies can you actually see evidence of in these projects?
- What has changed recently across the public repositories?
- What are the strongest projects to investigate for a specific goal?
- What can the available README files, metadata, and sampled commits tell us—and what remains unknown?
- Which two public accounts show relevant overlap for a role or use case?
- Which repositories show maintenance signals worth investigating?
- Where are there real open issues that could be contribution leads?

Answers depend on the evidence collected for that workflow. RepoGhost does not have universal knowledge of a person, and it does not treat a missing signal as proof that a skill or project does not exist.

## What RepoGhost can investigate

### Account intelligence and Q&A
Accepts GitHub usernames, `@handles`, and public profile URLs, discovers public repositories for users and organizations, and supports natural-language follow-up questions about repository metadata, language and activity summaries, and a bounded sample of recent commits. Answers use validated public evidence where available; unsupported questions should return limitations instead of invented facts.

### Developer assessment
Connects a public account to a target role or goal. It surfaces relevant public repositories, observed technology signals, recent activity, evidence gaps, and role-specific interview questions. It is an investigation aid, not a hiring verdict or proof of engineering ability.

### Two-account comparison
Compares two distinct GitHub accounts against an explicit goal. It reports role-relevant matches, observable technologies, recent repository activity, shared signals, and evidence limitations. It does not issue a universal developer score or rank people by repository count alone.

### Repository health and revival plan
Inspects repository metadata, a bounded sample of recent commits and open issues, available README content, and release information when present. It identifies observable maintenance signals and proposes three source-linked next steps. An old push date or missing release is a reason to investigate—not proof that a project is abandoned.

### Project and contribution recommendations
Matches discovered public repositories to a stated goal, surfaces relevant metadata and license cautions, and links to real sampled open issues where available. Recommendations are relevance signals, not guarantees that a project is suitable.

## How it works

RepoGhost combines public evidence collection, deterministic application logic, and AI-assisted interpretation.

1. **Summon the account or repository.** The application validates the supplied GitHub username, profile URL, or repository URL.
2. **Follow the trail.** The server retrieves relevant public GitHub data, which can include repository metadata, README content, recent commits, open issues, and release information when available.
3. **Question the evidence.** An open-weight language model helps interpret the evidence, summarize a project, and answer supported account questions.
4. **Check the sources.** Important model-generated source references are validated against evidence actually collected from GitHub. Missing or invalid citations are discarded; invalid analysis is not presented as verified fact.
5. **Reveal the limits.** Missing information, unsupported questions, and upstream failures should remain visible. RepoGhost distinguishes observable facts from hypotheses and avoids claiming it knows a maintainer's intent.

The account discovery flow caches the discovered snapshot for five minutes on the running instance. Extra commit lookups are limited to the three most recently pushed, non-archived, non-fork repositories to reduce unnecessary GitHub API requests.

## The ghost's rules

- **Evidence before theory.** Findings should point back to the public source data that supports them.
- **A quiet project is not automatically a dead project.** Inactivity, old releases, and open issues are signals to examine, not proof of abandonment.
- **No invented biography.** RepoGhost analyzes public GitHub work, not a person's private life or complete abilities.
- **No universal developer score.** Role and project comparisons use stated criteria and show the limits of the available evidence.
- **Read-only by design.** RepoGhost does not clone repositories, execute their code, install dependencies, run their test suites, fork projects, create branches, open issues or pull requests, or write to the repositories it investigates.
- **Treat repository content as untrusted.** README text, issue content, descriptions, commit messages, and other repository-controlled text can contain prompt-injection attempts. The model is instructed to ignore embedded instructions in this content.
- **No silent model substitution.** If the configured model is unavailable, RepoGhost reports an inference failure rather than quietly switching to a different model family.

## Repository origin, activity and attribution

RepoGhost separates direct GitHub observations from interpretations and unknowns.

- **Forks:** GitHub-marked forks are labelled as forks, with the parent repository shown when the API returns it. A fork flag does not reveal how much original work the account contributed.
- **Mirrors:** A GitHub-reported mirror source is shown as observed metadata. Wording in a public description or README can trigger a **possible mirror** label, explicitly marked as an inference that needs manual verification.
- **Activity:** The UI reports the last-push date, archive status and whether a push appears within the past 12 months. A quiet history, old release, or archived flag is context—not a score for the person behind the repository.
- **Role relevance:** Project matches are based on keyword overlap in public metadata and inspected README text. Push recency and star counts do not break ties in role relevance, and comparisons name project leads instead of ranking accounts by the number of matches.
- **Authorship:** Repository ownership and commit volume do not prove who wrote the code or how much original work an account contributed. Code quality, proficiency, collaboration, private work and job performance remain unknown unless independently verified.

Each project-level signal links to the relevant public source when available. Treat “observed”, “inferred”, and “unknown” as different kinds of claims.

## How I built it

- **Runtime:** Node.js with native HTTP and `fetch`
- **Frontend:** Static HTML, CSS, and JavaScript served by the Node process
- **GitHub evidence:** GitHub REST API
- **AI inference:** OpenRouter's OpenAI-compatible chat-completions API
- **Default model:** `google/gemma-4-26b-a4b-it:free` — Gemma 4 26B A4B IT
- **Tests:** Node.js built-in test runner
- **Deployment:** [Render](https://repoghost.onrender.com)
- **License:** MIT

No third-party runtime packages are required for the core Node.js application. The lightweight implementation keeps the main request flow easy to audit without a separate frontend build toolchain.

## Open-weight AI and open innovation

RepoGhost uses Google's **Gemma 4 26B A4B IT**, an open-weight model released under Apache 2.0, through OpenRouter.

The model is part of the investigation experience—not just a decorative chatbot. It helps interpret repository evidence, summarize projects, and generate evidence-linked recommendations. The configured model is also used for account Q&A. If inference is unavailable, RepoGhost reports that problem instead of fabricating an AI response or silently changing to a different model.

Open innovation matters to this project for three reasons:

- **Choice and adaptability:** `OPENROUTER_MODEL` is configurable, and the inference layer is separated from GitHub collection and the frontend. Compatible models and providers can be evaluated without redesigning the whole application.
- **Inspectability:** prompts, evidence handling, citation validation, and application behavior live in the repository and can be examined or adapted by other developers.
- **A path to self-hosting:** the server-side chat-completions interface leaves room to route inference to a compatible self-hosted open-weight model in the future.

The deployed version uses OpenRouter and requires an internet connection. It is **not currently an offline or local-inference application**, and repository material used in an AI request is sent to the configured inference provider. Review that provider's terms before using the service. RepoGhost currently supports investigation of public GitHub material.

Open weights do not guarantee that every model answer is correct. RepoGhost still needs evidence validation, visible uncertainty, and human judgment.

## Stack and architecture

- Node.js 20+ (Node.js 22 LTS recommended)
- Native HTTP server and `fetch`
- Static frontend in `public/`
- GitHub REST API for public repository and account data
- OpenRouter for open-weight model inference
- In-memory response and repository evidence caches
- Request IDs, bounded request sizes, timeouts, and consistent API error envelopes
- Automated checks in GitHub Actions

The JSON intelligence endpoints are:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/intelligence/assess` | Role- and goal-oriented public account assessment |
| `POST /api/intelligence/compare` | Compare two accounts against explicit criteria |
| `POST /api/intelligence/health` | Repository health signals and revival planning |
| `POST /api/intelligence/recommend` | Goal-based repository and contribution recommendations |

These workflows use the public GitHub evidence collector, bounded collection, request IDs, and consistent error handling. Core data-driven results do not rely on the language model to count repositories or invent facts.

## Run locally

### Requirements
- Node.js 20 or later (Node.js 22 LTS recommended)
- A GitHub token is recommended for more reliable GitHub API request limits.
- An OpenRouter API key is required for AI inference.

### Install and run

Clone the repository, enter the project directory, and run:

```bash
git clone https://github.com/egbutaify2-ui/repoghost.git
cd repoghost
```

Configure environment variables in your shell or hosting environment. For local development, you can copy `.env.example` to `.env` if you use a local environment-variable loader; the application itself reads variables from the process environment and does not require a third-party runtime dependency.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | For AI inference | Server-side OpenRouter API key. Keep it out of frontend code and source control. |
| `OPENROUTER_MODEL` | No | Model ID. Defaults to `google/gemma-4-26b-a4b-it:free`. |
| `GITHUB_TOKEN` | Recommended | Authenticated GitHub API requests and a higher request allowance. Keep it server-side. |
| `APP_URL` | No | Application URL used for inference-provider attribution. |
| `PORT` | Usually set by host | HTTP port. Defaults to `3000`. |

Start the application and run the checks:

```bash
npm start
npm test
npm run check
```

By default, the local server listens on port `3000`. Do not commit secrets or expose API keys in client-side JavaScript.

## Tests and live verification

The test suite uses Node's built-in test runner and mocked upstream responses. It covers GitHub username and URL validation, account discovery, public repository evidence retrieval, account Q&A evidence collection and citation validation, model request and error handling, organization repository lists, missing README/release/issue data, GitHub 404 and rate-limit behavior, prompt-injection boundaries, HTTP routes and security headers, assessment, account comparison, repository health planning, recommendations, and the intelligence API endpoints.

Run the full check with:

```bash
npm run check
```

Mocked tests verify application behavior under controlled inputs; they do not, by themselves, prove that external GitHub or OpenRouter services are working. A live smoke test is maintained in GitHub Actions to check the deployed service, authenticated GitHub access, configured model, and real inference output.

## Deployment

The public application is deployed on Render:

**[https://repoghost.onrender.com](https://repoghost.onrender.com)**

The repository includes a Render Blueprint in `render.yaml`. The hosted service runs `npm run check` as its build command and `npm start` to launch the application. Configure `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GITHUB_TOKEN`, and `APP_URL` in the service's environment settings as needed. Secrets must stay on the server.

## Project status

RepoGhost is an early-stage, read-only project. Account Q&A is grounded in the public evidence collected for its supported workflows; it does not provide complete knowledge about a person or guarantee an answer to every possible question. Assessment and comparison are evidence aids, not definitive judgments about skill or hiring suitability. Repository-health findings describe observable signals, not maintainer intent.

The goal is to help people investigate more carefully: summon the public trail, ask better questions, follow the sources, and admit when the evidence goes cold.

## Creator

Built by **Egbuta Ifeanyi Chukwu**.

- [GitHub](https://github.com/egbutaify2-ui)
- [DEV Community](https://dev.to/egbutaify2ui)

## License

MIT. See [LICENSE](./LICENSE).
