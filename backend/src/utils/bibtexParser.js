class BibTeXParser {
  parse(content) {
    const entries = [];
    const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,([\s\S]*?)\n\}/g;
    let match;

    while ((match = entryRegex.exec(content)) !== null) {
      const entryType = match[1].toLowerCase();
      const citationKey = match[2].trim();
      const fieldsStr = match[3];

      const fields = this.parseFields(fieldsStr);

      const entry = {
        entryType,
        citationKey,
        ...fields
      };

      entries.push(entry);
    }

    return entries;
  }

  parseFields(fieldsStr) {
    const fields = {};
    const fieldRegex = /(\w+)\s*=\s*(\{[\s\S]*?\}|"[\s\S]*?"|\d+)/g;
    let match;

    while ((match = fieldRegex.exec(fieldsStr)) !== null) {
      const key = match[1].toLowerCase();
      let value = match[2];

      if ((value.startsWith('{') && value.endsWith('}')) || 
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }

      value = this.cleanValue(value);

      fields[key] = value;
    }

    return fields;
  }

  cleanValue(value) {
    return value
      .replace(/[\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\\&/g, '&')
      .replace(/\\%/g, '%')
      .replace(/\\#/g, '#')
      .replace(/\\_/g, '_')
      .replace(/\\ss/g, 'ß')
      .replace(/\\\"a/g, 'ä')
      .replace(/\\\"o/g, 'ö')
      .replace(/\\\"u/g, 'ü')
      .replace(/\\\"A/g, 'Ä')
      .replace(/\\\"O/g, 'Ö')
      .replace(/\\\"U/g, 'Ü')
      .replace(/\\'a/g, 'á')
      .replace(/\\'e/g, 'é')
      .replace(/\\'i/g, 'í')
      .replace(/\\'o/g, 'ó')
      .replace(/\\'u/g, 'ú')
      .replace(/\\`a/g, 'à')
      .replace(/\\`e/g, 'è')
      .replace(/\\`i/g, 'ì')
      .replace(/\\`o/g, 'ò')
      .replace(/\\`u/g, 'ù')
      .replace(/\^a/g, 'â')
      .replace(/\^e/g, 'ê')
      .replace(/\^i/g, 'î')
      .replace(/\^o/g, 'ô')
      .replace(/\^u/g, 'û')
      .trim();
  }

  toPaper(bibEntry) {
    const authors = this.parseAuthors(bibEntry.author || '');
    const keywords = this.parseKeywords(bibEntry.keywords || bibEntry.keyword || '');
    const year = bibEntry.year ? parseInt(bibEntry.year, 10) : null;
    const citations = bibEntry.citations ? parseInt(bibEntry.citations, 10) : 
                      bibEntry.times_cited ? parseInt(bibEntry.times_cited, 10) : 0;
    const funding = this.parseFunding(bibEntry.funding || bibEntry.fund || bibEntry.acknowledgement || '');
    const affiliations = this.parseAffiliations(bibEntry.affiliation || bibEntry.affil || bibEntry.institution || '');

    return {
      title: bibEntry.title || '',
      authors,
      journal: bibEntry.journal || bibEntry.journaltitle || bibEntry.booktitle || '',
      year,
      volume: bibEntry.volume || '',
      issue: bibEntry.number || bibEntry.issue || '',
      pages: bibEntry.pages || '',
      doi: bibEntry.doi || '',
      abstract: bibEntry.abstract || '',
      keywords,
      funding,
      affiliations,
      citations,
      source: 'bibtex',
      fields: {
        entryType: bibEntry.entryType || 'article',
        citationKey: bibEntry.citationKey || '',
        publisher: bibEntry.publisher || '',
        address: bibEntry.address || '',
        isbn: bibEntry.isbn || '',
        issn: bibEntry.issn || '',
        url: bibEntry.url || '',
        month: bibEntry.month || '',
        edition: bibEntry.edition || '',
        series: bibEntry.series || '',
        editor: bibEntry.editor || ''
      }
    };
  }

  parseFunding(fundingStr) {
    if (!fundingStr) return [];
    return fundingStr
      .split(/[;；]/)
      .map(f => f.trim())
      .filter(f => f.length > 0);
  }

  parseAffiliations(affStr) {
    if (!affStr) return [];
    return affStr
      .split(/[;；]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }

  parseAuthors(authorsStr) {
    if (!authorsStr) return [];

    const authors = authorsStr
      .split(/\s+and\s+/i)
      .map(author => {
        author = author.trim();
        
        if (author.includes(',')) {
          const parts = author.split(',');
          return `${parts[1]?.trim() || ''} ${parts[0].trim()}`.trim();
        }
        
        return author;
      })
      .filter(author => author.length > 0);

    return authors;
  }

  parseKeywords(keywordsStr) {
    if (!keywordsStr) return [];

    const keywords = keywordsStr
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    return keywords;
  }

  parseToPapers(content) {
    const entries = this.parse(content);
    return entries.map(entry => this.toPaper(entry));
  }
}

module.exports = BibTeXParser;
