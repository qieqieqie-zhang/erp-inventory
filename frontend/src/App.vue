<script setup>
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'
import { useShopStore } from './stores/shop'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const shopStore = useShopStore()
const router = useRouter()

// 初始化用户状态和店铺列表
onMounted(async () => {
  await Promise.all([
    userStore.init(),
    shopStore.loadShops()
  ])
})
</script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
