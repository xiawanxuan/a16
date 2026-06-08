import request from './request'

export function uploadPapers(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/upload/papers',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: onProgress
  })
}

export function getSampleData() {
  return request({
    url: '/upload/sample',
    method: 'get'
  })
}

export function importSampleData() {
  return request({
    url: '/upload/import-sample',
    method: 'post'
  })
}
