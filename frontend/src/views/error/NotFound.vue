<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="error-code">
        <span class="code-4">4</span>
        <el-icon class="error-icon"><WarningFilled /></el-icon>
        <span class="code-4">4</span>
      </div>
      <h1 class="error-title">页面未找到</h1>
      <p class="error-desc">抱歉，您访问的页面不存在或已被移除</p>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">
          <el-icon><House /></el-icon>返回首页
        </el-button>
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>返回上一页
        </el-button>
      </div>
      <div class="error-tips">
        <h4>可能的原因：</h4>
        <ul>
          <li>您输入的网址有误</li>
          <li>该页面已被删除或移动</li>
          <li>您没有访问该页面的权限</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss">
.not-found-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.not-found-container {
  text-align: center;
  max-width: 500px;

  .error-code {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 30px;

    .code-4 {
      font-size: 120px;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }

    .error-icon {
      font-size: 80px;
      color: #f56c6c;
      animation: shake 0.5s ease-in-out infinite alternate;
    }
  }

  .error-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
  }

  .error-desc {
    font-size: 15px;
    color: #909399;
    margin-bottom: 30px;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 40px;

    .el-button {
      padding: 12px 24px;
      font-size: 14px;
    }
  }

  .error-tips {
    text-align: left;
    background: #fff;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

    h4 {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        font-size: 13px;
        color: #606266;
        margin-bottom: 8px;
        line-height: 1.5;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

@keyframes shake {
  from {
    transform: rotate(-10deg);
  }
  to {
    transform: rotate(10deg);
  }
}

@media screen and (max-width: 768px) {
  .not-found-container {
    .error-code {
      .code-4 {
        font-size: 80px;
      }

      .error-icon {
        font-size: 60px;
      }
    }

    .error-title {
      font-size: 22px;
    }

    .error-actions {
      flex-direction: column;
      
      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
