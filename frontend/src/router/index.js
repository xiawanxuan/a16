import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: '注册', requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Dashboard.vue'),
        meta: { title: '概览仪表盘', icon: 'DataAnalysis' }
      },
      {
        path: 'papers',
        name: 'Papers',
        component: () => import('@/views/papers/PaperList.vue'),
        meta: { title: '论文管理', icon: 'Document' }
      },
      {
        path: 'upload',
        name: 'Upload',
        component: () => import('@/views/upload/UploadPage.vue'),
        meta: { title: '文献导入', icon: 'Upload' }
      },
      {
        path: 'cooperation',
        name: 'Cooperation',
        component: () => import('@/views/analysis/CooperationNetwork.vue'),
        meta: { title: '合作网络', icon: 'Connection' }
      },
      {
        path: 'citation',
        name: 'Citation',
        component: () => import('@/views/analysis/CitationAnalysis.vue'),
        meta: { title: '被引分析', icon: 'TrendCharts' }
      },
      {
        path: 'trends',
        name: 'Trends',
        component: () => import('@/views/analysis/KeywordTrends.vue'),
        meta: { title: '热点趋势', icon: 'Histogram' }
      },
      {
        path: 'authors',
        name: 'Authors',
        component: () => import('@/views/analysis/AuthorProductivity.vue'),
        meta: { title: '作者分析', icon: 'User' }
      },
      {
        path: 'journals',
        name: 'Journals',
        component: () => import('@/views/analysis/JournalAnalysis.vue'),
        meta: { title: '期刊分析', icon: 'Reading' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/user/Profile.vue'),
        meta: { title: '个人中心', icon: 'Avatar' }
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: { title: '用户管理', icon: 'UserFilled', roles: ['admin'] }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = localStorage.getItem('token')

  document.title = to.meta.title 
    ? `${to.meta.title} - 文献计量分析平台` 
    : '文献计量与合作网络分析平台'

  if (to.meta.requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (token && (to.path === '/login' || to.path === '/register')) {
    next('/')
    return
  }

  if (to.meta.roles && to.meta.roles.length > 0) {
    if (!userStore.user || !to.meta.roles.includes(userStore.user.role)) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
