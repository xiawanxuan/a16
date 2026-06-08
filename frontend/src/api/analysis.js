import request from './request'

export function getOverviewStats() {
  return request({
    url: '/analysis/overview',
    method: 'get'
  })
}

export function getCooperationNetwork(params) {
  return request({
    url: '/analysis/cooperation-network',
    method: 'get',
    params
  })
}

export function getCitationAnalysis(params) {
  return request({
    url: '/analysis/citation-analysis',
    method: 'get',
    params
  })
}

export function getKeywordTrends(params) {
  return request({
    url: '/analysis/keyword-trends',
    method: 'get',
    params
  })
}

export function getAuthorProductivity(params) {
  return request({
    url: '/analysis/author-productivity',
    method: 'get',
    params
  })
}

export function getJournalAnalysis(params) {
  return request({
    url: '/analysis/journal-analysis',
    method: 'get',
    params
  })
}

export function getFundingAnalysis(params) {
  return request({
    url: '/analysis/funding-analysis',
    method: 'get',
    params
  })
}

export function getAffiliationNetwork(params) {
  return request({
    url: '/analysis/affiliation-network',
    method: 'get',
    params
  })
}

export function exportReport(params) {
  const token = localStorage.getItem('token')
  const queryString = new URLSearchParams(params).toString()
  
  return fetch(`/api/analysis/export-report?${queryString}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }).then(res => {
    if (!res.ok) {
      throw new Error('导出失败')
    }
    return res.blob()
  })
}
