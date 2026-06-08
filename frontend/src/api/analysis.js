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
