'use strict';

const form = document.querySelector('#investigate-form');
const urlInput = document.querySelector('#repository-url');
const submitButton = document.querySelector('#investigate-button');
const formError = document.querySelector('#form-error');
const resultsSection = document.querySelector('#results');
const resultsContent = document.querySelector('#results-content');
const clearResultsButton = document.querySelector('#clear-results');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatDate(value, opts = {}) {
  if (!value) return 'No date recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', ...opts }).format(date);
}

function relativeDate(value) {
  if (!value) return 'No activity date';
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return 'Date unavailable';
  const days = Math.floor((Date.now() - parsed) / 86_400_000);
  if (days < 0) return 'Future date reported';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function sourceById(evidence, ids) {
  if (!Array.isArray(ids)) return [];
  const sourceMap = new Map((evidence.sources || []).map((source) => [source.id, source]));
  return [...new Set(ids)].map((id) => sourceMap.get(id)).filter(Boolean);
}

function renderSources(evidence, ids) {
  const sources = sourceById(evidence, ids);
  if (!sources.length) return '';
  return `<div class="source-list" aria-label="Evidence sources">${sources.map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} <span aria-hidden="true">↗</span></a>`).join('')}</div>`;
}

function renderOverview(evidence) {
  const repo = evidence.repository;
  const activity = relativeDate(repo.pushedAt);
  const status = repo.archived ? '<span class="pill warn">Archived</span>' : '<span class="pill">Public repository</span>';
  const license = repo.license ? escapeHtml(repo.license) : 'Not detected';
  return `<section class="repo-overview" aria-label="Repository overview">
    <div>
      <div class="repo-title-row"><a class="repo-title" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.fullName)} ↗</a>${status}${repo.disabled ? '<span class="pill warn">Disabled</span>' : ''}</div>
      <p class="repo-description">${escapeHtml(repo.description || 'No repository description is published.')}</p>
      <div class="repo-topics">${(repo.topics || []).map((topic) => `<span class="topic">${escapeHtml(topic)}</span>`).join('') || '<span class="topic">No topics listed</span>'}</div>
      ${renderSources(evidence, ['repository'])}
    </div>
    <div class="repo-stats">
      <div class="metric"><small>LANGUAGE</small><strong>${escapeHtml(repo.language || 'Unknown')}</strong></div>
      <div class="metric"><small>STARS</small><strong>${Number(repo.stars || 0).toLocaleString()}</strong></div>
      <div class="metric"><small>LAST PUSH</small><strong>${escapeHtml(activity)}</strong></div>
      <div class="metric"><small>OPEN ISSUES + PRS</small><strong>${Number(repo.openIssuesCount || 0).toLocaleString()}</strong></div>
      <div class="metric"><small>CREATED</small><span>${escapeHtml(formatDate(repo.createdAt))}</span></div>
      <div class="metric"><small>LICENSE</small><span>${license}</span></div>
    </div>
  </section>`;
}

function renderAiUnavailable(status) {
  const message = status?.message || 'The AI analysis could not be completed. No AI findings have been fabricated.';
  const isMissingKey = status?.code === 'AI_NOT_CONFIGURED';
  return `<section class="analysis-unavailable" role="status"><span class="notice-mark" aria-hidden="true">${isMissingKey ? '◇' : '!'}</span><div><strong>${isMissingKey ? 'Evidence loaded · AI not configured' : `Evidence loaded · ${escapeHtml(status?.code || 'AI unavailable')}`}</strong><p>${escapeHtml(message)}${isMissingKey ? ' Configure the key in your server environment; never put it in the browser.' : ''}</p></div></section>`;
}

function renderSignals(evidence, analysis) {
  const signals = analysis.health.signals || [];
  if (!signals.length) return '<div class="empty-state"><strong>No additional signals were returned.</strong>The repository evidence remains available above and below.</div>';
  return `<ul class="signal-list">${signals.map((signal) => `<li><div class="signal-title">${escapeHtml(signal.claim)}</div><div class="signal-meta"><span class="signal-type ${signal.kind === 'observed' ? '' : 'hypothesis'}">${signal.kind === 'observed' ? 'Observed' : 'Inference'}</span><span class="confidence">${escapeHtml(signal.confidence)} confidence</span></div>${renderSources(evidence, signal.sourceIds)}</li>`).join('')}</ul>`;
}

function renderFacts(evidence, analysis) {
  if (!analysis.facts.length) return '<div class="empty-state"><strong>No separate facts were returned.</strong>See the evidence panels for directly verifiable details.</div>';
  return `<ul class="finding-list">${analysis.facts.map((fact) => `<li><div class="signal-title">${escapeHtml(fact.claim)}</div>${renderSources(evidence, fact.sourceIds)}</li>`).join('')}</ul>`;
}

function renderRisks(evidence, analysis) {
  if (!analysis.risks.length) return '<p>No maintenance risks met the evidence threshold for this pass. That is not proof the project has no risks.</p>';
  return `<ul class="finding-list">${analysis.risks.map((risk) => `<li><div class="signal-title">${escapeHtml(risk.claim)}</div><div class="signal-meta"><span class="signal-type hypothesis">Potential risk</span><span class="confidence">${escapeHtml(risk.confidence)} confidence</span></div><p>${escapeHtml(risk.whyInferred)}</p>${renderSources(evidence, risk.sourceIds)}</li>`).join('')}</ul>`;
}

function renderRecommendations(evidence, analysis) {
  return `<ol class="recommendation-list">${analysis.recommendations.map((item, index) => `<li class="recommendation"><span class="recommendation-index">0${index + 1}</span><div><span class="recommendation-priority">${escapeHtml(item.priority)} / NEXT STEP</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.action)}</p><p>${escapeHtml(item.why)}</p>${renderSources(evidence, item.sourceIds)}</div></li>`).join('')}</ol>`;
}

function renderCommitList(evidence) {
  if (!evidence.commits?.length) return '<p>No recent commits were returned by GitHub.</p>';
  return `<div class="commit-list">${evidence.commits.map((commit) => `<a class="commit-row" href="${escapeHtml(commit.url || evidence.repository.url)}" target="_blank" rel="noopener noreferrer"><span class="commit-message">${escapeHtml(commit.message)}</span><span class="commit-meta"><span>${escapeHtml(commit.sha)}</span><span>${escapeHtml(relativeDate(commit.date))}</span><span>${escapeHtml(commit.author)}</span></span></a>`).join('')}</div>`;
}

function renderIssueList(evidence) {
  if (!evidence.issues?.length) return '<p>No open issues were returned. This may mean none are open, or there is nothing visible through the public API.</p>';
  return `<div class="issue-list">${evidence.issues.map((issue) => `<a class="issue-row" href="${escapeHtml(issue.url || evidence.repository.url)}" target="_blank" rel="noopener noreferrer"><span class="issue-title">#${Number(issue.number)} · ${escapeHtml(issue.title)}</span><span class="issue-meta"><span>${escapeHtml(relativeDate(issue.updatedAt))}</span><span>${Number(issue.comments)} comments</span></span></a>`).join('')}</div>`;
}

function renderReadme(evidence) {
  if (!evidence.readme) return '<div class="empty-state"><strong>No README found through the public API.</strong>Missing documentation is a data point, not a diagnosis.</div>';
  const clipped = evidence.readme.content || '';
  const excerpt = clipped.split('\n').slice(0, 28).join('\n');
  return `<p>Source: ${escapeHtml(evidence.readme.path)}${evidence.readme.truncated ? ' · excerpt truncated' : ''}</p><pre class="readme-excerpt">${escapeHtml(excerpt || 'The README is present but empty.')}</pre>${renderSources(evidence, ['readme'])}`;
}

function renderRelease(evidence) {
  if (!evidence.release) return '<div class="empty-state"><strong>No latest release found.</strong>Not every project uses GitHub Releases. Tags and package registries may hold additional history.</div>';
  const release = evidence.release;
  return `<h3>${escapeHtml(release.name)}</h3><p>${escapeHtml(release.tag || 'No tag name returned')} · Published ${escapeHtml(formatDate(release.publishedAt))}</p>${release.draft ? '<span class="pill warn">Draft release</span>' : ''}${release.prerelease ? '<span class="pill warn">Pre-release</span>' : ''}${renderSources(evidence, ['release'])}`;
}

function renderAnalysis(evidence, analysis) {
  const score = Math.max(0, Math.min(100, Math.round(analysis.health.score)));
  return `<div class="evidence-layout">
    <div class="stack">
      <section class="result-card"><div class="card-kicker">AI / PROJECT SUMMARY</div><h3>What this project does</h3><p>${escapeHtml(analysis.projectSummary)}</p>${renderSources(evidence, analysis.facts.flatMap((fact) => fact.sourceIds).slice(0, 3))}</section>
      <section class="result-card"><div class="card-kicker">AI / HEALTH ASSESSMENT</div><div class="health-head"><div class="score-ring" role="img" aria-label="Health score ${score} out of 100"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="score-track" cx="32" cy="32" r="27"></circle><circle class="score-progress" cx="32" cy="32" r="27" stroke-dasharray="${Math.round((score / 100) * 169.65)} 169.65" transform="rotate(-90 32 32)"></circle></svg><strong>${score}</strong></div><div><h3 class="health-title">${escapeHtml(analysis.health.label)}</h3><p class="health-subtitle">AI assessment · 0–100 signal score, not a guarantee</p></div></div><p>${escapeHtml(analysis.health.rationale)}</p>${renderSignals(evidence, analysis)}</section>
      <section class="result-card"><div class="card-kicker">EVIDENCE / VERIFIED FACTS</div><h3>What the record shows</h3>${renderFacts(evidence, analysis)}</section>
      <section class="result-card"><div class="card-kicker">INFERENCE / MAINTENANCE RISKS</div><h3>What may need attention</h3>${renderRisks(evidence, analysis)}</section>
    </div>
    <div class="stack">
      <section class="result-card"><div class="card-kicker">ACTION / REVIVAL PLAN</div><h3>Three prioritized next steps</h3>${renderRecommendations(evidence, analysis)}</section>
      <section class="result-card"><div class="card-kicker">GITHUB / COMMIT TRAIL</div><h3>Recent commits <span class="pill neutral">${evidence.commits.length} sampled</span></h3>${renderCommitList(evidence)}</section>
      <section class="result-card"><div class="card-kicker">GITHUB / ISSUE BACKLOG</div><h3>Open issues <span class="pill neutral">${evidence.issues.length} sampled</span></h3>${renderIssueList(evidence)}</section>
      <section class="result-card"><div class="card-kicker">GITHUB / DOCUMENTATION</div><h3>README trace</h3>${renderReadme(evidence)}</section>
      <section class="result-card"><div class="card-kicker">GITHUB / RELEASE HISTORY</div><h3>Latest release</h3>${renderRelease(evidence)}</section>
      ${analysis.uncertainty?.length ? `<section class="result-card"><div class="card-kicker">LIMITS / UNCERTAINTY</div><h3>What we cannot conclude</h3><ul class="finding-list">${analysis.uncertainty.map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join('')}</ul></section>` : ''}
    </div>
  </div>`;
}

function renderEvidenceOnly(evidence) {
  return `<div class="evidence-layout">
    <div class="stack">
      <section class="result-card"><div class="card-kicker">GITHUB / COMMIT TRAIL</div><h3>Recent commits</h3>${renderCommitList(evidence)}</section>
      <section class="result-card"><div class="card-kicker">GITHUB / ISSUE BACKLOG</div><h3>Open issues</h3>${renderIssueList(evidence)}</section>
    </div>
    <div class="stack">
      <section class="result-card"><div class="card-kicker">GITHUB / DOCUMENTATION</div><h3>README trace</h3>${renderReadme(evidence)}</section>
      <section class="result-card"><div class="card-kicker">GITHUB / RELEASE HISTORY</div><h3>Latest release</h3>${renderRelease(evidence)}</section>
      <section class="result-card"><div class="card-kicker">NEXT / CONFIGURE INFERENCE</div><h3>Enable open-weight analysis</h3><p>Add an OpenRouter API key to the server environment. RepoGhost uses <code>google/gemma-4-26b-a4b-it:free</code> by default and does not silently switch to a closed model.</p><p>The repository evidence above is live; an AI assessment has not been generated for this case.</p></section>
    </div>
  </div>`;
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError() {
  formError.textContent = '';
  formError.hidden = true;
}

function showLoading() {
  resultsSection.hidden = false;
  resultsSection.setAttribute('aria-busy', 'true');
  resultsContent.innerHTML = `<div class="loading-card"><span class="spinner" aria-hidden="true"></span><div><strong>Following the commit trail…</strong><p>Reading public evidence, checking issue and release records, then asking the open-weight model to assess what the sources support.</p></div></div>`;
}

async function investigate(repositoryUrl) {
  clearFormError();
  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Investigating…';
  urlInput.setAttribute('aria-invalid', 'false');
  showLoading();
  resultsSection.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  try {
    const response = await fetch('/api/investigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ repositoryUrl }),
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('The server returned a response RepoGhost could not read. Please try again.'); }
    if (!response.ok) {
      const error = payload.error || {};
      throw new Error(error.message || `The investigation failed (HTTP ${response.status}).`);
    }
    if (!payload.evidence || !payload.evidence.repository) throw new Error('The server did not return repository evidence. Please try again.');
    const aiNotice = payload.analysis ? '' : renderAiUnavailable(payload.analysisStatus);
    resultsContent.innerHTML = `${renderOverview(payload.evidence)}${aiNotice}${payload.analysis ? renderAnalysis(payload.evidence, payload.analysis) : renderEvidenceOnly(payload.evidence)}<p class="uncertainty-note">RepoGhost reports public signals. A quiet commit history does not prove abandonment, and inferred risks are not verified maintainer intent. Verify the linked sources before taking action.</p>`;
  } catch (error) {
    resultsContent.innerHTML = `<div class="error-card"><strong>Investigation interrupted</strong><p>${escapeHtml(error.message || 'Something went wrong. Please try again.')}</p></div>`;
  } finally {
    resultsSection.setAttribute('aria-busy', 'false');
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Investigate repository';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearFormError();
  const value = urlInput.value.trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com' || parsed.pathname.split('/').filter(Boolean).length !== 2) {
      throw new Error('Use a public GitHub URL with exactly an owner and repository, for example https://github.com/owner/repository.');
    }
  } catch (error) {
    urlInput.setAttribute('aria-invalid', 'true');
    showFormError(error instanceof TypeError ? 'Enter a complete URL, such as https://github.com/owner/repository.' : error.message);
    urlInput.focus();
    return;
  }
  investigate(value);
});

document.querySelectorAll('[data-repo]').forEach((button) => {
  button.addEventListener('click', () => {
    urlInput.value = button.getAttribute('data-repo') || '';
    clearFormError();
    investigate(urlInput.value);
  });
});

clearResultsButton.addEventListener('click', () => {
  resultsContent.innerHTML = '';
  resultsSection.hidden = true;
  resultsSection.setAttribute('aria-busy', 'false');
  urlInput.focus();
});
