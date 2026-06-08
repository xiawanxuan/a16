import request from './request'

export function getUsers(params) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

export function getUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'get'
  })
}

export function createUser(data) {
  return request({
    url: '/users',
    method: 'post',
    data
  })
}

export function updateUser(id, data) {
  return request({
    url: `/users/${id}`,
    method: 'put',
    data
  })
}

export function deleteUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'delete'
  })
}

export function toggleUserStatus(id) {
  return request({
    url: `/users/${id}/toggle-status`,
    method: 'patch'
  })
}

export function getUserStats() {
  return request({
    url: '/users/stats',
    method: 'get'
  })
}
