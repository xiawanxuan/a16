class NBibParser {
  constructor() {
    this.fieldMap = {
      'PMID': 'pmid',
      'TI': 'title',
      'TI  -': 'title',
      'AU': 'authors',
      'AU  -': 'authors',
      'FAU': 'authors',
      'FAU -': 'authors',
      'JT': 'journal',
      'JT  -': 'journal',
      'TA': 'journalAbbrev',
      'TA  -': 'journalAbbrev',
      'DP': 'year',
      'DP  -': 'year',
      'DA': 'date',
      'DA  -': 'date',
      'VI': 'volume',
      'VI  -': 'volume',
      'IP': 'issue',
      'IP  -': 'issue',
      'PG': 'pages',
      'PG  -': 'pages',
      'LID': 'doi',
      'LID -': 'doi',
      'AB': 'abstract',
      'AB  -': 'abstract',
      'MH': 'keywords',
      'MH  -': 'keywords',
      'OT': 'keywords',
      'OT  -': 'keywords',
      'PT': 'type',
      'PT  -': 'type',
      'PL': 'place',
      'PL  -': 'place',
      'TA': 'journalAbbrev',
      'AD': 'affiliations',
      'AD  -': 'affiliations',
      'AFFIL': 'affiliations',
      'AFFIL -': 'affiliations',
      'GR': 'funding',
      'GR  -': 'funding',
      'GRANT': 'funding',
      'GRANT -': 'funding',
      'PS': 'funding',
      'PS  -': 'funding'
    };
  }

  parse(content) {
    const entries = [];
    let currentEntry = null;
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentEntry && Object.keys(currentEntry).length > 0) {
          entries.push(currentEntry);
          currentEntry = null;
        }
        continue;
      }

      const match = line.match(/^([A-Z]{2,5})[\s-]*-\s*(.*)$/);
      if (match) {
        const tag = match[1];
        const value = match[2]?.trim() || '';

        if (tag === 'PMID' || !currentEntry) {
          if (currentEntry && Object.keys(currentEntry).length > 0) {
            entries.push(currentEntry);
          }
          currentEntry = {};
        }

        const field = this.fieldMap[tag];
        if (field && value) {
          if (['authors', 'keywords', 'affiliations', 'funding'].includes(field)) {
            if (!currentEntry[field]) {
              currentEntry[field] = [];
            }
            currentEntry[field].push(value);
          } else if (!currentEntry[field]) {
            currentEntry[field] = value;
          }
        }
      } else if (currentEntry && line.startsWith(' ') || line.startsWith('\t')) {
        const lastField = this._getLastField(currentEntry);
        if (lastField && typeof currentEntry[lastField] === 'string') {
          currentEntry[lastField] += ' ' + line.trim();
        }
      }
    }

    if (currentEntry && Object.keys(currentEntry).length > 0) {
      entries.push(currentEntry);
    }

    return entries;
  }

  _getLastField(entry) {
    const keys = Object.keys(entry);
    return keys.length > 0 ? keys[keys.length - 1] : null;
  }

  parseToPapers(content) {
    const entries = this.parse(content);
    
    return entries.map(entry => {
      const paper = {
        title: entry.title || '',
        authors: entry.authors || [],
        journal: entry.journal || '',
        year: null,
        volume: entry.volume || '',
        issue: entry.issue || '',
        pages: entry.pages || '',
        doi: '',
        abstract: entry.abstract || '',
        keywords: entry.keywords || [],
        funding: entry.funding || [],
        affiliations: entry.affiliations || [],
        pmid: entry.pmid || '',
        source: 'nbib'
      };

      if (entry.doi) {
        const doiMatch = entry.doi.match(/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
        if (doiMatch) {
          paper.doi = doiMatch[1];
        }
      }

      if (entry.year) {
        const yearMatch = entry.year.match(/(\d{4})/);
        if (yearMatch) {
          paper.year = parseInt(yearMatch[1], 10);
        }
      }

      paper.citations = 0;

      return paper;
    }).filter(p => p.title && p.title.trim());
  }
}

module.exports = NBibParser;
