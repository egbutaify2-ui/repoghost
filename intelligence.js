'use strict';

const ROLE_PROFILES = [
  { match: /react\s*native|mobile engineer|mobile developer|\bios\b|\bandroid\b/i, terms: ['react native', 'react-native', 'expo', 'mobile', 'ios', 'android', 'typescript', 'javascript'] },
  { match: /frontend|front.end|web developer|ui engineer/i, terms: ['react', 'next.js', 'nextjs', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html', 'accessibility', 'frontend'] },
  { match: /backend|back.end|api engineer|server engineer/i, terms: ['node.js', 'nodejs', 'express', 'api', 'rest', 'graphql', 'postgresql', 'database', 'python', 'authentication', 'backend'] },
  { match: /full.?stack/i, terms: ['react', 'next.js', 'nextjs', 'node.js', 'nodejs', 'api', 'database', 'typescript', 'javascript', 'frontend', 'backend'] },
  { match: /\bai\b|artificial intelligence|\bllm\b|machine learning|ml engineer/i, terms: ['ai', 'llm', 'machine learning', 'openai', 'openrouter', 'embeddings', 'agent', 'model', 'python', 'inference', 'prompt'] },
  { match: /open.source|contribut|maintainer|community/i, terms: ['contributing', 'contribution', 'issue', 'pull request', 'release', 'test', 'documentation', 'cli', 'plugin', 'maintainer'] },
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'about', 'work', 'role',
  'engineer', 'developer', 'senior', 'junior', 'mid', 'level', 'looking', 'best', 'which',
  'project', 'projects', 'account', 'github', 'repo', 'repository', 'repositories', 'compare',
  'need', 'want', 'should', 'would', 'could', 'can', 'does', 'have', 'has', 'their', 'they',
  'them', 'your', 'you', 'our', 'what', 'who', 'how', 'why', 'based', 'evidence', 'public',
]);

function cleanText(value, max = 240) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

function words(value) {
  return [...new Set(cleanText(value, 500).toLowerCase().match(/[a-z0-9+#.-]+/g) || [])]
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function inferRoleTerms(goal, context = '') {
  const combined = cleanText(goal, 160) + ' ' + cleanText(context, 500);
  const profile = ROLE_PROFILES.find((item) => item.match.test(combined));
  const profileTerms = profile ? profile.terms : [];
  const customTerms = words(combined).filter((word) => !STOP_WORDS.has(word));
  return [...new Set([...profileTerms, ...customTerms])].slice(0, 30);
}

function repositorySearchText(repository) {
  return [
    repository && repository.fullName,
    repository && repository.name,
    repository && repository.description,
    repository && repository.language,
    repository && repository.license,
    ...(repository && Array.isArray(repository.topics) ? repository.topics : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function rankRepositories(repositories, goal, context = '') {
  const terms = inferRoleTerms(goal, context);
  const rows = Array.isArray(repositories) ? repositories : [];
  return rows.map((repository) => {
    const searchable = repositorySearchText(repository);
    const matchedTerms = terms.filter((term) => {
      const normalized = term.toLowerCase();
      return normalized.length > 2 && searchable.includes(normalized);
    });
    const phraseHits = matchedTerms.filter((term) => term.includes(' ') || term.includes('.')).length;
    const score = matchedTerms.length + phraseHits;
    const pushedAt = repository && repository.pushedAt ? Date.parse(repository.pushedAt) || 0 : 0;
    return {
      repository,
      score,
      matchedTerms,
      relevanceReasons: matchedTerms.slice(0, 5).map((term) => 'Public repository metadata matches "' + term + '".'),
      pushedAt,
    };
  }).sort((left, right) => right.score - left.score || right.pushedAt - left.pushedAt ||
    String(left.repository && left.repository.fullName || '').localeCompare(String(right.repository && right.repository.fullName || '')));
}

function mapRepositoryEvidence(evidenceRows) {
  const mapped = [];
  const sources = [];
  (Array.isArray(evidenceRows) ? evidenceRows : []).forEach((evidence, index) => {
    if (!evidence || !evidence.repository) return;
    const prefix = 'project-' + (index + 1);
    const repoSource = {
      id: prefix,
      type: 'repository',
      title: evidence.repository.fullName || 'Public repository',
      url: evidence.repository.url,
    };
    sources.push(repoSource);
    const sourceIds = { repository: repoSource.id };
    (Array.isArray(evidence.sources) ? evidence.sources : []).forEach((source, sourceIndex) => {
      if (!source || typeof source.url !== 'string' || !/^https:\/\/github\.com\//i.test(source.url)) return;
      const id = prefix + '-source-' + (sourceIndex + 1);
      sources.push({ id, type: source.type || 'repository-evidence', title: cleanText(source.title || source.type || 'GitHub source', 180), url: source.url });
      if (source.id) sourceIds[source.id] = id;
    });
    mapped.push({
      repository: evidence.repository,
      readme: evidence.readme || null,
      commits: Array.isArray(evidence.commits) ? evidence.commits : [],
      issues: Array.isArray(evidence.issues) ? evidence.issues : [],
      release: evidence.release || null,
      latestCommitAt: evidence.latestCommitAt || null,
      sourceIds,
    });
  });
  return { rows: mapped, sources };
}

function buildDeveloperAssessment(discovery, roleInput, contextInput = '', evidenceRows = []) {
  const account = discovery && discovery.account ? discovery.account : {};
  const role = cleanText(roleInput, 120) || 'Software Engineering';
  const context = cleanText(contextInput, 500);
  const ranked = rankRepositories(discovery && discovery.repositories, role, context);
  const selected = ranked.filter((item) => item.score > 0).slice(0, 4);
  const mapped = mapRepositoryEvidence(evidenceRows);
  const enrichedByName = new Map(mapped.rows.map((row) => [String(row.repository.fullName || '').toLowerCase(), row]));
  const sources = [{
    id: 'account-profile',
    type: 'profile',
    title: 'GitHub account @' + cleanText(account.login || 'unknown', 39),
    url: /^https:\/\/github\.com\//i.test(account.url || '') ? account.url : 'https://github.com/' + encodeURIComponent(account.login || ''),
  }];
  const projectRows = [];
  const technologyMap = new Map();

  for (const item of selected) {
    const repository = item.repository || {};
    const evidence = enrichedByName.get(String(repository.fullName || '').toLowerCase());
    const id = 'repository-' + (projectRows.length + 1);
    const repositorySource = {
      id,
      type: 'repository',
      title: cleanText(repository.fullName || repository.name || 'Public repository', 180),
      url: /^https:\/\/github\.com\//i.test(repository.url || '') ? repository.url : 'https://github.com/' + String(repository.fullName || '').split('/').map(encodeURIComponent).join('/'),
    };
    sources.push(repositorySource);
    let readmeText = '';
    let readmeSource = null;
    if (evidence && evidence.readme && typeof evidence.readme.content === 'string') {
      readmeText = evidence.readme.content.toLowerCase();
      readmeSource = evidence.sourceIds.readme || id;
    }
    const terms = [...new Set(item.matchedTerms)];
    if (repository.language) {
      const techKey = repository.language;
      const previous = technologyMap.get(techKey) || { technology: techKey, repositoryCount: 0, sourceIds: [] };
      previous.repositoryCount += 1;
      previous.sourceIds.push(id);
      technologyMap.set(techKey, previous);
    }
    const knownTech = ['react native', 'react', 'next.js', 'nextjs', 'expo', 'node.js', 'nodejs', 'express', 'typescript', 'javascript', 'python', 'openrouter', 'openai', 'llm', 'postgresql', 'firebase', 'supabase', 'vite', 'graphql', 'docker'];
    const repoText = repositorySearchText(repository) + ' ' + readmeText;
    for (const technology of knownTech) {
      if (repoText.includes(technology)) {
        const techKey = technology === 'nextjs' ? 'Next.js' : technology === 'nodejs' ? 'Node.js' : technology === 'react native' ? 'React Native' : technology.split(' ').map((word) => word.toUpperCase() === 'llm' ? 'LLM' : word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const previous = technologyMap.get(techKey) || { technology: techKey, repositoryCount: 0, sourceIds: [] };
        if (!previous.sourceIds.includes(id)) {
          previous.repositoryCount += 1;
          previous.sourceIds.push(id);
        }
        technologyMap.set(techKey, previous);
      }
    }
    const documentationSignals = [];
    if (evidence && evidence.readme) {
      documentationSignals.push({ label: 'README inspected', detail: evidence.readme.truncated ? 'README sample is truncated.' : 'A public README was available.', sourceId: readmeSource || id });
      if (/\b(test|testing|vitest|jest|mocha)\b/i.test(readmeText)) documentationSignals.push({ label: 'Testing mentioned in README', detail: 'README text mentions testing; actual test quality was not verified.', sourceId: readmeSource || id });
      if (/\b(contribut|pull request|development setup|getting started)\b/i.test(readmeText)) documentationSignals.push({ label: 'Contributor or setup guidance mentioned', detail: 'README mentions contributor or setup guidance; completeness was not independently graded.', sourceId: readmeSource || id });
    }
    if (repositorySource.url) {
      projectRows.push({
        fullName: cleanText(repository.fullName || repository.name, 180),
        url: repositorySource.url,
        description: cleanText(repository.description || 'No public description supplied.', 400),
        language: cleanText(repository.language || 'Not reported', 80),
        stars: Number.isFinite(repository.stars) ? repository.stars : null,
        pushedAt: repository.pushedAt || null,
        relevance: item.score > 0 ? 'Relevant public signals found' : 'Limited role-specific signals',
        matchedTerms: terms,
        reasons: terms.length ? item.relevanceReasons : ['No target-role terms were matched in this repository’s public metadata.'],
        sourceIds: [id],
        archived: repository.archived === true,
        license: repository.license || null,
        documentationSignals,
      });
    }
  }

  for (const source of mapped.sources) sources.push(source);
  const languages = [...new Set((discovery && discovery.repositories || []).map((repository) => repository.language).filter(Boolean))];
  const activityCandidates = (discovery && discovery.repositories || [])
    .filter((repository) => repository.pushedAt)
    .sort((left, right) => (Date.parse(right.pushedAt) || 0) - (Date.parse(left.pushedAt) || 0))
    .slice(0, 5);
  const activities = activityCandidates.map((repository, index) => {
    let source = sources.find((item) => item.type === 'repository' && item.url === repository.url);
    if (!source) {
      source = {
        id: 'activity-repository-' + (index + 1),
        type: 'repository',
        title: cleanText(repository.fullName || 'Public repository', 180),
        url: /^https:\/\/github\.com\//i.test(repository.url || '') ? repository.url : null,
      };
      if (source.url) sources.push(source);
    }
    return {
      repository: repository.fullName,
      pushedAt: repository.pushedAt,
      url: repository.url,
      sourceIds: [source && source.url ? source.id : 'account-profile'],
    };
  });

  const strengths = [];
  for (const project of projectRows.filter((item) => item.matchedTerms.length).slice(0, 4)) {
    strengths.push({
      claim: project.fullName + ' has public metadata relevant to ' + role + (project.matchedTerms.length ? ': ' + project.matchedTerms.slice(0, 4).join(', ') + '.' : '.'),
      sourceIds: project.sourceIds,
    });
  }
  if (strengths.length === 0) strengths.push({
    claim: 'The returned public repository metadata does not provide a strong direct match for "' + role + '". This is an evidence gap, not proof the developer lacks the skill.',
    sourceIds: ['account-profile'],
  });

  const gaps = [
    'Repository ownership and metadata do not prove that the account owner authored all code or can independently maintain the project.',
    'Public metadata cannot establish code quality, collaboration, reliability, system-design judgment, or performance in a role.',
  ];
  if ((discovery && discovery.limitReached) || (account.publicRepos > (discovery && discovery.returnedCount || 0))) {
    gaps.push('The account repository list is capped or incomplete; conclusions apply only to the returned sample.');
  }
  if (!mapped.rows.length) gaps.push('README, issue, commit and release details were not collected for a matching project; this assessment relies on account-level repository metadata.');

  const bestProject = projectRows[0];
  const interviewQuestions = [
    {
      question: bestProject
        ? 'Walk through the architecture of ' + bestProject.fullName + ' and explain one important trade-off you made.'
        : 'Describe a project that best demonstrates your experience with ' + role + ' and explain your individual contribution.',
      why: 'Verifies design understanding and personal contribution that public metadata cannot establish.',
      sourceIds: bestProject ? bestProject.sourceIds : ['account-profile'],
    },
    {
      question: 'How do you test, debug, and safely release a change in a project like this?',
      why: 'Tests engineering practices that cannot be inferred from repository counts or activity alone.',
      sourceIds: bestProject ? bestProject.sourceIds : ['account-profile'],
    },
    {
      question: context
        ? 'Show how you would approach this role requirement: ' + context.slice(0, 180) + '.'
        : 'Choose one unverified requirement for this role and explain how you would demonstrate it in a small practical exercise.',
      why: 'Connects the assessment to the stated role or evaluation context.',
      sourceIds: bestProject ? bestProject.sourceIds : ['account-profile'],
    },
  ];

  const returnedCount = Number.isFinite(discovery && discovery.returnedCount) ? discovery.returnedCount : ((discovery && discovery.repositories) || []).length;
  const publicRepos = Number.isFinite(account.publicRepos) ? account.publicRepos : returnedCount;
  const summary = selected.length
    ? 'The public snapshot contains ' + selected.length + ' role-relevant repository candidate(s) for "' + role + '". The strongest matches are selected from repository names, descriptions, languages and, where collected, README text. This is a screening aid, not a hiring verdict.'
    : 'The current public repository snapshot does not show a clear metadata match for "' + role + '". That does not establish that the developer lacks this experience; more targeted project evidence or a technical screen is needed.';
  return {
    kind: 'developer-assessment',
    account: { login: cleanText(account.login || 'unknown', 39), name: cleanText(account.name || '', 160), url: sources[0].url, publicRepos, returnedCount },
    role,
    context,
    summary,
    relevantProjects: projectRows,
    demonstratedTechnologies: [...technologyMap.values()].map((item) => ({ ...item, sourceIds: [...new Set(item.sourceIds)] })).sort((left, right) => right.repositoryCount - left.repositoryCount || left.technology.localeCompare(right.technology)).slice(0, 14),
    languagesInReturnedSnapshot: languages,
    activity: {
      observationBasis: 'Current public repository metadata; up to five most recently pushed repositories from the returned list.',
      recentRepositories: activities,
      sampledRepositories: returnedCount,
      listMayBeIncomplete: Boolean(discovery && discovery.limitReached) || returnedCount < publicRepos,
    },
    strengths,
    evidenceGaps: gaps,
    interviewQuestions,
    nextStep: bestProject
      ? 'Inspect ' + bestProject.fullName + ', review its cited project evidence, then use a role-relevant technical screen to verify implementation quality and individual contribution.'
      : 'Ask the developer to nominate a role-relevant project, review its code and tests, and use a small practical exercise to verify the required skills.',
    limitations: [
      'Assessment uses public GitHub evidence only and cannot establish private work or professional performance.',
      'Matched keywords are relevance signals, not proof of proficiency.',
      'Only the returned repository sample and any explicitly inspected README/activity evidence were assessed.',
    ],
    sources: [...new Map(sources.filter((source) => source.url).map((source) => [source.id, source])).values()],
  };
}

function buildDeveloperComparison(left, right, goal) {
  const leftProjects = left && Array.isArray(left.relevantProjects) ? left.relevantProjects : [];
  const rightProjects = right && Array.isArray(right.relevantProjects) ? right.relevantProjects : [];
  const leftTerms = new Set(leftProjects.flatMap((project) => project.matchedTerms || []));
  const rightTerms = new Set(rightProjects.flatMap((project) => project.matchedTerms || []));
  const overlap = [...leftTerms].filter((term) => rightTerms.has(term)).sort();
  const leftNewest = left && left.activity && left.activity.recentRepositories && left.activity.recentRepositories[0];
  const rightNewest = right && right.activity && right.activity.recentRepositories && right.activity.recentRepositories[0];
  const leftDate = leftNewest && Date.parse(leftNewest.pushedAt) || 0;
  const rightDate = rightNewest && Date.parse(rightNewest.pushedAt) || 0;
  const criteria = [
    {
      label: 'Role-relevant public repositories',
      leftValue: String(leftProjects.filter((project) => project.matchedTerms && project.matchedTerms.length).length) + ' matched project(s)',
      rightValue: String(rightProjects.filter((project) => project.matchedTerms && project.matchedTerms.length).length) + ' matched project(s)',
      interpretation: 'Based on matching terms in the returned public repository metadata and inspected README samples, not a measure of engineering quality.',
      leftSourceIds: leftProjects.map((project) => project.sourceIds[0]),
      rightSourceIds: rightProjects.map((project) => project.sourceIds[0]),
    },
    {
      label: 'Distinct relevant technologies observed',
      leftValue: String(leftTerms.size),
      rightValue: String(rightTerms.size),
      interpretation: 'A broader keyword match can reflect repository descriptions or documentation and does not prove hands-on proficiency.',
      leftSourceIds: leftProjects.map((project) => project.sourceIds[0]),
      rightSourceIds: rightProjects.map((project) => project.sourceIds[0]),
    },
    {
      label: 'Latest recorded push in returned repositories',
      leftValue: leftNewest ? leftNewest.pushedAt : 'No push date in returned sample',
      rightValue: rightNewest ? rightNewest.pushedAt : 'No push date in returned sample',
      interpretation: leftDate && rightDate
        ? (leftDate === rightDate ? 'The newest recorded push dates are the same.' : leftDate > rightDate ? 'The left account has a more recent recorded push; recency is not a quality ranking.' : 'The right account has a more recent recorded push; recency is not a quality ranking.')
        : 'At least one account has no comparable recorded push date in the returned sample.',
      leftSourceIds: leftNewest ? leftNewest.sourceIds : ['account-profile'],
      rightSourceIds: rightNewest ? rightNewest.sourceIds : ['account-profile'],
    },
    {
      label: 'Shared role-related signals',
      leftValue: overlap.length ? overlap.join(', ') : 'No shared matched terms in current evidence',
      rightValue: overlap.length ? overlap.join(', ') : 'No shared matched terms in current evidence',
      interpretation: overlap.length ? 'These signals appear in both snapshots; inspect the cited project sources to determine how each is used.' : 'No shared matched terms were detected in the selected evidence; this may reflect limited metadata rather than a true skills difference.',
      leftSourceIds: leftProjects.map((project) => project.sourceIds[0]),
      rightSourceIds: rightProjects.map((project) => project.sourceIds[0]),
    },
  ];
  const leftMatches = leftProjects.filter((project) => project.matchedTerms && project.matchedTerms.length).length;
  const rightMatches = rightProjects.filter((project) => project.matchedTerms && project.matchedTerms.length).length;
  let summary;
  if (leftMatches === rightMatches) {
    summary = 'The collected public evidence does not clearly distinguish the accounts by count of role-relevant repository matches for "' + cleanText(goal, 120) + '". Compare the cited projects directly and verify code quality in a practical screen.';
  } else {
    const more = leftMatches > rightMatches ? left : right;
    const matches = Math.max(leftMatches, rightMatches);
    summary = '@' + more.account.login + ' has more role-relevant repository matches in the selected public evidence (' + matches + ' versus ' + Math.min(leftMatches, rightMatches) + '). This is a metadata relevance finding, not an overall developer ranking.';
  }
  return {
    kind: 'developer-comparison',
    goal: cleanText(goal, 160),
    summary,
    criteria,
    sharedSignals: overlap,
    left,
    right,
    limitations: [
      'The comparison covers only the returned public repository lists and bounded README/activity samples.',
      'Repository count, stars, commit volume and push recency are not direct measures of engineering quality.',
      'Private work, individual authorship and role performance cannot be established from this evidence.',
    ],
  };
}

function buildRepositoryHealth(evidence) {
  const repository = evidence && evidence.repository ? evidence.repository : {};
  const issues = Array.isArray(evidence && evidence.issues) ? evidence.issues : [];
  const commits = Array.isArray(evidence && evidence.commits) ? evidence.commits : [];
  const readme = evidence && evidence.readme;
  const release = evidence && evidence.release;
  const sources = Array.isArray(evidence && evidence.sources) ? evidence.sources : [];
  const sourceFor = (type, fallback = 'repository') => {
    const found = sources.find((source) => source.type === type && source.url);
    return found ? found.id : fallback;
  };
  const signals = [];
  const repoSource = sourceFor('repository');
  if (repository.archived) {
    signals.push({ label: 'Archived status', kind: 'observed', detail: 'GitHub marks this repository as archived. Confirm whether maintainers intend to resume changes before preparing a revival.', sourceIds: [repoSource] });
  }
  if (repository.disabled) {
    signals.push({ label: 'Disabled repository', kind: 'observed', detail: 'GitHub metadata marks this repository as disabled. Verify current access and status before suggesting contribution work.', sourceIds: [repoSource] });
  }
  const pushed = repository.pushedAt ? Date.parse(repository.pushedAt) : NaN;
  const ageDays = Number.isFinite(pushed) ? Math.max(0, Math.floor((Date.now() - pushed) / 86400000)) : null;
  if (ageDays === null) {
    signals.push({ label: 'Push history unavailable', kind: 'observed', detail: 'No valid last-push date was supplied in this snapshot.', sourceIds: [repoSource] });
  } else if (ageDays > 365) {
    signals.push({ label: 'Older recorded activity', kind: 'observed', detail: 'The last recorded repository push was about ' + Math.floor(ageDays / 30) + ' month(s) ago. Inactivity alone does not prove the project is abandoned.', sourceIds: [repoSource] });
  } else {
    signals.push({ label: 'Recorded activity', kind: 'observed', detail: 'The repository has a recorded push within roughly the last ' + ageDays + ' day(s). This does not establish the quality or completeness of maintenance.', sourceIds: [repoSource] });
  }

  const cutoff = Date.now() - 90 * 86400000;
  const staleIssues = issues.filter((issue) => issue && issue.state === 'open' && issue.updatedAt && Date.parse(issue.updatedAt) < cutoff);
  if (staleIssues.length) {
    signals.push({ label: 'Older open issues in sample', kind: 'observed', detail: String(staleIssues.length) + ' of ' + issues.length + ' sampled open issues have not been updated in more than 90 days.', sourceIds: staleIssues.slice(0, 4).map((issue) => 'issue-' + issue.number) });
  } else if (issues.length) {
    signals.push({ label: 'Sampled open issues', kind: 'observed', detail: 'No issue in the current sample met the 90-day no-update rule. This describes only the sampled issues.', sourceIds: issues.slice(0, 3).map((issue) => 'issue-' + issue.number) });
  } else {
    signals.push({ label: 'No open issues returned', kind: 'observed', detail: 'The current GitHub issue request returned no open issue records. No backlog pattern can be inferred from this snapshot.', sourceIds: [repoSource] });
  }

  if (!readme) {
    signals.push({ label: 'README unavailable', kind: 'observed', detail: 'GitHub did not return a README for this repository in this request. Check whether documentation lives in another file or directory.', sourceIds: [repoSource] });
  } else {
    const text = String(readme.content || '');
    const hasSetup = /\b(install|installation|getting started|quick start|setup|set up)\b/i.test(text);
    const hasContribution = /\b(contribut|pull request|development setup|good first issue)\b/i.test(text);
    const hasTests = /\b(test|testing|vitest|jest|mocha)\b/i.test(text);
    signals.push({ label: 'README inspected', kind: 'observed', detail: readme.truncated ? 'README sample is truncated; checks apply only to the returned excerpt.' : 'A public README was returned and inspected.', sourceIds: [sourceFor('readme')] });
    if (!hasSetup) signals.push({ label: 'Setup instructions not detected', kind: 'observed', detail: 'The inspected README excerpt did not contain common setup keywords. Instructions may exist elsewhere.', sourceIds: [sourceFor('readme')] });
    if (!hasContribution) signals.push({ label: 'Contribution instructions not detected', kind: 'observed', detail: 'The inspected README excerpt did not contain common contribution keywords; a separate CONTRIBUTING file was not checked by this evidence endpoint.', sourceIds: [sourceFor('readme')] });
    if (!hasTests) signals.push({ label: 'Testing guidance not detected', kind: 'observed', detail: 'The inspected README excerpt did not mention common test keywords. This does not prove tests are absent.', sourceIds: [sourceFor('readme')] });
    if (hasSetup && hasContribution) signals.push({ label: 'Getting-started and contributor guidance mentioned', kind: 'observed', detail: 'The README excerpt mentions setup and contributor-related guidance; completeness was not independently verified.', sourceIds: [sourceFor('readme')] });
  }

  if (release && release.publishedAt) {
    const releaseAgeDays = Math.max(0, Math.floor((Date.now() - Date.parse(release.publishedAt)) / 86400000));
    signals.push({ label: 'Latest release', kind: 'observed', detail: 'GitHub reports release ' + (release.tag || release.name || 'with no title') + ' published about ' + Math.floor(releaseAgeDays / 30) + ' month(s) ago.', sourceIds: [sourceFor('release')] });
  } else {
    signals.push({ label: 'No latest release returned', kind: 'observed', detail: 'GitHub did not return a latest release through the latest-release endpoint. This does not prove the project has never had releases.', sourceIds: [repoSource] });
  }

  if (commits.length) {
    signals.push({ label: 'Recent commits sampled', kind: 'observed', detail: String(commits.length) + ' recent commit record(s) inspected; sample size is bounded and author names do not prove account ownership of every change.', sourceIds: commits.slice(0, 4).map((commit) => 'commit-' + commit.sha) });
  }

  const firstIssue = staleIssues[0] || [...issues].sort((a, b) => (Date.parse(a.updatedAt || '') || 0) - (Date.parse(b.updatedAt || '') || 0))[0];
  const readmeSource = readme ? sourceFor('readme') : repoSource;
  const plan = [];
  if (repository.archived) {
    plan.push({ priority: 'P1', title: 'Confirm whether the project should be revived', action: 'Review the archive status and look for a maintainer signal before proposing code changes.', why: 'An archived project may be intentionally frozen; revival should start by confirming that renewed maintenance is wanted.', sourceIds: [repoSource], verification: 'Check the repository banner and any maintainer guidance.', estimate: 'Not estimated; maintainer intent is unknown.' });
  } else if (firstIssue) {
    plan.push({ priority: 'P1', title: 'Triage a real open issue', action: 'Review #' + firstIssue.number + ' (“' + cleanText(firstIssue.title, 160) + '”), reproduce it if possible, and check for newer comments before proposing a fix.', why: 'This issue is present in the sampled public open-issue list' + (firstIssue.updatedAt ? ' and was last updated ' + firstIssue.updatedAt.slice(0, 10) + '.' : '.'), sourceIds: ['issue-' + firstIssue.number], verification: 'Confirm it is still open, reproducible, and not already addressed elsewhere.', estimate: 'Not estimated; reproduction and scope are unknown.' });
  } else {
    plan.push({ priority: 'P1', title: 'Confirm current maintenance priorities', action: 'Review recent commits and repository guidance, then identify a maintainer-approved small task before opening new work.', why: 'The sampled evidence did not provide an open issue to prioritize, so a concrete bug should not be invented.', sourceIds: [repoSource], verification: 'Check the repository’s current issue list and maintainer guidance.', estimate: 'Not estimated; no concrete task was verified.' });
  }

  const readmeText = String(readme && readme.content || '');
  if (!readme || !/\b(install|installation|getting started|quick start|setup|set up)\b/i.test(readmeText)) {
    plan.push({ priority: 'P2', title: 'Verify or improve the development setup guide', action: 'Check the repository files for install and run instructions; if they are genuinely missing, document a minimal working setup and expected commands.', why: 'The collected README is unavailable or does not mention common setup instructions; instructions may exist elsewhere.', sourceIds: [readmeSource], verification: 'Inspect project manifests and existing documentation before adding duplicate instructions.', estimate: 'Not estimated; documentation scope is unknown.' });
  } else if (!/\b(contribut|pull request|good first issue|development setup)\b/i.test(readmeText)) {
    plan.push({ priority: 'P2', title: 'Make the contribution path explicit', action: 'Verify whether a CONTRIBUTING guide exists; if not, document how to set up the project, run tests and submit a small change.', why: 'The inspected README describes setup but does not mention common contribution guidance.', sourceIds: [readmeSource], verification: 'Check for a separate CONTRIBUTING file before editing documentation.', estimate: 'Not estimated; contribution docs may exist elsewhere.' });
  } else {
    plan.push({ priority: 'P2', title: 'Verify the contributor workflow end to end', action: 'Follow the published setup and contribution instructions in a safe development environment, then document any confirmed broken step.', why: 'The README mentions setup or contributor guidance; this feature has not executed or validated the project's instructions.', sourceIds: [readmeSource], verification: 'Do not install or execute repository code inside RepoGhost; verify manually outside the investigation service.', estimate: 'Not estimated; no workflow defect was confirmed.' });
  }

  const noTestGuidance = !readme || !/\b(test|testing|vitest|jest|mocha)\b/i.test(readmeText);
  plan.push({
    priority: 'P3',
    title: noTestGuidance ? 'Verify how changes should be tested' : 'Check the documented test workflow',
    action: noTestGuidance
      ? 'Inspect manifests and existing docs for a test command; if tests exist but the workflow is undocumented, add the exact verified command and a small regression test for the selected task.'
      : 'Confirm the documented test command and identify a small regression test that would cover the selected issue or maintenance task.',
    why: noTestGuidance
      ? 'Testing guidance was not detected in the inspected README excerpt; this is a documentation gap signal, not evidence that tests are absent.'
      : 'The README mentions tests, but this read-only investigation did not execute them.',
    sourceIds: [readmeSource],
    verification: 'Verify the package scripts or project-specific test instructions before documenting a command.',
    estimate: 'Not estimated; the test setup has not been executed.',
  });

  const validSourceIds = new Set(sources.map((source) => source.id));
  const cleanPlan = plan.map((item) => ({ ...item, sourceIds: item.sourceIds.filter((id) => validSourceIds.has(id)) }));
  return {
    kind: 'repository-health',
    observedAt: new Date().toISOString(),
    repository: {
      fullName: repository.fullName,
      url: repository.url,
      description: repository.description || null,
      language: repository.language || null,
      stars: Number.isFinite(repository.stars) ? repository.stars : null,
      forks: Number.isFinite(repository.forks) ? repository.forks : null,
      openIssuesCount: Number.isFinite(repository.openIssuesCount) ? repository.openIssuesCount : null,
      archived: repository.archived === true,
      disabled: repository.disabled === true,
      createdAt: repository.createdAt || null,
      updatedAt: repository.updatedAt || null,
      pushedAt: repository.pushedAt || null,
      defaultBranch: repository.defaultBranch || null,
      license: repository.license || null,
    },
    sample: { commitCount: commits.length, openIssueCount: issues.length, openIssueSampleLimit: 10, readmeAvailable: Boolean(readme), releaseAvailable: Boolean(release), note: 'This is a bounded public snapshot, not a complete repository audit.' },
    signals,
    revivalPlan: cleanPlan,
    contributionOpportunities: issues.slice().sort((a, b) => (Date.parse(a.updatedAt || '') || 0) - (Date.parse(b.updatedAt || '') || 0)).slice(0, 5).map((issue) => ({
      title: 'Investigate issue #' + issue.number + ': ' + cleanText(issue.title, 180),
      detail: 'Public issue updated ' + (issue.updatedAt ? issue.updatedAt.slice(0, 10) : 'on an unknown date') + '; ' + issue.comments + ' comment(s) reported. Verify current state and reproducibility before contributing.',
      url: issue.url,
      sourceIds: ['issue-' + issue.number],
      complexity: 'Not estimated; the reproduction steps and implementation scope have not been inspected.',
    })),
    sources,
    limitations: [
      'Signals describe only public metadata and bounded samples returned by GitHub.',
      'A quiet history or old release does not prove a repository is abandoned.',
      'The service does not run code, install dependencies, validate test commands, or write to GitHub.',
    ],
  };
}

function buildRepositoryRecommendations(discovery, goalInput, evidenceRows = []) {
  const goal = cleanText(goalInput, 240);
  const ranked = rankRepositories(discovery && discovery.repositories, goal).filter((item) => item.score > 0);
  const mapped = mapRepositoryEvidence(evidenceRows);
  const evidenceByName = new Map(mapped.rows.map((item) => [String(item.repository.fullName || '').toLowerCase(), item]));
  const recommendations = ranked.slice(0, 5).map((item, index) => {
    const repository = item.repository;
    const evidence = evidenceByName.get(String(repository.fullName || '').toLowerCase());
    const reasons = item.relevanceReasons.length ? item.relevanceReasons : ['Matches the stated goal in returned repository metadata.'];
    const age = repository.pushedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(repository.pushedAt)) / 86400000)) : null;
    if (repository.archived) reasons.push('GitHub marks the repository archived; check whether forking and reuse fit your purpose.');
    if (!repository.license) reasons.push('No license was reported in this metadata snapshot; check the repository license before reusing code.');
    const issues = evidence ? evidence.issues : [];
    const contributionOpportunities = issues.slice().sort((a, b) =>
      (Date.parse(a.updatedAt || '') || 0) - (Date.parse(b.updatedAt || '') || 0)).slice(0, 3).map((issue) => ({
      title: '#' + issue.number + ' ' + cleanText(issue.title, 180),
      detail: 'This issue appears in the sampled open-issue response; verify its current state, reproduction and existing discussion.',
      url: issue.url,
      sourceIds: evidence.sourceIds['issue-' + issue.number] ? [evidence.sourceIds['issue-' + issue.number]] : ['repository-' + (index + 1)],
    }));
    return {
      rank: index + 1,
      fullName: cleanText(repository.fullName, 180),
      name: cleanText(repository.name || repository.fullName, 100),
      url: /^https:\/\/github\.com\//i.test(repository.url || '') ? repository.url : 'https://github.com/' + String(repository.fullName || '').split('/').map(encodeURIComponent).join('/'),
      description: cleanText(repository.description || 'No public description supplied.', 400),
      language: repository.language || null,
      license: repository.license || null,
      archived: repository.archived === true,
      stars: Number.isFinite(repository.stars) ? repository.stars : null,
      pushedAt: repository.pushedAt || null,
      ageSincePushDays: age,
      matchedTerms: item.matchedTerms,
      reasons: [...new Set(reasons)].slice(0, 7),
      readmeAvailable: evidence ? Boolean(evidence.readme) : null,
      recentCommitSampleSize: evidence ? evidence.commits.length : null,
      sampledOpenIssueCount: evidence ? evidence.issues.length : null,
      contributionOpportunities,
      sourceIds: ['repository-' + (index + 1)],
      nextSteps: [
        'Read the repository README and confirm the project matches the intended use case.',
        repository.license ? 'Review the ' + repository.license + ' terms for your intended use.' : 'Locate and review the license before copying or shipping code.',
        'Inspect relevant source files, existing tests, contribution instructions and recent issue discussion before making changes.',
      ],
    };
  });
  const sources = [{
    id: 'account-profile',
    type: 'profile',
    title: 'GitHub account @' + cleanText(discovery && discovery.account && discovery.account.login || 'unknown', 39),
    url: discovery && discovery.account && /^https:\/\/github\.com\//i.test(discovery.account.url || '') ? discovery.account.url : 'https://github.com/' + encodeURIComponent(discovery && discovery.account && discovery.account.login || ''),
  }];
  recommendations.forEach((recommendation) => sources.push({ id: recommendation.sourceIds[0], type: 'repository', title: recommendation.fullName, url: recommendation.url }));
  mapped.sources.forEach((source) => sources.push(source));
  return {
    kind: 'repository-recommendations',
    account: cleanText(discovery && discovery.account && discovery.account.login || 'unknown', 39),
    goal,
    recommendations,
    summary: recommendations.length
      ? 'Found ' + recommendations.length + ' repository candidate(s) with metadata relevant to the stated goal. Ordering reflects keyword relevance to the goal, not a measure of quality.'
      : 'The returned public repository metadata did not contain a clear match for this goal. Try a more specific technology or use case, or investigate a broader set of repositories.',
    contributionGuidance: recommendations.length
      ? 'Only issues actually returned by GitHub are shown as possible leads. Confirm current state, license terms, project conventions and reproducibility before contributing.'
      : 'No project-specific contribution lead was established from the current evidence. Inspect the account’s repositories or search for projects that describe the required technology.',
    sources,
    limitations: [
      'Recommendations are based on returned public repository metadata and bounded evidence samples.',
      'A keyword match is not proof that a repository is compatible, secure, maintained, or suitable for production use.',
      'Issue samples may omit older or otherwise relevant issues; all suggested contribution work must be re-verified.',
    ],
  };
}

module.exports = {
  cleanText,
  inferRoleTerms,
  rankRepositories,
  buildDeveloperAssessment,
  buildDeveloperComparison,
  buildRepositoryHealth,
  buildRepositoryRecommendations,
};
