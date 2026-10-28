'use strict';

const form = document.querySelector('#investigate-form');
const usernameInput = document.querySelector('#github-username');
const submitButton = document.querySelector('#investigate-button');
const formError = document.querySelector('#form-error');
const resultsSection = document.querySelector('#results');
const resultsContent = document.querySelector('#results-content');
const clearResultsButton = document.querySelector('#clear-results');
let lastDiscovery = null;

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
  return `<section class="repo-overview" aria-label="Repository case file">
    <div>
      <div class="repo-title-row"><a class="repo-title" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.fullName)} ↗</a>${status}${repo.disabled ? '<span class="pill warn">Disabled</span>' : ''}</div>
      <p class="repo-description">${escapeHtml(repo.description || 'No description survives in the public record.')}</p>
      <div class="repo-topics">${(repo.topics || []).map((topic) => `<span class="topic">${escapeHtml(topic)}</span>`).join('') || '<span class="topic">No tags left behind</span>'}</div>
      ${renderSources(evidence, ['repository'])}
    </div>
    <div class="repo-stats">
      <div class="metric"><small>LANGUAGE</small><strong>${escapeHtml(repo.language || 'Unknown')}</strong></div>
      <div class="metric"><small>STARS</small><strong>${Number(repo.stars || 0).toLocaleString()}</strong></div>
      <div class="metric"><small>LAST ECHO</small><strong>${escapeHtml(activity)}</strong></div>
      <div class="metric"><small>OPEN WOUNDS / ISSUES + PRS</small><strong>${Number(repo.openIssuesCount || 0).toLocaleString()}</strong></div>
      <div class="metric"><small>CREATED</small><span>${escapeHtml(formatDate(repo.createdAt))}</span></div>
      <div class="metric"><small>LICENSE</small><span>${license}</span></div>
    </div>
  </section>`;
}

function renderAiUnavailable(status) {
  const message = status?.message || 'The AI analysis could not be completed. No AI findings have been fabricated.';
  const isMissingKey = status?.code === 'AI_NOT_CONFIGURED';
  return `<section class="analysis-unavailable" role="status"><span class="notice-mark" aria-hidden="true">${isMissingKey ? '◇' : '!'}</span><div><strong>${isMissingKey ? 'The trail is here · the machine is silent' : `The trail is here · ${escapeHtml(status?.code || 'AI unavailable')}`}</strong><p>${escapeHtml(message)}${isMissingKey ? ' Configure the key in your server environment; never put it in the browser.' : ''}</p></div></section>`;
}

function renderSignals(evidence, analysis) {
  const signals = analysis.health.signals || [];
  if (!signals.length) return '<div class="empty-state"><strong>No further omens surfaced.</strong>The collected repository evidence remains above and below.</div>';
  return `<ul class="signal-list">${signals.map((signal) => `<li><div class="signal-title">${escapeHtml(signal.claim)}</div><div class="signal-meta"><span class="signal-type ${signal.kind === 'observed' ? '' : 'hypothesis'}">${signal.kind === 'observed' ? 'Observed' : 'Inference'}</span><span class="confidence">${escapeHtml(signal.confidence)} confidence</span></div>${renderSources(evidence, signal.sourceIds)}</li>`).join('')}</ul>`;
}

function renderFacts(evidence, analysis) {
  if (!analysis.facts.length) return '<div class="empty-state"><strong>No separate facts surfaced from this pass.</strong>Search the evidence panels for details the record can verify.</div>';
  return `<ul class="finding-list">${analysis.facts.map((fact) => `<li><div class="signal-title">${escapeHtml(fact.claim)}</div>${renderSources(evidence, fact.sourceIds)}</li>`).join('')}</ul>`;
}

function renderRisks(evidence, analysis) {
  if (!analysis.risks.length) return '<p>No potential danger crossed the evidence threshold this time. That does not prove the project is free of risk.</p>';
  return `<ul class="finding-list">${analysis.risks.map((risk) => `<li><div class="signal-title">${escapeHtml(risk.claim)}</div><div class="signal-meta"><span class="signal-type hypothesis">Potential risk</span><span class="confidence">${escapeHtml(risk.confidence)} confidence</span></div><p>${escapeHtml(risk.whyInferred)}</p>${renderSources(evidence, risk.sourceIds)}</li>`).join('')}</ul>`;
}

function renderRecommendations(evidence, analysis) {
  return `<ol class="recommendation-list">${analysis.recommendations.map((item, index) => `<li class="recommendation"><span class="recommendation-index">0${index + 1}</span><div><span class="recommendation-priority">${escapeHtml(item.priority)} / NEXT MOVE</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.action)}</p><p>${escapeHtml(item.why)}</p>${renderSources(evidence, item.sourceIds)}</div></li>`).join('')}</ol>`;
}

function renderCommitList(evidence) {
  if (!evidence.commits?.length) return '<p>No recent commit echoes were returned by GitHub.</p>';
  return `<div class="commit-list">${evidence.commits.map((commit) => `<a class="commit-row" href="${escapeHtml(commit.url || evidence.repository.url)}" target="_blank" rel="noopener noreferrer"><span class="commit-message">${escapeHtml(commit.message)}</span><span class="commit-meta"><span>${escapeHtml(commit.sha)}</span><span>${escapeHtml(relativeDate(commit.date))}</span><span>${escapeHtml(commit.author)}</span></span></a>`).join('')}</div>`;
}

function renderIssueList(evidence) {
  if (!evidence.issues?.length) return '<p>No open wounds appeared in this sample. There may be no open issues, or the public API may not show them.</p>';
  return `<div class="issue-list">${evidence.issues.map((issue) => `<a class="issue-row" href="${escapeHtml(issue.url || evidence.repository.url)}" target="_blank" rel="noopener noreferrer"><span class="issue-title">#${Number(issue.number)} · ${escapeHtml(issue.title)}</span><span class="issue-meta"><span>${escapeHtml(relativeDate(issue.updatedAt))}</span><span>${Number(issue.comments)} comments</span></span></a>`).join('')}</div>`;
}

function renderReadme(evidence) {
  if (!evidence.readme) return '<div class="empty-state"><strong>No README trace was found through the public API.</strong>The missing page is a clue, not a diagnosis.</div>';
  const clipped = evidence.readme.content || '';
  const excerpt = clipped.split('\n').slice(0, 28).join('\n');
  return `<p>Source: ${escapeHtml(evidence.readme.path)}${evidence.readme.truncated ? ' · excerpt truncated' : ''}</p><pre class="readme-excerpt">${escapeHtml(excerpt || 'The README is present but empty.')}</pre>${renderSources(evidence, ['readme'])}`;
}

function renderRelease(evidence) {
  if (!evidence.release) return '<div class="empty-state"><strong>No latest release signal was found.</strong>Not every project leaves releases here. Tags or package registries may hold another part of the story.</div>';
  const release = evidence.release;
  return `<h3>${escapeHtml(release.name)}</h3><p>${escapeHtml(release.tag || 'No tag name returned')} · Published ${escapeHtml(formatDate(release.publishedAt))}</p>${release.draft ? '<span class="pill warn">Draft release</span>' : ''}${release.prerelease ? '<span class="pill warn">Pre-release</span>' : ''}${renderSources(evidence, ['release'])}`;
}

function renderDiscoveredRepository(repository) {
  const flags = [
    repository.archived ? '<span class="pill warn">Archived</span>' : '',
    repository.fork ? '<span class="pill neutral">Fork</span>' : '',
  ].filter(Boolean).join('');
  return `<article class="discovered-repo">
    <div class="discovered-repo-main">
      <div class="discovered-repo-heading"><a class="discovered-repo-title" href="${escapeHtml(repository.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repository.fullName)} <span aria-hidden="true">↗</span></a>${flags}</div>
      <p class="discovered-repo-description">${escapeHtml(repository.description || 'No description left in the public record.')}</p>
      <div class="discovered-repo-meta"><span>${escapeHtml(repository.language || 'Unknown language')}</span><span><span aria-hidden="true">★</span> ${Number(repository.stars || 0).toLocaleString()} stars</span><span>Last echo ${escapeHtml(relativeDate(repository.pushedAt))}</span></div>
    </div>
    <button type="button" class="repo-investigate-button" data-investigate-url="${escapeHtml(repository.url)}" aria-expanded="false">Open case file <span aria-hidden="true">↗</span></button>
  </article>`;
}

function renderAccountChatPanel(accountLogin) {
  return `<section class="account-chat" aria-label="Interrogate the public trail of this GitHub account">
    <div class="account-chat-heading">
      <span class="card-kicker">GHOST INTERROGATION / FOLLOW-UP</span>
      <h3>Question the ghost of @${escapeHtml(accountLogin)}</h3>
      <p>Welcome to the interrogation room. One username, a trail of public projects, and questions the record may or may not answer. Ask about the repositories, technologies, and activity this account has left in public. RepoGhost follows the trail, but cannot see private lives or invent what it cannot verify. For deeper investigations, compare two shadows, inspect a silent repository, or follow an issue toward your next contribution.</p>
    </div>
    <div id="account-chat-messages" class="account-chat-messages" aria-live="polite">
      <div class="account-chat-empty"><strong>The ghost is listening.</strong><p>Ask what the record remembers: “Which project best matches a React Native role?” or “What public evidence supports this developer’s recent work?”</p></div>
    </div>
    <form id="account-chat-form" class="account-chat-form">
      <label class="sr-only" for="account-chat-question">Question about this GitHub account</label>
      <textarea id="account-chat-question" name="question" rows="2" maxlength="500" placeholder="Ask the ghost what the public record remembers…" required></textarea>
      <button id="account-chat-submit" type="submit"><span>Interrogate the ghost</span><span aria-hidden="true">↗</span></button>
    </form>
    <p class="account-chat-note">THE BOUNDARY: public evidence only. This ghost cannot see private activity, read personal intentions, or prove skill from repository ownership alone.</p>
  </section>`;
}

function attachAccountChat(account) {
  const chatForm = resultsContent.querySelector('#account-chat-form');
  const chatInput = resultsContent.querySelector('#account-chat-question');
  const chatSubmit = resultsContent.querySelector('#account-chat-submit');
  const chatMessages = resultsContent.querySelector('#account-chat-messages');
  const chatHistory = [];

  function appendChatMessage(role, content, citations = [], uncertainty = []) {
    const article = document.createElement('article');
    article.className = 'account-chat-message ' + role;
    if (role === 'user') {
      article.innerHTML = '<div class="account-chat-role">YOU</div><p class="account-chat-text">' +
        escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
    } else {
      const citationMarkup = citations.length
        ? '<div class="account-chat-citations"><span class="account-chat-role">SOURCES</span>' +
          citations.map((source) => '<a class="account-chat-citation" href="' + escapeHtml(source.url) +
            '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.title || source.id) + ' ↗</a>').join('') +
          '</div>'
        : '';
      const uncertaintyMarkup = uncertainty.length
        ? '<div class="account-chat-uncertainty"><strong>Limits to this answer</strong><ul>' +
          uncertainty.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>'
        : '';
      article.innerHTML = '<div class="account-chat-role">THE GHOST</div><p class="account-chat-text">' +
        escapeHtml(content).replace(/\n/g, '<br>') + '</p>' + citationMarkup + uncertaintyMarkup;
    }
    if (chatMessages.querySelector('.account-chat-empty')) chatMessages.innerHTML = '';
    chatMessages.appendChild(article);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return article;
  }

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = chatInput.value.trim();
    if (!question) {
      chatInput.focus();
      return;
    }
    appendChatMessage('user', question);
    const pending = appendChatMessage('assistant', 'The ghost is searching the public record…');
    pending.classList.add('pending');
    chatInput.value = '';
    chatInput.disabled = true;
    chatSubmit.disabled = true;
    chatSubmit.querySelector('span:first-child').textContent = 'Listening…';

    try {
      const response = await fetch('/api/account/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          username: account.login,
          question,
          history: chatHistory.slice(-6),
        }),
      });
      let payload;
      try { payload = await response.json(); }
      catch { throw new Error('The server returned a response RepoGhost could not read. Please try again.'); }
      if (!response.ok) {
        const error = payload.error || {};
        throw new Error(error.message || 'The account question failed (HTTP ' + response.status + ').');
      }
      pending.classList.remove('pending');
      if (payload.answer) {
        const replyLabel = payload.status?.code === 'CONVERSATION' ? 'THE GHOST / WHISPER' : 'THE GHOST / ANSWER FROM THE RECORD';
        pending.innerHTML = '<div class="account-chat-role">' + replyLabel + '</div><p class="account-chat-text">' +
          escapeHtml(payload.answer).replace(/\n/g, '<br>') + '</p>' +
          ((payload.citations || []).length
            ? '<div class="account-chat-citations"><span class="account-chat-role">SOURCES</span>' +
              payload.citations.map((source) => '<a class="account-chat-citation" href="' + escapeHtml(source.url) +
                '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.title || source.id) + ' ↗</a>').join('') +
              '</div>' : '') +
          ((payload.uncertainty || []).length
            ? '<div class="account-chat-uncertainty"><strong>Limits to this answer</strong><ul>' +
              payload.uncertainty.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>'
            : '');
        chatHistory.push({ role: 'user', content: question });
        chatHistory.push({ role: 'assistant', content: payload.answer });
      } else {
        const status = payload.status || {};
        pending.innerHTML = '<div class="account-chat-role">NO ANSWER FROM THE DARK</div><p class="account-chat-text">' +
          escapeHtml(status.message || 'RepoGhost could not produce a verified answer.') +
          '</p><p class="account-chat-note">No answer has been invented to fill the silence. You can try again when the inference provider returns.</p>';
        pending.classList.add('unavailable');
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
      pending.classList.remove('pending');
      pending.classList.add('unavailable');
      pending.innerHTML = '<div class="account-chat-role">THE SIGNAL BROKE</div><p class="account-chat-text">' +
        escapeHtml(error.message || 'Something went wrong. Please try again.') + '</p>';
    } finally {
      chatInput.disabled = false;
      chatSubmit.disabled = false;
      chatSubmit.querySelector('span:first-child').textContent = 'Interrogate the ghost';
      chatInput.focus();
    }
  });
}

function showRepositoryDiscovery(discovery) {
  lastDiscovery = discovery;
  const account = discovery.account || {};
  const accountTitle = account.name ? `${account.name} · @${account.login}` : `@${account.login}`;
  resultsContent.innerHTML = `<section class="repository-discovery" aria-label="Discovered public tracesitories">
    <div class="discovery-account">
      <div class="discovery-account-mark" aria-hidden="true">${account.type === 'Organization' ? 'ORG' : 'GH'}</div>
      <div class="discovery-account-copy"><span class="card-kicker">SIGNAL DETECTED / ACCOUNT LOCATED</span><h3><a href="${escapeHtml(account.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(accountTitle)} ↗</a></h3><p>${escapeHtml(account.bio || (account.type === 'Organization' ? 'Public organization repositories' : 'Public repositories owned by this account'))}</p></div>
      <div class="discovery-account-stats"><strong>${Number(account.publicRepos || discovery.returnedCount || 0).toLocaleString()}</strong><span>public repos</span></div>
    </div>
    <div class="repository-picker-toolbar">
      <label class="repository-search-wrap"><span class="sr-only">Filter repositories</span><span aria-hidden="true">⌕</span><input id="repository-search" type="search" placeholder="Search the archive by name, description, or language…" autocomplete="off"></label>
      <label class="repository-sort-wrap"><span>Order the traces</span><select id="repository-sort" aria-label="Order public repositories"><option value="pushed">Freshest echoes</option><option value="stars">Most stars</option><option value="name">Name A–Z</option></select></label>
    </div>
    <p class="repository-result-count" id="repository-result-count"></p>
    <div class="repository-list" id="repository-picker-list"></div>
    ${discovery.limitReached ? '<p class="discovery-limit-note">The public trail returned more than 100 repositories. This case file shows the first 100 by recent activity; narrow the archive search to find a specific project.</p>' : ''}
    ${renderAccountChatPanel(account.login)}
  </section>`;

  const searchInput = resultsContent.querySelector('#repository-search');
  const sortSelect = resultsContent.querySelector('#repository-sort');
  const resultCount = resultsContent.querySelector('#repository-result-count');
  const repositoryList = resultsContent.querySelector('#repository-picker-list');

  function updateRepositoryList() {
    const query = searchInput.value.trim().toLowerCase();
    const sort = sortSelect.value;
    const visible = (discovery.repositories || []).filter((repository) => {
      const searchable = [repository.fullName, repository.description, repository.language].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(query);
    });
    visible.sort((left, right) => {
      if (sort === 'stars') return Number(right.stars || 0) - Number(left.stars || 0);
      if (sort === 'name') return String(left.fullName).localeCompare(String(right.fullName));
      return (Date.parse(right.pushedAt || '') || 0) - (Date.parse(left.pushedAt || '') || 0);
    });
    resultCount.textContent = `${visible.length.toLocaleString()} of ${(discovery.repositories || []).length.toLocaleString()} traces in the record`;
    repositoryList.innerHTML = visible.length
      ? visible.map(renderDiscoveredRepository).join('')
      : '<div class="empty-state"><strong>No matching traces found.</strong>Try another name, description, or language.</div>';
  }

  searchInput.addEventListener('input', updateRepositoryList);
  sortSelect.addEventListener('change', updateRepositoryList);
  repositoryList.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-investigate-url]') : null;
    if (!button || button.disabled) return;
    const repositoryUrl = button.getAttribute('data-investigate-url');
    if (repositoryUrl) inspectRepositoryInline(repositoryUrl, button);
  });
  updateRepositoryList();

  const assessUser = document.querySelector('#intel-assess-form [name="username"]');
  const compareUser = document.querySelector('#intel-compare-form [name="usernameA"]');
  const recommendUser = document.querySelector('#intel-recommend-form [name="username"]');
  if (assessUser && !assessUser.value) assessUser.value = account.login || '';
  if (compareUser && !compareUser.value) compareUser.value = account.login || '';
  if (recommendUser && !recommendUser.value) recommendUser.value = account.login || '';
  attachAccountChat(account);
}

function renderAnalysis(evidence, analysis) {
  const score = Math.max(0, Math.min(100, Math.round(analysis.health.score)));
  return `<div class="evidence-layout">
    <div class="stack">
      <section class="result-card"><div class="card-kicker">PROJECT REMNANTS / SUMMARY</div><h3>What this project was built to do</h3><p>${escapeHtml(analysis.projectSummary)}</p>${renderSources(evidence, analysis.facts.flatMap((fact) => fact.sourceIds).slice(0, 3))}</section>
      <section class="result-card"><div class="card-kicker">PROJECT PULSE / AI ASSESSMENT</div><div class="health-head"><div class="score-ring" role="img" aria-label="Health score ${score} out of 100"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="score-track" cx="32" cy="32" r="27"></circle><circle class="score-progress" cx="32" cy="32" r="27" stroke-dasharray="${Math.round((score / 100) * 169.65)} 169.65" transform="rotate(-90 32 32)"></circle></svg><strong>${score}</strong></div><div><h3 class="health-title">${escapeHtml(analysis.health.label)}</h3><p class="health-subtitle">Machine reading · 0–100 signal score, never a prophecy</p></div></div><p>${escapeHtml(analysis.health.rationale)}</p>${renderSignals(evidence, analysis)}</section>
      <section class="result-card"><div class="card-kicker">FACTS FROM THE RECORD</div><h3>What the traces can prove</h3>${renderFacts(evidence, analysis)}</section>
      <section class="result-card"><div class="card-kicker">WARNING SIGNS / HYPOTHESES</div><h3>What may be decaying</h3>${renderRisks(evidence, analysis)}</section>
    </div>
    <div class="stack">
      <section class="result-card"><div class="card-kicker">RESURRECTION PLAN / ACTIONS</div><h3>Three steps to bring the project forward</h3>${renderRecommendations(evidence, analysis)}</section>
      <section class="result-card"><div class="card-kicker">COMMIT ECHOES / GITHUB</div><h3>Recent commits <span class="pill neutral">${evidence.commits.length} sampled</span></h3>${renderCommitList(evidence)}</section>
      <section class="result-card"><div class="card-kicker">OPEN WOUNDS / ISSUE BACKLOG</div><h3>Open issues <span class="pill neutral">${evidence.issues.length} sampled</span></h3>${renderIssueList(evidence)}</section>
      <section class="result-card"><div class="card-kicker">THE README / THE PROJECT'S OWN WORDS</div><h3>README trace</h3>${renderReadme(evidence)}</section>
      <section class="result-card"><div class="card-kicker">LAST TRANSMISSION / RELEASE HISTORY</div><h3>Latest release</h3>${renderRelease(evidence)}</section>
      ${analysis.uncertainty?.length ? `<section class="result-card"><div class="card-kicker">WHAT THE GHOST CANNOT KNOW</div><h3>Where the evidence ends</h3><ul class="finding-list">${analysis.uncertainty.map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join('')}</ul></section>` : ''}
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

function showDiscoveryLoading() {
  resultsSection.hidden = false;
  resultsSection.setAttribute('aria-busy', 'true');
  resultsContent.innerHTML = `<div class="loading-card"><span class="spinner" aria-hidden="true"></span><div><strong>Listening for a signal…</strong><p>RepoGhost is tracing the account’s public history. Repositories, commits, and project details will surface when GitHub returns them. Nothing private is being summoned.</p></div></div>`;
}

async function discoverAccount(username) {
  clearFormError();
  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Summoning…';
  usernameInput.setAttribute('aria-invalid', 'false');
  showDiscoveryLoading();
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const response = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username }),
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('The server returned a response RepoGhost could not read. Please try again.'); }
    if (!response.ok) {
      const error = payload.error || {};
      throw new Error(error.message || `Repository discovery failed (HTTP ${response.status}).`);
    }
    if (!payload.discovery || !payload.discovery.account || !Array.isArray(payload.discovery.repositories)) {
      throw new Error('The server did not return a repository list. Please try again.');
    }
    showRepositoryDiscovery(payload.discovery);
  } catch (error) {
    resultsContent.innerHTML = `<div class="error-card"><strong>The trail broke before the account surfaced</strong><p>${escapeHtml(error.message || 'Something went wrong. Please try again.')}</p></div>`;
  } finally {
    resultsSection.setAttribute('aria-busy', 'false');
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Summon the ghost';
  }
}

async function loadRepositoryAnalysis(repositoryUrl, evidence, analysisSlot) {
  if (!analysisSlot || !analysisSlot.isConnected) return;
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ repositoryUrl }),
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('The AI service returned a response RepoGhost could not read.'); }
    if (!response.ok) {
      const error = payload.error || {};
      throw new Error(error.message || 'AI analysis failed (HTTP ' + response.status + ').');
    }
    if (!analysisSlot.isConnected) return;
    analysisSlot.innerHTML = payload.analysis
      ? renderAnalysis(evidence, payload.analysis)
      : renderAiUnavailable(payload.analysisStatus);
  } catch (error) {
    if (analysisSlot.isConnected) {
      analysisSlot.innerHTML = renderAiUnavailable({
        code: 'AI_UNAVAILABLE',
        message: error.message || 'AI analysis could not be completed. The public evidence remains available above.',
      });
    }
  }
}

async function inspectRepositoryInline(repositoryUrl, button) {
  const repositoryCard = button.closest('.discovered-repo');
  if (!repositoryCard || !repositoryUrl) return;
  const existing = repositoryCard.querySelector('.discovered-repo-detail');
  if (existing) {
    existing.hidden = !existing.hidden;
    const expanded = !existing.hidden;
    button.setAttribute('aria-expanded', String(expanded));
    button.innerHTML = expanded
      ? 'Close case file <span aria-hidden="true">−</span>'
      : 'Open case file <span aria-hidden="true">↗</span>';
    if (expanded) existing.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const detail = document.createElement('section');
  detail.className = 'discovered-repo-detail';
  detail.setAttribute('aria-label', 'Repository evidence');
  detail.setAttribute('aria-live', 'polite');
  detail.innerHTML = '<div class="loading-card"><span class="spinner" aria-hidden="true"></span><div><strong>Lifting the veil on this repository…</strong><p>First come the public records: metadata, README, sampled commits, issues, and releases when available. AI interpretation follows separately.</p></div></div>';
  repositoryCard.append(detail);
  button.disabled = true;
  button.setAttribute('aria-expanded', 'true');
  button.innerHTML = 'Opening the veil… <span aria-hidden="true">◌</span>';

  try {
    const response = await fetch('/api/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ repositoryUrl }),
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('The server returned a response RepoGhost could not read. Please try again.'); }
    if (!response.ok) {
      const error = payload.error || {};
      throw new Error(error.message || 'Repository evidence could not be loaded (HTTP ' + response.status + ').');
    }
    if (!payload.evidence || !payload.evidence.repository) {
      throw new Error('The server did not return repository evidence. Please try again.');
    }
    detail.innerHTML = renderOverview(payload.evidence) +
      '<div class="analysis-slot"><div class="loading-card" role="status"><span class="spinner" aria-hidden="true"></span><div><strong>A voice is stirring behind the veil…</strong><p>The public evidence is already here. The model is interpreting it separately; if it falls silent, the evidence will remain.</p></div></div></div>' +
      renderEvidenceOnly(payload.evidence) +
      '<p class="uncertainty-note">These are echoes from a public repository, not a verdict about the people behind it. Follow the linked sources before believing the story or acting on it.</p>';
    detail.dataset.loaded = 'true';
    const analysisSlot = detail.querySelector('.analysis-slot');
    void loadRepositoryAnalysis(repositoryUrl, payload.evidence, analysisSlot);
  } catch (error) {
    detail.innerHTML = '<div class="error-card"><strong>The repository trail fractured</strong><p>' +
      escapeHtml(error.message || 'Something went wrong. Please try again.') + '</p></div>';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Close case file <span aria-hidden="true">−</span>';
    button.setAttribute('aria-expanded', 'true');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearFormError();
  const value = usernameInput.value.trim();
  if (!value) {
    usernameInput.setAttribute('aria-invalid', 'true');
    showFormError('Enter a GitHub username or organization, such as octocat or expressjs.');
    usernameInput.focus();
    return;
  }
  discoverAccount(value);
});

document.querySelectorAll('[data-username]').forEach((button) => {
  button.addEventListener('click', () => {
    usernameInput.value = button.getAttribute('data-username') || '';
    clearFormError();
    discoverAccount(usernameInput.value);
  });
});

clearResultsButton.addEventListener('click', () => {
  resultsContent.innerHTML = '';
  lastDiscovery = null;
  resultsSection.hidden = true;
  resultsSection.setAttribute('aria-busy', 'false');
  usernameInput.focus();
});


/* Evidence-backed developer intelligence suite */
function intelSafeUrl(value) {
  return typeof value === 'string' && /^https:\/\/github\.com\//i.test(value) ? value : '';
}

function renderIntelSourceLinks(sources, ids) {
  const selected = new Set(Array.isArray(ids) ? ids : []);
  const available = Array.isArray(sources) ? sources : [];
  const links = available.filter((source) => selected.has(source.id) && intelSafeUrl(source.url));
  const unique = [...new Map(links.map((source) => [source.id, source])).values()];
  if (!unique.length) return '';
  return '<div class="intel-source-links"><span class="intel-source-label">EVIDENCE</span>' +
    unique.slice(0, 6).map((source) => '<a href="' + escapeHtml(intelSafeUrl(source.url)) +
      '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.title || source.id) + ' ↗</a>').join('') + '</div>';
}

function renderIntelEmpty(message) {
  return '<div class="intel-empty">' + escapeHtml(message) + '</div>';
}

function renderIntelLoading(message) {
  return '<div class="loading-card" role="status"><span class="spinner" aria-hidden="true"></span><div><strong>' +
    escapeHtml(message) + '</strong><p>Following a bounded trail of public GitHub evidence. The ghost will not alter the source repositories.</p></div></div>';
}

function renderIntelError(message) {
  return '<div class="error-card" role="alert"><strong>The trail has been interrupted</strong><p>' + escapeHtml(message) + '</p></div>';
}

function renderIntelProject(project, assessment) {
  return '<article class="intel-project"><div class="intel-project-head"><div><a href="' +
    escapeHtml(intelSafeUrl(project.url)) + '" target="_blank" rel="noopener noreferrer">' +
    escapeHtml(project.fullName) + ' ↗</a><p>' + escapeHtml(project.description || 'No public description supplied.') +
    '</p></div><span class="pill ' + (project.archived ? 'warn' : 'neutral') + '">' +
    (project.archived ? 'Archived' : escapeHtml(project.language || 'Language unknown')) + '</span></div>' +
    '<div class="intel-term-list">' + (project.matchedTerms || []).slice(0, 8).map((term) => '<span>' + escapeHtml(term) + '</span>').join('') + '</div>' +
    '<p class="intel-evidence-note">' + escapeHtml((project.reasons || []).join(' ')) + '</p>' +
    (project.license ? '<p class="intel-evidence-note">Reported license: ' + escapeHtml(project.license) + ' (review the terms before reuse).</p>' : '<p class="intel-evidence-note">No license was reported in this snapshot; review the repository before reuse.</p>') +
    renderIntelSourceLinks(assessment.sources, project.sourceIds) +
    ((project.documentationSignals || []).length ? '<ul class="intel-mini-list">' + project.documentationSignals.map((item) =>
      '<li><strong>' + escapeHtml(item.label) + ':</strong> ' + escapeHtml(item.detail) +
      renderIntelSourceLinks(assessment.sources, [item.sourceId]) + '</li>').join('') + '</ul>' : '') +
    '</article>';
}

function renderIntelAssessment(assessment) {
  if (!assessment || assessment.kind !== 'developer-assessment') return renderIntelError('The server did not return a developer assessment.');
  const sources = assessment.sources || [];
  return '<div class="intel-result-heading"><div><span class="card-kicker">PUBLIC TRAIL / @' + escapeHtml(assessment.account.login) +
    '</span><h3>' + escapeHtml(assessment.role) + '</h3></div><a class="intel-profile-link" href="' +
    escapeHtml(intelSafeUrl(assessment.account.url)) + '" target="_blank" rel="noopener noreferrer">Open profile ↗</a></div>' +
    '<section class="intel-summary"><strong>What the record reveals</strong><p>' + escapeHtml(assessment.summary) + '</p>' +
    renderIntelSourceLinks(sources, ['account-profile']) + '</section>' +
    '<div class="intel-results-grid"><section class="intel-result-card"><span class="card-kicker">CLUES / RELEVANT PROJECTS</span><h4>Projects worth examining</h4>' +
    ((assessment.relevantProjects || []).length ? assessment.relevantProjects.map((project) => renderIntelProject(project, assessment)).join('') :
      renderIntelEmpty('No strong role-specific metadata match was found in the returned public repository sample.')) +
    '</section><section class="intel-result-card"><span class="card-kicker">TECHNOLOGY TRACES</span><h4>Technologies seen in metadata or inspected README excerpts</h4>' +
    ((assessment.demonstratedTechnologies || []).length ? '<div class="intel-tech-list">' + assessment.demonstratedTechnologies.map((tech) =>
      '<div><strong>' + escapeHtml(tech.technology) + '</strong><span>' + tech.repositoryCount + ' project(s)</span>' +
      renderIntelSourceLinks(sources, tech.sourceIds) + '</div>').join('') + '</div>' : renderIntelEmpty('No specific technologies were verified from the selected evidence.')) +
    '<span class="card-kicker intel-section-kicker">ACTIVITY SIGNALS</span>' +
    '<p class="intel-evidence-note">' + escapeHtml(assessment.activity.observationBasis || '') + '</p>' +
    ((assessment.activity.recentRepositories || []).length ? '<ul class="intel-mini-list">' + assessment.activity.recentRepositories.map((item) =>
      '<li><a href="' + escapeHtml(intelSafeUrl(item.url)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.repository) +
      ' ↗</a> — pushed ' + escapeHtml(formatDate(item.pushedAt)) + '</li>').join('') + '</ul>' : renderIntelEmpty('No push dates were available in this returned sample.')) +
    '</section><section class="intel-result-card"><span class="card-kicker">WHAT THE RECORD SUPPORTS</span><h4>Evidence-backed signals</h4>' +
    '<ul class="intel-finding-list">' + (assessment.strengths || []).map((item) => '<li><p>' + escapeHtml(item.claim) + '</p>' +
      renderIntelSourceLinks(sources, item.sourceIds) + '</li>').join('') + '</ul></section>' +
    '<section class="intel-result-card"><span class="card-kicker">WHAT REMAINS UNKNOWN</span><h4>Evidence gaps</h4><ul class="intel-finding-list">' +
    (assessment.evidenceGaps || []).map((item) => '<li><p>' + escapeHtml(item) + '</p></li>').join('') + '</ul>' +
    '<span class="card-kicker intel-section-kicker">INTERVIEW PREPARATION</span><h4>Questions to verify in a real screen</h4><ol class="intel-finding-list">' +
    (assessment.interviewQuestions || []).map((item) => '<li><p><strong>' + escapeHtml(item.question) + '</strong></p><p>' + escapeHtml(item.why) + '</p>' +
      renderIntelSourceLinks(sources, item.sourceIds) + '</li>').join('') + '</ol>' +
    '<div class="intel-next-step"><strong>Suggested next step</strong><p>' + escapeHtml(assessment.nextStep || '') + '</p></div></section></div>' +
    '<section class="intel-limitations"><strong>Scope and limitations</strong><ul>' + (assessment.limitations || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></section>' +
    ((assessment.collectionWarnings || []).length ? '<section class="intel-limitations"><strong>Incomplete evidence collection</strong><ul>' + assessment.collectionWarnings.map((item) =>
      '<li>' + escapeHtml(item.repository + ': ' + item.message) + '</li>').join('') + '</ul></section>' : '');
}

function renderIntelComparison(comparison) {
  if (!comparison || comparison.kind !== 'developer-comparison') return renderIntelError('The server did not return an account comparison.');
  const left = comparison.left || {};
  const right = comparison.right || {};
  const renderSide = (assessment) => {
    const account = assessment.account || {};
    const languages = (assessment.languagesInReturnedSnapshot || []).slice(0, 8);
    const recentRepositories = (assessment.activity && assessment.activity.recentRepositories || []).slice(0, 3);
    const relevantProjects = (assessment.relevantProjects || []).slice(0, 2);
    return '<div class="intel-compare-profile"><strong><a href="' + escapeHtml(intelSafeUrl(account.url)) +
      '" target="_blank" rel="noopener noreferrer">@' + escapeHtml(account.login || 'unknown') + ' ↗</a></strong>' +
      '<span>' + escapeHtml(assessment.role || '') + '</span><p>' + escapeHtml(assessment.summary || '') + '</p>' +
      '<div class="intel-snapshot-stats"><span>Public repositories</span><strong>' +
      escapeHtml(String(account.publicRepos ?? 'Unknown')) + ' reported · ' + escapeHtml(String(account.returnedCount ?? 0)) +
      ' returned</strong></div><div class="intel-snapshot-languages"><span>Languages in returned snapshot</span><div class="intel-term-list">' +
      (languages.length ? languages.map((language) => '<span>' + escapeHtml(language) + '</span>').join('') : '<span>None reported</span>') +
      '</div></div><p class="intel-evidence-note">These are account-level snapshot signals, not proof of framework proficiency.</p>' +
      '<h4 class="intel-snapshot-title">Recent public repositories</h4>' +
      (recentRepositories.length ? '<ul class="intel-mini-list">' + recentRepositories.map((item) =>
        '<li><a href="' + escapeHtml(intelSafeUrl(item.url)) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(item.repository || 'Public repository') + ' ↗</a> — pushed ' + escapeHtml(formatDate(item.pushedAt)) + '</li>').join('') +
        '</ul>' : renderIntelEmpty('No recent repository push dates were returned.')) +
      '<h4 class="intel-snapshot-title">Role-specific repository matches</h4>' +
      (relevantProjects.length ? relevantProjects.map((project) => '<a href="' + escapeHtml(intelSafeUrl(project.url)) +
        '" target="_blank" rel="noopener noreferrer">' + escapeHtml(project.fullName) + ' ↗</a>').join('') :
        renderIntelEmpty('No exact role-specific match was found. RepoGhost still shows the account snapshot and inspected public README signals above.')) +
      '</div>';
  };
  return '<div class="intel-result-heading"><div><span class="card-kicker">ACCOUNT COMPARISON</span><h3>' + escapeHtml(comparison.goal) + '</h3></div></div>' +
    '<section class="intel-summary"><strong>What the traces suggest</strong><p>' + escapeHtml(comparison.summary) +
    '</p><p class="intel-evidence-note">This is a relevance comparison, not an overall ranking of developer quality.</p></section>' +
    '<div class="intel-compare-grid">' + renderSide(left) + renderSide(right) + '</div>' +
    '<section class="intel-result-card intel-criteria"><span class="card-kicker">TWO SHADOWS / EXPLICIT CRITERIA</span>' +
    (comparison.criteria || []).map((criterion) => '<div class="intel-criterion"><h4>' + escapeHtml(criterion.label) + '</h4>' +
      '<div class="intel-criterion-values"><div><span>@' + escapeHtml(left.account.login) + '</span><p>' + escapeHtml(criterion.leftValue) + '</p>' +
      renderIntelSourceLinks(left.sources, criterion.leftSourceIds) + '</div><div><span>@' + escapeHtml(right.account.login) + '</span><p>' +
      escapeHtml(criterion.rightValue) + '</p>' + renderIntelSourceLinks(right.sources, criterion.rightSourceIds) + '</div></div>' +
      '<p class="intel-evidence-note">' + escapeHtml(criterion.interpretation) + '</p></div>').join('') + '</section>' +
    '<section class="intel-limitations"><strong>Scope and limitations</strong><ul>' + (comparison.limitations || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></section>' +
    ((comparison.collectionWarnings || []).length ? '<section class="intel-limitations"><strong>Incomplete evidence collection</strong><ul>' +
      comparison.collectionWarnings.map((item) => '<li>' + escapeHtml(item.side + ' / ' + item.repository + ': ' + item.message) + '</li>').join('') +
      '</ul></section>' : '');
}

function renderIntelHealth(health) {
  if (!health || health.kind !== 'repository-health') return renderIntelError('The server did not return a repository health report.');
  const repo = health.repository || {};
  return '<div class="intel-result-heading"><div><span class="card-kicker">PROJECT RESURRECTION / SNAPSHOT</span><h3><a href="' +
    escapeHtml(intelSafeUrl(repo.url)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(repo.fullName) + ' ↗</a></h3>' +
    '<p>' + escapeHtml(repo.description || 'No public description supplied.') + '</p></div>' +
    '<span class="pill ' + (repo.archived ? 'warn' : 'neutral') + '">' + (repo.archived ? 'Archived' : 'Read-only') + '</span></div>' +
    '<div class="intel-snapshot-grid">' + [
      ['Primary language', repo.language || 'Not reported'],
      ['Stars / forks', String(repo.stars ?? 'Unknown') + ' / ' + String(repo.forks ?? 'Unknown')],
      ['Open issues', repo.openIssuesCount ?? 'Unknown'],
      ['Last push', repo.pushedAt ? formatDate(repo.pushedAt) : 'Not reported'],
      ['License', repo.license || 'Not reported'],
      ['Latest release', health.sample && health.sample.releaseAvailable ? 'Found' : 'Not returned'],
    ].map((item) => '<div><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>').join('') + '</div>' +
    '<div class="intel-results-grid"><section class="intel-result-card"><span class="card-kicker">SIGNS FOUND IN THE DARK</span><h4>What the snapshot reveals</h4>' +
    '<ul class="intel-finding-list">' + (health.signals || []).map((signal) => '<li><strong>' + escapeHtml(signal.label) + '</strong><p>' +
      escapeHtml(signal.detail) + '</p>' + renderIntelSourceLinks(health.sources, signal.sourceIds) + '</li>').join('') + '</ul></section>' +
    '<section class="intel-result-card"><span class="card-kicker">RESURRECTION RITUAL / NEXT ACTIONS</span><h4>Read-only revival plan</h4>' +
    (health.revivalPlan || []).map((step) => '<article class="intel-plan-step"><span class="pill ' + (step.priority === 'P1' ? 'warn' : 'neutral') +
      '">' + escapeHtml(step.priority) + '</span><h4>' + escapeHtml(step.title) + '</h4><p>' + escapeHtml(step.action) + '</p><p>' +
      escapeHtml(step.why) + '</p><small>Verify: ' + escapeHtml(step.verification || '') + '</small><small>Estimate: ' +
      escapeHtml(step.estimate || 'Not estimated') + '</small>' + renderIntelSourceLinks(health.sources, step.sourceIds) + '</article>').join('') +
    '</section></div>' +
    '<section class="intel-result-card"><span class="card-kicker">TRACES LEFT BY CONTRIBUTORS</span><h4>Existing issues to inspect</h4>' +
    ((health.contributionOpportunities || []).length ? '<ul class="intel-finding-list">' + health.contributionOpportunities.map((opportunity) =>
      '<li><a href="' + escapeHtml(intelSafeUrl(opportunity.url)) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(opportunity.title) + ' ↗</a><p>' + escapeHtml(opportunity.detail) + '</p><p>' + escapeHtml(opportunity.complexity) + '</p>' +
      renderIntelSourceLinks(health.sources, opportunity.sourceIds) + '</li>').join('') + '</ul>' :
      renderIntelEmpty('No open issue was returned in the current sample. Inspect the project documentation and current issue list before choosing a contribution.')) +
    '</section><section class="intel-limitations"><strong>Scope and limitations</strong><p>Observed ' + escapeHtml(formatDate(health.observedAt)) +
    '. Sample inspected: ' + escapeHtml(health.sample.commitCount) + ' commits and ' + escapeHtml(health.sample.openIssueCount) +
    ' open issues. ' + escapeHtml(health.sample.note) + '</p><ul>' + (health.limitations || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></section>';
}

function renderIntelRecommendations(recommendations) {
  if (!recommendations || recommendations.kind !== 'repository-recommendations') return renderIntelError('The server did not return repository recommendations.');
  return '<div class="intel-result-heading"><div><span class="card-kicker">A TRAIL WORTH FOLLOWING / @' + escapeHtml(recommendations.account) +
    '</span><h3>What surfaced from the search</h3></div></div><section class="intel-summary"><p>' + escapeHtml(recommendations.summary) +
    '</p></section>' +
    ((recommendations.recommendations || []).length ? '<div class="intel-recommendation-list">' + recommendations.recommendations.map((item) =>
      '<article class="intel-project"><div class="intel-project-head"><div><a href="' + escapeHtml(intelSafeUrl(item.url)) +
      '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.fullName) + ' ↗</a><p>' + escapeHtml(item.description) +
      '</p></div><span class="pill neutral">MATCH ' + item.rank + '</span></div><div class="intel-term-list">' +
      (item.matchedTerms || []).map((term) => '<span>' + escapeHtml(term) + '</span>').join('') + '</div><ul class="intel-mini-list">' +
      (item.reasons || []).map((reason) => '<li>' + escapeHtml(reason) + '</li>').join('') + '</ul>' +
      '<div class="intel-snapshot-grid"><div><span>Language</span><strong>' + escapeHtml(item.language || 'Not reported') + '</strong></div><div><span>License</span><strong>' +
      escapeHtml(item.license || 'Not reported') + '</strong></div><div><span>Last push</span><strong>' + escapeHtml(item.pushedAt ? formatDate(item.pushedAt) : 'Not reported') +
      '</strong></div><div><span>Archived</span><strong>' + (item.archived ? 'Yes' : 'Not marked archived') + '</strong></div></div>' +
      renderIntelSourceLinks(recommendations.sources, item.sourceIds) +
      ((item.contributionOpportunities || []).length ? '<h4>Issue leads to verify</h4><ul class="intel-mini-list">' + item.contributionOpportunities.map((lead) =>
        '<li><a href="' + escapeHtml(intelSafeUrl(lead.url)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(lead.title) + ' ↗</a><p>' +
        escapeHtml(lead.detail) + '</p>' + renderIntelSourceLinks(recommendations.sources, lead.sourceIds) + '</li>').join('') + '</ul>' : '') +
      '<h4>Suggested next actions</h4><ol class="intel-mini-list">' + (item.nextSteps || []).map((step) => '<li>' + escapeHtml(step) + '</li>').join('') + '</ol></article>').join('') +
      '</div>' : renderIntelEmpty('No clear metadata match was found. Try a more specific use case or a broader search.')) +
    '<section class="intel-next-step"><strong>Before you enter the codebase</strong><p>' + escapeHtml(recommendations.contributionGuidance) +
    '</p></section><section class="intel-limitations"><strong>Scope and limitations</strong><ul>' +
    (recommendations.limitations || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></section>' +
    ((recommendations.collectionWarnings || []).length ? '<section class="intel-limitations"><strong>Incomplete evidence collection</strong><ul>' +
      recommendations.collectionWarnings.map((item) => '<li>' + escapeHtml(item.repository + ': ' + item.message) + '</li>').join('') + '</ul></section>' : '');
}

function bindIntelligenceForm(formId, endpoint, responseKey, payloadBuilder, renderer, loadingMessage) {
  const formElement = document.getElementById(formId);
  if (!formElement) return;
  const output = document.getElementById(formId.replace('-form', '-result'));
  const button = formElement.querySelector('button[type="submit"]');
  const buttonLabel = button && button.querySelector('span:first-child');
  const originalLabel = buttonLabel ? buttonLabel.textContent : '';
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!output || !button) return;
    const value = (name) => {
      const field = formElement.elements.namedItem(name);
      return field && typeof field.value === 'string' ? field.value.trim() : '';
    };
    output.innerHTML = renderIntelLoading(loadingMessage);
    output.setAttribute('aria-busy', 'true');
    button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'Working…';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payloadBuilder(value)),
      });
      let payload;
      try { payload = await response.json(); }
      catch { throw new Error('The server returned a response RepoGhost could not read. Please try again.'); }
      if (!response.ok) throw new Error(payload.error && payload.error.message || 'The investigation failed (HTTP ' + response.status + ').');
      if (!payload[responseKey]) throw new Error('The server did not return the expected evidence report.');
      output.innerHTML = renderer(payload[responseKey]);
    } catch (error) {
      output.innerHTML = renderIntelError(error.message || 'Something went wrong. Please try again.');
    } finally {
      output.setAttribute('aria-busy', 'false');
      button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = originalLabel;
    }
  });
}

document.querySelectorAll('[data-intel-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = tab.getAttribute('data-intel-tab');
    document.querySelectorAll('[data-intel-tab]').forEach((item) => {
      const selected = item === tab;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('[data-intel-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-intel-panel') !== name;
    });
  });
});

bindIntelligenceForm('intel-assess-form', '/api/intelligence/assess', 'assessment', (value) => ({
  username: value('username'),
  role: value('role'),
  context: value('context'),
}), renderIntelAssessment, 'Interrogating the public record…');

bindIntelligenceForm('intel-compare-form', '/api/intelligence/compare', 'comparison', (value) => ({
  usernameA: value('usernameA'),
  usernameB: value('usernameB'),
  goal: value('goal'),
}), renderIntelComparison, 'Comparing two shadows in the public record…');

bindIntelligenceForm('intel-health-form', '/api/intelligence/health', 'health', (value) => ({
  repositoryUrl: value('repositoryUrl'),
}), renderIntelHealth, 'Listening for signs of life in the repository…');

bindIntelligenceForm('intel-recommend-form', '/api/intelligence/recommend', 'recommendations', (value) => ({
  username: value('username'),
  goal: value('goal'),
}), renderIntelRecommendations, 'Following clues toward a project worth waking…');
