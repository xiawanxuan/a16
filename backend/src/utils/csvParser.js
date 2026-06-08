const Papa = require('papaparse');

class CSVParser {
  parse(content, options = {}) {
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter: options.delimiter || '',
      ...options
    });

    if (result.errors.length > 0) {
      console.warn('CSV解析警告:', result.errors);
    }

    return result.data;
  }

  toPaper(csvRow, fieldMapping = {}) {
    const defaultMapping = {
      title: ['title', 'Title', 'TI', '论文标题', '标题'],
      authors: ['authors', 'author', 'Authors', 'Author', 'AU', '作者', '作者列表'],
      journal: ['journal', 'Journal', 'JO', 'SO', '期刊', '来源期刊', '出版物名称'],
      year: ['year', 'Year', 'PY', '出版年份', '年份', '发表年份'],
      volume: ['volume', 'Volume', 'VL', '卷', '卷号'],
      issue: ['issue', 'number', 'Issue', 'Number', 'IS', '期', '期号'],
      pages: ['pages', 'Pages', 'PG', '页码', '起止页码'],
      doi: ['doi', 'DOI', 'DI', 'DOI编号'],
      abstract: ['abstract', 'Abstract', 'AB', '摘要', '内容摘要'],
      keywords: ['keywords', 'keyword', 'Keywords', 'Keyword', 'DE', 'ID', '关键词', '作者关键词'],
      citations: ['citations', 'cited', 'Citations', 'Cited', '被引频次', '被引次数', '引用次数']
    };

    const mergedMapping = { ...defaultMapping, ...fieldMapping };

    const getValue = (fieldNames) => {
      for (const name of fieldNames) {
        if (csvRow[name] !== undefined && csvRow[name] !== null && csvRow[name] !== '') {
          return csvRow[name];
        }
      }
      return '';
    };

    const title = getValue(mergedMapping.title);
    const authorsStr = getValue(mergedMapping.authors);
    const journal = getValue(mergedMapping.journal);
    const yearStr = getValue(mergedMapping.year);
    const volume = getValue(mergedMapping.volume);
    const issue = getValue(mergedMapping.issue);
    const pages = getValue(mergedMapping.pages);
    const doi = getValue(mergedMapping.doi);
    const abstract = getValue(mergedMapping.abstract);
    const keywordsStr = getValue(mergedMapping.keywords);
    const citationsStr = getValue(mergedMapping.citations);

    const authors = this.parseAuthors(authorsStr);
    const keywords = this.parseKeywords(keywordsStr);
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const citations = citationsStr ? parseInt(citationsStr, 10) : 0;

    const extraFields = {};
    Object.keys(csvRow).forEach(key => {
      const allMappedFields = Object.values(mergedMapping).flat();
      if (!allMappedFields.includes(key) && csvRow[key]) {
        extraFields[key] = String(csvRow[key]);
      }
    });

    return {
      title,
      authors,
      journal,
      year,
      volume,
      issue,
      pages,
      doi,
      abstract,
      keywords,
      citations,
      source: 'csv',
      fields: extraFields
    };
  }

  parseAuthors(authorsStr) {
    if (!authorsStr) return [];

    let authors = [];

    if (authorsStr.includes(';')) {
      authors = authorsStr.split(';');
    } else if (authorsStr.includes(',')) {
      const commaCount = (authorsStr.match(/,/g) || []).length;
      if (commaCount > 3) {
        authors = authorsStr.split(',');
      } else {
        authors = [authorsStr];
      }
    } else if (authorsStr.includes(' and ')) {
      authors = authorsStr.split(/\s+and\s+/i);
    } else {
      authors = [authorsStr];
    }

    return authors
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }

  parseKeywords(keywordsStr) {
    if (!keywordsStr) return [];

    let keywords = [];

    if (keywordsStr.includes(';')) {
      keywords = keywordsStr.split(';');
    } else if (keywordsStr.includes(',')) {
      keywords = keywordsStr.split(',');
    } else {
      keywords = [keywordsStr];
    }

    return keywords
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }

  parseToPapers(content, fieldMapping = {}) {
    const rows = this.parse(content);
    return rows.map(row => this.toPaper(row, fieldMapping));
  }

  detectDelimiter(content) {
    const firstLine = content.split('\n')[0] || '';
    const delimiters = [',', ';', '\t', '|'];
    
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }
}

module.exports = CSVParser;
