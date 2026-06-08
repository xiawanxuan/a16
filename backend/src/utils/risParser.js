class RISParser {
  constructor() {
    this.fieldMap = {
      'TY': 'type',
      'TI': 'title',
      'T1': 'title',
      'CT': 'title',
      'AU': 'authors',
      'A1': 'authors',
      'A2': 'authors',
      'A3': 'authors',
      'A4': 'authors',
      'JO': 'journal',
      'JF': 'journal',
      'T2': 'journal',
      'JA': 'journal',
      'PY': 'year',
      'Y1': 'year',
      'DA': 'year',
      'VL': 'volume',
      'IS': 'issue',
      'CP': 'issue',
      'SP': 'startPage',
      'EP': 'endPage',
      'PG': 'pages',
      'DO': 'doi',
      'DI': 'doi',
      'AB': 'abstract',
      'N2': 'abstract',
      'KW': 'keywords',
      'DE': 'keywords',
      'ID': 'keywords',
      'UR': 'url',
      'L1': 'url',
      'PB': 'publisher',
      'PP': 'place',
      'SN': 'issn',
      'AN': 'accessionNumber',
      'M3': 'type',
      'C1': 'affiliations',
      'C2': 'affiliations',
      'C3': 'affiliations',
      'AD': 'affiliations',
      'AF': 'affiliations',
      'PI': 'affiliations',
      'FU': 'funding',
      'FD': 'funding',
      'FS': 'funding',
      'FG': 'funding',
      'N1': 'notes',
      'U1': 'notes',
      'U2': 'notes',
      'U3': 'notes',
      'U4': 'notes',
      'U5': 'notes',
      'U6': 'notes',
      'U7': 'notes',
      'U8': 'notes',
      'U9': 'notes'
    };
  }

  parse(content) {
    const entries = [];
    let currentEntry = {};
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed === 'ER  -') {
        if (Object.keys(currentEntry).length > 0) {
          entries.push(currentEntry);
          currentEntry = {};
        }
        continue;
      }

      const match = trimmed.match(/^([A-Z0-9]{2})\s{0,2}-\s?(.*)$/);
      if (match) {
        const tag = match[1];
        const value = match[2]?.trim() || '';
        const field = this.fieldMap[tag];

        if (field) {
          if (['authors', 'keywords', 'affiliations', 'funding'].includes(field)) {
            if (!currentEntry[field]) {
              currentEntry[field] = [];
            }
            if (value) {
              currentEntry[field].push(value);
            }
          } else if (!currentEntry[field]) {
            currentEntry[field] = value;
          }
        }
      }
    }

    if (Object.keys(currentEntry).length > 0) {
      entries.push(currentEntry);
    }

    return entries;
  }

  parseToPapers(content) {
    const entries = this.parse(content);
    
    return entries.map(entry => {
      const paper = {
        title: entry.title || '',
        authors: entry.authors || [],
        journal: entry.journal || '',
        year: entry.year ? parseInt(entry.year, 10) : null,
        volume: entry.volume || '',
        issue: entry.issue || '',
        doi: entry.doi || '',
        abstract: entry.abstract || '',
        keywords: entry.keywords || [],
        funding: entry.funding || [],
        affiliations: entry.affiliations || [],
        source: 'ris'
      };

      if (entry.startPage || entry.endPage) {
        paper.pages = [entry.startPage, entry.endPage].filter(Boolean).join('-');
      } else if (entry.pages) {
        paper.pages = entry.pages;
      }

      if (entry.year) {
        const yearMatch = entry.year.match(/(\d{4})/);
        if (yearMatch) {
          paper.year = parseInt(yearMatch[1], 10);
        }
      }

      paper.citations = 0;

      return paper;
    });
  }
}

module.exports = RISParser;
