class EndNoteParser {
  constructor() {
    this.fieldMap = {
      '%0': 'type',
      '%T': 'title',
      '%A': 'authors',
      '%J': 'journal',
      '%B': 'journal',
      '%V': 'volume',
      '%N': 'issue',
      '%P': 'pages',
      '%D': 'year',
      '%Y': 'year',
      '%I': 'publisher',
      '%C': 'place',
      '%R': 'doi',
      '%X': 'abstract',
      '%W': 'abstract',
      '%K': 'keywords',
      '%U': 'url',
      '%Z': 'notes',
      '%~': 'affiliations',
      '%+': 'affiliations',
      '%G': 'funding',
      '%R': 'doi',
      '%8': 'date',
      '%E': 'editor',
      '%S': 'series',
      '%7': 'edition',
      '%@': 'isbn',
      '%!': 'shortTitle',
      'F1': 'title',
      'F2': 'authors',
      'F3': 'journal',
      'F4': 'year',
      'F5': 'volume',
      'F6': 'issue',
      'F7': 'pages',
      'F8': 'doi',
      'F9': 'abstract',
      'FA': 'authors',
      'FB': 'journal',
      'FC': 'year',
      'FD': 'volume',
      'FE': 'issue',
      'FF': 'pages',
      'FG': 'doi',
      'FH': 'abstract',
      'FI': 'keywords'
    };
  }

  parse(content) {
    const entries = [];
    let currentEntry = null;
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (currentEntry && Object.keys(currentEntry).length > 0) {
          entries.push(currentEntry);
          currentEntry = null;
        }
        continue;
      }

      let tag = null;
      let value = '';

      const percentMatch = trimmed.match(/^%([A-Z0-9])\s*(.*)$/);
      if (percentMatch) {
        tag = `%${percentMatch[1]}`;
        value = percentMatch[2]?.trim() || '';
      }

      const fMatch = trimmed.match(/^(F[A-Z0-9])\s*-\s*(.*)$/);
      if (fMatch) {
        tag = fMatch[1];
        value = fMatch[2]?.trim() || '';
      }

      const labelMatch = trimmed.match(/^([A-Z][a-z]+):\s*(.*)$/);
      if (labelMatch) {
        tag = labelMatch[1];
        value = labelMatch[2]?.trim() || '';
      }

      if (tag && value) {
        if (!currentEntry) {
          currentEntry = {};
        }

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
      } else if (currentEntry && !tag) {
        const lastField = Object.keys(currentEntry).pop();
        if (lastField && typeof currentEntry[lastField] === 'string') {
          currentEntry[lastField] += ' ' + trimmed;
        }
      }
    }

    if (currentEntry && Object.keys(currentEntry).length > 0) {
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
        pages: entry.pages || '',
        doi: entry.doi || '',
        abstract: entry.abstract || '',
        keywords: entry.keywords || [],
        funding: entry.funding || [],
        affiliations: entry.affiliations || [],
        source: 'endnote'
      };

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

module.exports = EndNoteParser;
