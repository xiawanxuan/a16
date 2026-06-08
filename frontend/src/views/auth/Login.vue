<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-left">
        <div class="brand">
          <el-icon class="brand-icon"><DataAnalysis /></el-icon>
          <h1 class="brand-title">文献计量与合作网络分析平台</h1>
          <p class="brand-desc">科研论文文献计量分析 · 作者合作网络可视化 · 研究热点趋势洞察</p>
        </div>
        <div class="features">
          <div class="feature-item">
            <el-icon><Document /></el-icon>
            <span>支持BibTeX/CSV等多格式文献批量导入</span>
          </div>
          <div class="feature-item">
            <el-icon><Connection /></el-icon>
            <span>作者合作网络可视化图谱分析</span>
          </div>
          <div class="feature-item">
            <el-icon><TrendCharts /></el-icon>
            <span>文献被引分析与研究热点趋势</span>
          </div>
        </div>
      </div>
      <div class="login-right">
        <div class="login-form-wrap">
          <h2 class="form-title">欢迎登录</h2>
          <p class="form-subtitle">登录您的账号开始分析</p>
          
          <el-form 
            ref="loginFormRef" 
            :model="loginForm" 
            :rules="loginRules" 
            class="login-form"
            @submit.prevent="handleLogin"
          >
            <el-form-item prop="email">
              <el-input
                v-model="loginForm.email"
                placeholder="请输入邮箱"
                size="large"
                :prefix-icon="Message"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                :prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <div class="form-options">
                <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                class="login-btn" 
                :loading="loading"
                @click="handleLogin"
              >
                登 录
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="form-footer">
            <span>还没有账号？</span>
            <router-link to="/register" class="register-link">立即注册</router-link>
          </div>
          
          <div class="demo-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>首次注册的用户自动成为管理员</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  email: '',
  password: '',
  remember: false
})

const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  const success = await userStore.handleLogin({
    email: loginForm.email,
    password: loginForm.password
  })
  
  loading.value = false
  
  if (success) {
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  }
}
</script>

<style scoped lang="scss">
.login-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-box {
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 560px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 60px 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand {
  margin-bottom: 40px;

  .brand-icon {
    font-size: 48px;
    color: #409eff;
    margin-bottom: 16px;
  }

  .brand-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .brand-desc {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
  }
}

.features {
  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);

    .el-icon {
      font-size: 20px;
      color: #409eff;
      flex-shrink: 0;
    }
  }
}

.login-right {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-form-wrap {
  width: 100%;
}

.form-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.form-subtitle {
  font-size: 14px;
  color: #909399;
  margin-bottom: 32px;
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }
}

.form-options {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.form-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #606266;

  .register-link {
    color: #409eff;
    text-decoration: none;
    margin-left: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.demo-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
  padding: 12px;
  background: #ecf5ff;
  border-radius: 8px;
  font-size: 12px;
  color: #409eff;

  .el-icon {
    flex-shrink: 0;
  }
}

@media screen and (max-width: 768px) {
  .login-box {
    flex-direction: column;
    min-height: auto;
  }

  .login-left {
    padding: 40px 30px;
    
    .brand-title {
      font-size: 20px;
    }
    
    .features {
      display: none;
    }
  }

  .login-right {
    padding: 40px 30px;
  }

  .form-title {
    font-size: 24px;
  }
}
</style>
