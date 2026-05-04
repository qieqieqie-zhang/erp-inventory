import { defineStore } from 'pinia'
import { apiService } from '../utils/api'

const SHOP_STORAGE_KEY = 'global_current_shop_code'

export const useShopStore = defineStore('shop', {
  state: () => ({
    shops: [],
    currentShopId: null,
    currentShopCode: null,
    currentShopName: null,
    isLoading: false
  }),

  getters: {
    hasShopSelected: (state) => state.currentShopCode !== null && state.currentShopCode !== ''
  },

  actions: {
    // 从 localStorage 恢复上次选择的店铺
    restoreShop() {
      const savedShopCode = localStorage.getItem(SHOP_STORAGE_KEY)
      if (savedShopCode) {
        this.currentShopCode = savedShopCode
      }
    },

    // 保存店铺选择到 localStorage
    saveShop(shopCode) {
      if (shopCode) {
        localStorage.setItem(SHOP_STORAGE_KEY, shopCode)
      } else {
        localStorage.removeItem(SHOP_STORAGE_KEY)
      }
    },

    // 加载店铺列表
    async loadShops() {
      this.isLoading = true
      try {
        // 先从 localStorage 恢复上次的店铺选择
        this.restoreShop()

        const res = await apiService.shops.getAllShops()
        if (res && Array.isArray(res)) {
          this.shops = res

          // 如果 currentShopCode 已设置（从 localStorage 恢复），验证是否仍然有效
          if (this.currentShopCode) {
            const exist = this.shops.find(s => s.shop_code === this.currentShopCode)
            if (exist) {
              this.currentShopId = exist.id
              this.currentShopName = exist.shop_name
            } else {
              // 店铺已不存在，清除选择
              this.currentShopCode = null
              this.currentShopId = null
              this.currentShopName = null
              this.saveShop(null)
            }
          }
        }
      } catch (error) {
        console.error('加载店铺列表失败:', error)
      } finally {
        this.isLoading = false
      }
    },

    // 切换店铺
    async switchShop(shopCode) {
      const prevShopCode = this.currentShopCode
      const shop = this.shops.find(s => s.shop_code === shopCode)
      if (shop) {
        this.currentShopId = shop.id
        this.currentShopCode = shop.shop_code
        this.currentShopName = shop.shop_name
        this.saveShop(shop.shop_code)
      } else {
        this.currentShopId = null
        this.currentShopCode = null
        this.currentShopName = null
        this.saveShop(null)
      }

      // 触发全局事件，通知各页面刷新
      window.dispatchEvent(new CustomEvent('shopChanged', {
        detail: { shopCode: this.currentShopCode, prevShopCode }
      }))
    },

    // 获取当前店铺代码（用于API请求）
    getShopCode() {
      return this.currentShopCode
    }
  }
})