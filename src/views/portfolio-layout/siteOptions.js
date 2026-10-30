import { portfolioRows } from './aggregation';

// Site names are compared exactly after trimming and normalising case.
// ALL is a project-wide marker, not an individual Site option.
export function normalizeSite(value) {
  const site = typeof value === 'string' || typeof value === 'number' ? String(value).trim().toUpperCase() : '';
  return site && site !== 'ALL' ? site : '';
}

export function splitSites(value) {
  if (value == null) return [];
  return [...new Set(String(value).split(',').map(normalizeSite).filter(Boolean))];
}

// One resolved catalogue is shared by Master Data, Portfolio, Timeline and the
// admin preview. Configured values remain authoritative for data entry; values
// already used by eligible projects or targets remain visible so admins can
// repair older data instead of silently losing a filter choice.
export function resolveSiteOptions({ masterSites = [], rows = [], targets = [] } = {}) {
  const sites = new Map();
  const ensure = value => {
    const site = normalizeSite(value);
    if (!site) return null;
    if (!sites.has(site)) sites.set(site, {
      value: site,
      label: site,
      configured: false,
      eligibleProjectCount: 0,
      targetCount: 0
    });
    return sites.get(site);
  };

  (Array.isArray(masterSites) ? masterSites : []).forEach(value => {
    // Split malformed legacy entries such as "MUA, AMK" into usable Sites.
    splitSites(value).forEach(site => { ensure(site).configured = true; });
  });

  portfolioRows(Array.isArray(rows) ? rows : []).forEach(row => {
    // Count a project at most once for each Site, even if its stored list has duplicates.
    splitSites(row?.sites).forEach(site => { ensure(site).eligibleProjectCount += 1; });
  });

  (Array.isArray(targets) ? targets : []).forEach(target => {
    splitSites(target?.site).forEach(site => { ensure(site).targetCount += 1; });
  });

  return [...sites.values()].map(site => ({
    ...site,
    hasEligibleProjects: site.eligibleProjectCount > 0,
    hasTargets: site.targetCount > 0,
    needsConfiguration: !site.configured && (site.eligibleProjectCount > 0 || site.targetCount > 0),
    filterAvailable: true
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function resolvedSiteValues(source) {
  return resolveSiteOptions(source).map(site => site.value);
}
