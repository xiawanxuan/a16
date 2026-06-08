<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-left">
        <div class="brand">
          <el-icon class="brand-icon"><DataAnalysis /></el-icon>
          <h1 class="brand-title">文献计量与合作网络分析平台</h1>
          <p class="brand-desc">开启您的科研文献分析之旅</p>
        </div>
      </div>
      <div class="register-right">
        <div class="register-form-wrap">
          <h2 class="form-title">创建账号</h2>
          <p class="form-subtitle">填写信息完成注册</p>
          
          <el-form 
            ref="registerFormRef" 
            :model="registerForm" 
            :rules="registerRules" 
            class="register-form"
          >
            <el-form-item prop="username">
              <el-input
                v-model="registerForm.username"
                placeholder="请输入用户名"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="email">
              <el-input
                v-model="registerForm.email"
                placeholder="请输入邮箱"
                size="large"
                :prefix-icon="Message"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码（至少6位）"
                size="large"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请确认密码"
                size="large"
                :prefix-icon="Lock"
                show-password
                @keyup.enter="handleRegister"
              />
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                class="register-btn" 
                :loading="loading"
                @click="handleRegister"
              >
                注 册
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="form-footer">
            <span>已有账号？</span>
            <router-link to="/login" class="login-link">立即登录</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref(null)
const loading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
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
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  const success = await userStore.handleRegister({
    username: registerForm.username,
    email: registerForm.email,
    password: registerForm.password
  })
  
  loading.value = false
  
  if (success) {
    router.push('/dashboard')
  }
}
</script>

<style scoped lang="scss">
.register-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.register-box {
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 600px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.register-left {
  flex: 1;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 60px 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.brand {
  .brand-icon {
    font-size: 64px;
    color: #409eff;
    margin-bottom: 24px;
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
  }
}

.register-right {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.register-form-wrap {
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

.register-form {
  .el-form-item {
    margin-bottom: 20px;
  }
}

.register-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.form-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #606266;

  .login-link {
    color: #409eff;
    text-decoration: none;
    margin-left: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media screen and (max-width: 768px) {
  .register-box {
    flex-direction: column;
    min-height: auto;
  }

  .register-left {
    padding: 40px 30px;
    
    .brand-title {
      font-size: 20px;
    }
  }

  .register-right {
    padding: 40px 30px;
  }

  .form-title {
    font-size: 24px;
  }
}
</style>
