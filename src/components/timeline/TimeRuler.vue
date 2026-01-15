<template>
  <div class="time-ruler">
    <div class="ruler-track" :style="{ width: trackWidth }">
      <!-- 刻度线和标签 -->
      <div
        v-for="(mark, index) in marks"
        :key="index"
        class="ruler-mark"
        :class="{ 'major-mark': mark.major, 'minor-mark': !mark.major }"
        :style="{ left: mark.position }"
      >
        <div class="mark-line"></div>
        <div v-if="mark.major" class="mark-label">
          {{ mark.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  duration: {
    type: Number,
    required: true,
    default: 10
  },
  interval: {
    type: Number,
    default: 0.5
  }
})

// 轨道宽度
const trackWidth = computed(() => {
  const minWidth = 800
  const pixelsPerSecond = 80
  return `${Math.max(minWidth, props.duration * pixelsPerSecond)}px`
})

// 生成刻度标记
const marks = computed(() => {
  const marks = []
  const pixelsPerSecond = 80

  // 生成每0.5秒一个刻度
  for (let t = 0; t <= props.duration; t += 0.5) {
    const position = `${t * pixelsPerSecond}px`
    const isInteger = Number.isInteger(t)
    const isMajor = isInteger // 整数秒为大刻度

    marks.push({
      position,
      major: isMajor,
      label: `${t}s`
    })
  }

  return marks
})
</script>

<style scoped>
.time-ruler {
  margin-bottom: 10px;
  border-bottom: 1px solid #dcdfe6;
  padding-bottom: 5px;
}

.ruler-track {
  position: relative;
  height: 30px;
}

.ruler-mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}

.mark-line {
  width: 1px;
  background: #909399;
  margin: 0 auto;
}

.major-mark .mark-line {
  height: 20px;
  background: #303133;
}

.minor-mark .mark-line {
  height: 10px;
  background: #c0c4cc;
}

.mark-label {
  margin-top: 5px;
  font-size: 12px;
  color: #606266;
  text-align: center;
  white-space: nowrap;
}
</style>
