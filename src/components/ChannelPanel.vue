<template>
  <div class="channel-panel">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>📍 {{ title }}</span>
          <el-tag
            v-if="channelInfo.isRunning"
            type="success"
            size="small"
          >
            运行中
          </el-tag>
          <el-tag
            v-else
            type="info"
            size="small"
          >
            已停止
          </el-tag>
        </div>
      </template>

      <!-- 横向排列的泵控制 -->
      <el-row :gutter="12">
        <el-col :span="8">
          <PumpControl
            :channel="channel"
            :pump-type="0"
            name="气泵"
            icon="💨"
          />
        </el-col>

        <el-col :span="8">
          <PumpControl
            :channel="channel"
            :pump-type="1"
            name="液泵1"
            icon="💧"
          />
        </el-col>

        <el-col :span="8">
          <PumpControl
            :channel="channel"
            :pump-type="2"
            name="液泵2"
            icon="💧"
          />
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDeviceStore } from '@/stores/device'
import PumpControl from './PumpControl.vue'

const props = defineProps({
  channel: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
})

const deviceStore = useDeviceStore()
const channelInfo = computed(() => deviceStore.channels[props.channel])
</script>

<style scoped>
.channel-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
}
</style>
