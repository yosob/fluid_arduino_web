<template>
  <div class="loop-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>🔄 循环模式 - 双通道独立编程</span>
        </div>
      </template>

      <!-- 统一控制按钮 -->
      <div class="unified-controls">
        <el-button
          type="success"
          :icon="VideoPlay"
          :disabled="(ch1Sequence.length === 0 && ch2Sequence.length === 0) || isRunning"
          @click="handleStart"
        >
          开始执行
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
          清空所有
        </el-button>

        <div class="loop-count-setting">
          <span>循环次数:</span>
          <el-input-number
            v-model="loopCountSetting"
            :min="0"
            :max="255"
            :step="1"
            controls-position="right"
          />
          <span>(0 = 无限循环)</span>
        </div>
      </div>

      <el-divider />

      <!-- 双通道序列编辑 -->
      <div class="dual-channel-editor">
        <!-- 通道1 -->
        <div class="channel-editor ch1">
          <div class="channel-header">
            <h4>📍 通道 1 (CH1)</h4>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="showAddDialog('ch1')"
            >
              添加指令
            </el-button>
          </div>

          <!-- CH1 序列表 -->
          <el-table
            :data="ch1Sequence"
            border
            size="small"
            style="width: 100%"
            max-height="300"
          >
            <el-table-column
              type="index"
              label="序号"
              width="60"
            />

            <el-table-column
              prop="pumpType"
              label="泵"
              width="80"
            >
              <template #default="{ row }">
                {{ getPumpTypeName(row.pumpType) }}
              </template>
            </el-table-column>

            <el-table-column
              prop="pwm"
              label="PWM"
              width="70"
            />

            <el-table-column
              prop="time"
              label="时间(ms)"
              width="90"
            />

            <el-table-column
              label="操作"
              width="60"
            >
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="handleRemoveStep('ch1', row.id)"
                />
              </template>
            </el-table-column>
          </el-table>

          <!-- CH1 状态显示 -->
          <div
            v-if="loopStatus && loopStatus.ch1"
            class="channel-status"
          >
            <div class="status-item">
              <span class="label">状态:</span>
              <el-tag
                :type="getStatusTagType(loopStatus.ch1.state)"
                size="small"
              >
                {{ getStatusText(loopStatus.ch1.state) }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="label">进度:</span>
              <span class="value">{{ loopStatus.ch1.current }} / {{ loopStatus.ch1.total }}</span>
            </div>
            <div class="status-item">
              <span class="label">循环:</span>
              <span class="value">{{ loopStatus.ch1.loopCount }} / {{ loopStatus.ch1.maxLoops === 0 ? '∞' : loopStatus.ch1.maxLoops }}</span>
            </div>
          </div>
        </div>

        <!-- 通道2 -->
        <div class="channel-editor ch2">
          <div class="channel-header">
            <h4>📍 通道 2 (CH2)</h4>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="showAddDialog('ch2')"
            >
              添加指令
            </el-button>
          </div>

          <!-- CH2 序列表 -->
          <el-table
            :data="ch2Sequence"
            border
            size="small"
            style="width: 100%"
            max-height="300"
          >
            <el-table-column
              type="index"
              label="序号"
              width="60"
            />

            <el-table-column
              prop="pumpType"
              label="泵"
              width="80"
            >
              <template #default="{ row }">
                {{ getPumpTypeName(row.pumpType) }}
              </template>
            </el-table-column>

            <el-table-column
              prop="pwm"
              label="PWM"
              width="70"
            />

            <el-table-column
              prop="time"
              label="时间(ms)"
              width="90"
            />

            <el-table-column
              label="操作"
              width="60"
            >
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="handleRemoveStep('ch2', row.id)"
                />
              </template>
            </el-table-column>
          </el-table>

          <!-- CH2 状态显示 -->
          <div
            v-if="loopStatus && loopStatus.ch2"
            class="channel-status"
          >
            <div class="status-item">
              <span class="label">状态:</span>
              <el-tag
                :type="getStatusTagType(loopStatus.ch2.state)"
                size="small"
              >
                {{ getStatusText(loopStatus.ch2.state) }}
              </el-tag>
            </div>
            <div class="status-item">
              <span class="label">进度:</span>
              <span class="value">{{ loopStatus.ch2.current }} / {{ loopStatus.ch2.total }}</span>
            </div>
            <div class="status-item">
              <span class="label">循环:</span>
              <span class="value">{{ loopStatus.ch2.loopCount }} / {{ loopStatus.ch2.maxLoops === 0 ? '∞' : loopStatus.ch2.maxLoops }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 添加对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="`添加循环指令 - ${currentChannel === 'ch1' ? '通道1 (CH1)' : '通道2 (CH2)'}`"
      width="500px"
    >
      <el-form :model="form">
        <el-form-item label="泵类型">
          <el-radio-group v-model="form.pumpType">
            <el-radio :label="0">气泵 💨</el-radio>
            <el-radio :label="1">液泵1 💧</el-radio>
            <el-radio :label="2">液泵2 💧</el-radio>
            <el-radio :label="255">停止 🛑</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.pumpType !== 255" label="PWM值 (0-255)">
          <el-slider
            v-model="form.pwm"
            :min="0"
            :max="255"
            show-input
          />
        </el-form-item>

        <el-form-item label="持续时间 (ms)">
          <el-input-number
            v-model="form.time"
            :min="100"
            :max="65535"
            :step="100"
            :precision="0"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
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
  totalLoops,
  status: loopStatus
} = storeToRefs(loopStore)

// 分离CH1和CH2的序列
const ch1Sequence = computed(() =>
  sequence.value.filter(step => step.channel === 1)
)

const ch2Sequence = computed(() =>
  sequence.value.filter(step => step.channel === 2)
)

// 对话框状态
const dialogVisible = ref(false)
const currentChannel = ref('ch1')
const loopCountSetting = ref(0) // 0 = 无限循环
const form = ref({
  pumpType: 0,
  pwm: 128,
  time: 1000
})

// 显示添加对话框
function showAddDialog(channel) {
  currentChannel.value = channel
  form.value = {
    pumpType: 0,
    pwm: 128,
    time: 1000
  }
  dialogVisible.value = true
}

// 添加指令
async function handleAddStep() {
  const channelNum = currentChannel.value === 'ch1' ? 1 : 2
  const success = await loopControl.addLoopStep(
    channelNum,
    form.value.pumpType,
    form.value.pwm,
    form.value.time
  )

  if (success) {
    dialogVisible.value = false
  }
}

// 删除指令
function handleRemoveStep(channel, id) {
  loopControl.removeLoopStep(id)
}

// 开始执行
async function handleStart() {
  await loopControl.startLoop(loopCountSetting.value)
}

// 暂停
async function handlePause() {
  await loopControl.pauseLoop()
}

// 继续
async function handleResume() {
  await loopControl.resumeLoop()
}

// 停止
async function handleStop() {
  await loopControl.stopLoop()
}

// 清空所有
async function handleClear() {
  await loopControl.clearLoop()
}

// 获取泵类型名称
function getPumpTypeName(pumpType) {
  if (pumpType === 255) return '停止'
  const names = ['气泵', '液泵1', '液泵2']
  return names[pumpType] || '未知'
}

// 获取状态文本
function getStatusText(state) {
  const statusMap = {
    0: '停止',
    1: '运行中',
    2: '暂停'
  }
  return statusMap[state] || '未知'
}

// 获取状态标签类型
function getStatusTagType(state) {
  const typeMap = {
    0: 'info',
    1: 'success',
    2: 'warning'
  }
  return typeMap[state] || 'info'
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

.unified-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.loop-count-setting {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  font-size: 14px;
}

.loop-count-setting .el-input-number {
  width: 120px;
}

.dual-channel-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.channel-editor {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  background-color: #fafafa;
}

.channel-editor.ch1 {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.channel-editor.ch2 {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

.channel-editor.ch1 .channel-header {
  border-bottom-color: #409eff;
}

.channel-editor.ch2 .channel-header {
  border-bottom-color: #67c23a;
}

.channel-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.channel-status {
  margin-top: 15px;
  padding: 10px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-item .label {
  font-weight: 500;
  color: #606266;
}

.status-item .value {
  font-family: monospace;
  font-weight: bold;
  color: #409eff;
}
</style>
