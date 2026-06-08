<template>
  <el-container class="main-layout">
    <el-aside 
      :width="isCollapse ? '64px' : '220px'" 
      class="sidebar"
      :class="{ 'sidebar-collapse': isCollapse }"
    >
      <div class="logo">
        <el-icon class="logo-icon"><DataAnalysis /></el-icon>
        <span v-show="!isCollapse" class="logo-text">文献计量平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        class="sidebar-menu"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409eff"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item v-if="!item.hidden" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
          <el-sub-menu v-if="item.children" :index="item.path">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item 
              v-for="child in item.children" 
              :key="child.path" 
              :index="child.path"
            >
              {{ child.title }}
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :icon="UserFilled">
                {{ user?.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <span class="username">{{ user?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item v-if="isAdmin" command="users">
                  <el-icon><UserFilled /></el-icon>用户管理
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const user = computed(() => userStore.user)
const isAdmin = computed(() => userStore.isAdmin)
const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title || '')

const menuItems = computed(() => {
  const baseMenu = [
    { path: '/dashboard', title: '概览仪表盘', icon: 'DataAnalysis' },
    { path: '/papers', title: '论文管理', icon: 'Document' },
    { path: '/upload', title: '文献导入', icon: 'Upload' },
    { path: '/cooperation', title: '合作网络', icon: 'Connection' },
    { path: '/citation', title: '被引分析', icon: 'TrendCharts' },
    { path: '/trends', title: '热点趋势', icon: 'Histogram' },
    { path: '/authors', title: '作者分析', icon: 'User' },
    { path: '/journals', title: '期刊分析', icon: 'Reading' }
  ]
  
  if (isAdmin.value) {
    baseMenu.push({ 
      path: '/admin/users', 
      title: '用户管理', 
      icon: 'UserFilled' 
    })
  }
  
  return baseMenu
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'users':
      router.push('/admin/users')
      break
    case 'logout':
      userStore.handleLogout()
      router.push('/login')
      break
  }
}

const handleResize = () => {
  if (window.innerWidth < 768) {
    isCollapse.value = true
  }
}

onMounted(() => {
  if (!userStore.user && userStore.token) {
    userStore.fetchProfile()
  }
  window.addEventListener('resize', handleResize)
  handleResize()
})

watch(() => route.path, () => {
  if (window.innerWidth < 768) {
    isCollapse.value = true
  }
})
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #001529;
  transition: width 0.3s ease;
  overflow-x: hidden;

  &.sidebar-collapse {
    width: 64px !important;
  }
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .logo-icon {
    font-size: 28px;
    color: #409eff;
  }

  .logo-text {
    margin-left: 10px;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }
}

.sidebar-menu {
  border-right: none;
  height: calc(100vh - 60px);

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 50px;
    line-height: 50px;
  }

  :deep(.el-menu-item.is-active) {
    background-color: rgba(64, 158, 255, 0.2);
  }
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;

  &:hover {
    color: #409eff;
  }
}

.breadcrumb {
  margin-left: 10px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 0 10px;
  height: 40px;
  border-radius: 6px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f5f7fa;
  }

  .username {
    font-size: 14px;
    color: #606266;
  }
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media screen and (max-width: 768px) {
  .header {
    padding: 0 10px;
  }

  .main-content {
    padding: 10px;
  }

  .user-info .username {
    display: none;
  }

  .breadcrumb {
    display: none;
  }
}
</style>
