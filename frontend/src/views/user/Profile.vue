<template>
  <div class="profile-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">个人中心</h2>
      </div>

      <el-row :gutter="20">
        <el-col :xs="24" :md="8">
          <div class="profile-card">
            <div class="avatar-section">
              <el-avatar :size="100" :icon="UserFilled">
                {{ user?.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <h3 class="username">{{ user?.username }}</h3>
              <el-tag :type="roleTagType" size="small" class="role-tag">
                {{ roleText }}
              </el-tag>
            </div>
            <div class="profile-stats">
              <div class="stat-item">
                <div class="stat-value">{{ userStats.totalPapers }}</div>
                <div class="stat-label">论文数量</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.totalCitations }}</div>
                <div class="stat-label">总被引</div>
              </div>
            </div>
          </div>

          <div class="info-card">
            <h4 class="card-title">账号信息</h4>
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ user?.email }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(user?.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">最后登录</span>
              <span class="info-value">{{ formatDate(user?.lastLoginAt) }}</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :md="16">
          <el-tabs v-model="activeTab" class="profile-tabs">
            <el-tab-pane label="基本信息" name="basic">
              <div class="tab-content">
                <el-form 
                  ref="basicFormRef" 
                  :model="basicForm" 
                  :rules="basicRules" 
                  label-width="100px"
                  class="profile-form"
                >
                  <el-form-item label="用户名" prop="username">
                    <el-input v-model="basicForm.username" placeholder="请输入用户名" />
                  </el-form-item>
                  <el-form-item label="邮箱">
                    <el-input :value="user?.email || ''" disabled />
                  </el-form-item>
                  <el-form-item label="个人简介" prop="bio">
                    <el-input 
                      v-model="basicForm.bio" 
                      type="textarea" 
                      :rows="4" 
                      placeholder="介绍一下自己..."
                      maxlength="500"
                      show-word-limit
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="saving" @click="handleSaveBasic">
                      保存修改
                    </el-button>
                    <el-button @click="handleResetBasic">重置</el-button>
                  </el-form-item>
                </el-form>
              </div>
            </el-tab-pane>

            <el-tab-pane label="修改密码" name="password">
              <div class="tab-content">
                <el-form 
                  ref="passwordFormRef" 
                  :model="passwordForm" 
                  :rules="passwordRules" 
                  label-width="120px"
                  class="profile-form"
                >
                  <el-form-item label="当前密码" prop="currentPassword">
                    <el-input 
                      v-model="passwordForm.currentPassword" 
                      type="password" 
                      placeholder="请输入当前密码"
                      show-password
                    />
                  </el-form-item>
                  <el-form-item label="新密码" prop="newPassword">
                    <el-input 
                      v-model="passwordForm.newPassword" 
                      type="password" 
                      placeholder="请输入新密码（至少6位）"
                      show-password
                    />
                  </el-form-item>
                  <el-form-item label="确认新密码" prop="confirmPassword">
                    <el-input 
                      v-model="passwordForm.confirmPassword" 
                      type="password" 
                      placeholder="请再次输入新密码"
                      show-password
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">
                      修改密码
                    </el-button>
                  </el-form-item>
                </el-form>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateProfile, changePassword } from '@/api/auth'
import { getPaperStats } from '@/api/papers'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const userStore = useUserStore()
const user = computed(() => userStore.user)

const activeTab = ref('basic')
const saving = ref(false)
const changingPassword = ref(false)

const basicFormRef = ref(null)
const passwordFormRef = ref(null)

const basicForm = reactive({
  username: '',
  bio: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const userStats = reactive({
  totalPapers: 0,
  totalCitations: 0
})

const basicRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  bio: [
    { max: 500, message: '个人简介最多500个字符', trigger: 'blur' }
  ]
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const roleText = computed(() => {
  const roleMap = {
    admin: '管理员',
    user: '普通用户',
    viewer: '访客'
  }
  return roleMap[user.value?.role] || '用户'
})

const roleTagType = computed(() => {
  const typeMap = {
    admin: 'danger',
    user: 'primary',
    viewer: 'info'
  }
  return typeMap[user.value?.role] || 'info'
})

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const loadUserStats = async () => {
  try {
    const res = await getPaperStats()
    userStats.totalPapers = res.data.totalPapers || 0
    userStats.totalCitations = res.data.totalCitations || 0
  } catch (e) {
    console.error('加载用户统计失败:', e)
  }
}

const handleSaveBasic = async () => {
  if (!basicFormRef.value) return
  
  const valid = await basicFormRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const res = await updateProfile({
      username: basicForm.username,
      bio: basicForm.bio
    })
    userStore.updateUser(res.user)
    ElMessage.success('个人信息更新成功')
  } catch (e) {
    console.error('更新个人信息失败:', e)
  } finally {
    saving.value = false
  }
}

const handleResetBasic = () => {
  basicForm.username = user.value?.username || ''
  basicForm.bio = user.value?.bio || ''
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  changingPassword.value = true
  try {
    await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    ElMessage.success('密码修改成功')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (e) {
    console.error('修改密码失败:', e)
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  if (user.value) {
    basicForm.username = user.value.username
    basicForm.bio = user.value.bio || ''
  }
  loadUserStats()
})
</script>

<style scoped lang="scss">
.profile-page {
  .page-container {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .page-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }

  .profile-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 30px 20px;
    text-align: center;
    color: #fff;
    margin-bottom: 20px;

    .avatar-section {
      margin-bottom: 20px;

      .username {
        margin: 12px 0 8px 0;
        font-size: 20px;
        font-weight: 600;
      }

      .role-tag {
        margin-top: 4px;
      }
    }

    .profile-stats {
      display: flex;
      justify-content: space-around;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);

      .stat-item {
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.8;
        }
      }
    }
  }

  .info-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 20px;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 16px 0;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ebeef5;
      font-size: 13px;

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        color: #909399;
      }

      .info-value {
        color: #303133;
        font-weight: 500;
      }
    }
  }

  .profile-tabs {
    background: #fff;
    border-radius: 8px;
    padding: 0 20px;

    :deep(.el-tabs__header) {
      margin-bottom: 20px;
    }

    .tab-content {
      padding: 10px 0;
    }
  }

  .profile-form {
    max-width: 500px;
  }
}

@media screen and (max-width: 768px) {
  .profile-page {
    .page-container {
      padding: 15px;
    }

    .profile-card {
      padding: 20px 15px;
    }

    .profile-form {
      :deep(.el-form-item__label) {
        width: 80px !important;
      }
    }
  }
}
</style>
