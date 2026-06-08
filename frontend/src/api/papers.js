import request from './request'

export function getPapers(params) {
  return request({
    url: '/papers',
    method: 'get',
    params
  })
}

export function getPaper(id) {
  return request({
    url: `/papers/${id}`,
    method: 'get'
  })
}

export function createPaper(data) {
  return request({
    url: '/papers',
    method: 'post',
    data
  })
}

export function updatePaper(id, data) {
  return request({
    url: `/papers/${id}`,
    method: 'put',
    data
  })
}

export function deletePaper(id) {
  return request({
    url: `/papers/${id}`,
    method: 'delete'
  })
}

export function batchDeletePapers(ids) {
  return request({
    url: '/papers/batch-delete',
    method: 'post',
    data: { ids }
  })
}

export function getPaperStats() {
  return request({
    url: '/papers/stats',
    method: 'get'
  })
}
