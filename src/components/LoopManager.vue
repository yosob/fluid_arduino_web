<template>
  <div class="loop-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>🔄 循环模式</span>
        </div>
      </template>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <el-button
          type="primary"
          :icon="Plus"
          @click="showAddDialog = true"
        >
          添加
        </el-button>

        <el-button
          type="success"
          :icon="VideoPlay"
          :disabled="sequence.length === 0 || isRunning"
          @click="handleStart"
        >
          开始
        </el-button>

        <el-button
          type="warning"
          :icon="VideoPause"
          :disabled="!isRunning || isPaused"
          @click="handlePause"
        >
          暂停
        </el-button>

        <el-button
          type="info"
          :icon="VideoPlay"
          :disabled="!isPaused"
          @click="handleResume"
        >
          继续
        </el-button>

        <el-button
          type="danger"
          :icon="CircleClose"
          :disabled="!isRunning && !isPaused"
          @click="handleStop"
        >
          停止
        </el-button>

        <el-button
          :icon="Delete"
          @click="handleClear"
        >
          清空
        </el-button>
      </div>

      <!-- 序列表 -->
      <div class="sequence-list">
        <el-table
          :data="sequence"
          border
          style="width: 100%"
        >
          <el-table-column
            type="index"
            label="序号"
            width="60"
          />

          <el-table-column
            prop="channel"
            label="通道"
            width="80"
          >
            <template #default="{ row }">
              {{ getChannelName(row.channel) }}
            </template>
          </el-table-column>

          <el-table-column
            prop="pumpType"
            label="泵类型"
            width="100"
          >
            <template #default="{ row }">
              {{ getPumpTypeName(row.pumpType) }}
            </template>
          </el-table-column>

          <el-table-column
            prop="pwm"
            label="PWM"
            width="80"
          />

          <el-table-column
            prop="time"
            label="时间(ms)"
            width="100"
          />

          <el-table-column
            label="操作"
            width="80"
          >
            <template #default="{ row }">
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleRemoveStep(row.id)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 执行进度 -->
      <div
        v-if="isRunning || isPaused"
        class="progress-info"
      >
        <el-divider />

        <div class="progress-item">
          <span class="label">执行进度:</span>
          <el-progress
            :percentage="progressPercent"
            :format="() => `${currentIndex}/${totalSteps}条`"
          />
        </div>

        <div class="progress-item">
          <span class="label">循环次数:</span>
          <span class="value">{{ loopCountText }}</span>
        </div>

        <div class="progress-item">
          <el-tag
            v-if="isPaused"
            type="warning"
          >
            已暂停
          </el-tag>
          <el-tag
            v-else
            type="success"
          >
            执行中
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 添加对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="添加循环时序指令"
      width="500px"
    >
      <el-form :model="form">
        <el-form-item label="通道">
          <el-radio-group v-model="form.channel">
            <el-radio :label="1">CH1</el-radio>
            <el-radio :label="2">CH2</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="泵类型">
          <el-radio-group v-model="form.pumpType">
            <el-radio :label="0">气泵</el-radio>
            <el-radio :label="1">液泵1</el-radio>
            <el-radio :label="2">液泵2</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="PWM值">
          <el-slider
            v-model="form.pwm"
            :min="0"
            :max="255"
            show-input
          />
        </el-form-item>

        <el-form-item label="持续时间(ms)">
          <el-input-number
            v-model="form.time"
            :min="100"
            :max="65535"
            :step="100"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleAddStep"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useLoopControl } from '@/composables/useLoopControl'
import { useLoopStore } from '@/stores/loop'
import { storeToRefs } from 'pinia'
import {
  Plus,
  Delete,
  VideoPlay,
  VideoPause,
  CircleClose
} from '@element-plus/icons-vue'

const loopControl = useLoopControl()
const loopStore = useLoopStore()
const {
  sequence,
  isRunning,
  isPaused,
  currentIndex,
  totalSteps,
  loopCount,
  totalLoops
} = storeToRefs(loopStore)

const showAddDialog = ref(false)
const form = ref({
  channel: 1,
  pumpType: 0,
  pwm: 128,
  time: 1000
})

const progressPercent = computed(() => loopStore.getProgressPercent())
const loopCountText = computed(() => loopStore.getLoopCountText())

async function handleAddStep() {
  const success = await loopControl.addLoopStep(
    form.value.channel,
    form.value.pumpType,
    form.value.pwm,
    form.value.time
  )

  if (success) {
    showAddDialog.value = false
    // 重置表单
    form.value = {
      channel: 1,
      pumpType: 0,
      pwm: 128,
      time: 1000
    }
  }
}

function handleRemoveStep(id) {
  loopControl.removeLoopStep(id)
}

async function handleStart() {
  const loopCount = 0 // 无限循环
  await loopControl.startLoop(loopCount)
}

async function handlePause() {
  await loopControl.pauseLoop()
}

async function handleResume() {
  await loopControl.resumeLoop()
}

async function handleStop() {
  await loopControl.stopLoop()
}

async function handleClear() {
  await loopControl.clearLoop()
}

function getChannelName(channel) {
  return `CH${channel}`
}

function getPumpTypeName(pumpType) {
  const names = ['气泵', '液泵1', '液泵2']
  return names[pumpType] || '未知'
}
</script>

<style scoped>
.loop-manager {
  margin-bottom: 20px;
}

.card-header {
  font-weight: bold;
  font-size: 18px;
}

.control-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.sequence-list {
  margin-bottom: 20px;
}

.progress-info {
  margin-top: 20px;
}

.progress-item {
  margin-bottom: 15px;
}

.label {
  font-weight: 500;
  margin-right: 10px;
}

.value {
  font-family: monospace;
  color: #409eff;
}
</style>
