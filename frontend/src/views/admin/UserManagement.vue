<template>
  <div class="user-management-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">用户管理</h2>
        <div class="header-actions">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增用户
          </el-button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #409eff, #66b1ff)">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">用户总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #e6a23c, #ebb563)">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.byRole?.admin || 0 }}</div>
            <div class="stat-label">管理员</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #67c23a, #85ce61)">
            <el-icon><Avatar /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.byRole?.user || 0 }}</div>
            <div class="stat-label">普通用户</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #909399, #a6a9ad)">
            <el-icon><View /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.byRole?.viewer || 0 }}</div>
            <div class="stat-label">访客</div>
          </div>
        </div>
      </div>

      <div class="search-bar">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="搜索">
            <el-input
              v-model="searchForm.search"
              placeholder="用户名/邮箱"
              clearable
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="searchForm.role" placeholder="全部角色" clearable style="width: 140px">
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
              <el-option label="访客" value="viewer" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="users"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastLoginAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button 
              :type="row.isActive ? 'warning' : 'success'" 
              link 
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
            <el-button 
              type="danger" 
              link 
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form 
        ref="userFormRef" 
        :model="userForm" 
        :rules="userRules" 
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" :disabled="isEdit" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input 
            v-model="userForm.password" 
            type="password" 
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
            <el-option label="访客" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="个人简介" prop="bio">
          <el-input 
            v-model="userForm.bio" 
            type="textarea" 
            :rows="3" 
            placeholder="用户简介"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="状态" prop="isActive" v-if="isEdit">
          <el-switch v-model="userForm.isActive" active-text="正常" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getUsers, 
  getUserStats, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus 
} from '@/api/users'
import dayjs from 'dayjs'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const userFormRef = ref(null)

const users = ref([])
const stats = reactive({
  totalUsers: 0,
  byRole: { admin: 0, user: 0, viewer: 0 }
})

const searchForm = reactive({
  search: '',
  role: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})

const userForm = reactive({
  id: '',
  username: '',
  email: '',
  password: '',
  role: 'user',
  bio: '',
  isActive: true
})

const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const dialogTitle = ref('新增用户')

const getRoleText = (role) => {
  const roleMap = {
    admin: '管理员',
    user: '普通用户',
    viewer: '访客'
  }
  return roleMap[role] || '用户'
}

const getRoleTagType = (role) => {
  const typeMap = {
    admin: 'danger',
    user: 'primary',
    viewer: 'info'
  }
  return typeMap[role] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadStats = async () => {
  try {
    const res = await getUserStats()
    Object.assign(stats, res.data)
  } catch (e) {
    console.error('加载用户统计失败:', e)
  }
}

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await getUsers({
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search,
      role: searchForm.role
    })
    users.value = res.data
    pagination.total = res.pagination.total
    pagination.pages = res.pagination.pages
  } catch (e) {
    console.error('加载用户列表失败:', e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.role = ''
  pagination.page = 1
  loadUsers()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadUsers()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadUsers()
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  userForm.id = ''
  userForm.username = ''
  userForm.email = ''
  userForm.password = ''
  userForm.role = 'user'
  userForm.bio = ''
  userForm.isActive = true
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑用户'
  userForm.id = row._id
  userForm.username = row.username
  userForm.email = row.email
  userForm.role = row.role
  userForm.bio = row.bio || ''
  userForm.isActive = row.isActive
  dialogVisible.value = true
}

const handleToggleStatus = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.isActive ? '禁用' : '启用'}用户 "${row.username}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await toggleUserStatus(row._id)
    ElMessage.success(`用户状态已${row.isActive ? '禁用' : '启用'}`)
    loadUsers()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('切换用户状态失败:', e)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${row.username}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteUser(row._id)
    ElMessage.success('用户删除成功')
    loadUsers()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除用户失败:', e)
    }
  }
}

const handleSubmit = async () => {
  if (!userFormRef.value) return
  
  const valid = await userFormRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value) {
      await updateUser(userForm.id, {
        username: userForm.username,
        role: userForm.role,
        bio: userForm.bio,
        isActive: userForm.isActive
      })
      ElMessage.success('用户更新成功')
    } else {
      await createUser({
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role
      })
      ElMessage.success('用户创建成功')
    }
    dialogVisible.value = false
    loadUsers()
    loadStats()
  } catch (e) {
    console.error('保存用户失败:', e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadStats()
  loadUsers()
})
</script>

<style scoped lang="scss">
.user-management-page {
  .page-container {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 20px;

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #f5f7fa;
      border-radius: 10px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 24px;
        flex-shrink: 0;
      }

      .stat-content {
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: #909399;
        }
      }
    }
  }

  .search-bar {
    margin-bottom: 20px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
  }

  .pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
}

@media screen and (max-width: 1200px) {
  .user-management-page .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .user-management-page {
    .page-container {
      padding: 15px;
    }

    .stats-row {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;

      .stat-card {
        padding: 15px;
        
        .stat-icon {
          width: 40px;
          height: 40px;
          font-size: 18px;
        }

        .stat-content {
          .stat-value {
            font-size: 20px;
          }
        }
      }
    }

    .search-bar {
      :deep(.el-form-item) {
        display: block;
        margin-right: 0;
        margin-bottom: 10px;
      }
    }
  }
}
</style>
