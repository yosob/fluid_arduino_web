<template>
  <div class="channel-timeline">
    <div class="channel-header">
      <span class="channel-name">💨 气泵 💧 液泵1 💧 液泵2</span>
      <el-button size="small" type="primary" @click="addSegment">
        + 添加段
      </el-button>
    </div>

    <div class="timeline-container" ref="timelineRef">
      <!-- 时间刻度 -->
      <TimeRuler :duration="config.totalDuration" :interval="config.interval" />

      <!-- 时间轴轨道 -->
      <div class="timeline-track" :style="{ width: trackWidth }">
        <!-- 时间段块 -->
        <div
          v-for="segment in displaySegments"
          :key="segment.id"
          class="time-segment"
          :class="getSegmentClass(segment.pump)"
          :style="getSegmentStyle(segment)"
          @click="handleClick($event, segment)"
          @mousedown="handleMouseDown($event, segment)"
        >
          <!-- 左边界拖拽手柄 -->
          <div
            class="resize-handle resize-handle-left"
            @mousedown.stop="handleResizeStart($event, segment, 'left')"
          />

          <!-- 右边界拖拽手柄 -->
          <div
            class="resize-handle resize-handle-right"
            @mousedown.stop="handleResizeStart($event, segment, 'right')"
          />

          <!-- 内容区域 -->
          <div class="segment-content">
            <span class="segment-icon">{{ getPumpIcon(segment.pump) }}</span>
            <span class="segment-info">
              {{ getPumpName(segment.pump) }}
              <br />
              PWM: {{ segment.pwm }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import TimeRuler from "./TimeRuler.vue";
import { useTimelineStore } from "@/stores/timeline";

const props = defineProps({
  channel: {
    type: String,
    required: true,
    validator: (value) => ["ch1", "ch2"].includes(value),
  },
  config: {
    type: Object,
    required: true,
  },
  segments: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["segment-click", "segment-update"]);

const timelineStore = useTimelineStore();
const timelineRef = ref(null);

// 拖拽状态
const isDragging = ref(false);
const dragType = ref(""); // 'left', 'right', 'move'
const dragSegment = ref(null);
const dragStartX = ref(0);
const dragStart = ref(0);
const dragEnd = ref(0);
const originalSegment = ref(null); // 保存原始状态用于恢复

// 拖拽过程中的临时值（用于显示）
const tempStart = ref(0);
const tempEnd = ref(0);

// 用于区分点击和拖拽
const mouseDownTime = ref(0);
const mouseDownX = ref(0); // 记录鼠标按下的初始位置

// 计算显示的时间段（拖拽时使用临时值）
const displaySegments = computed(() => {
  return props.segments.map((seg) => {
    if (
      isDragging.value &&
      dragSegment.value &&
      seg.id === dragSegment.value.id
    ) {
      // 返回使用临时值的时间段
      return {
        ...seg,
        start: tempStart.value,
        end: tempEnd.value,
      };
    }
    return seg;
  });
});

// 轨道宽度（基于总时长）
const trackWidth = computed(() => {
  const minWidth = 800;
  const pixelsPerSecond = 80;
  return `${Math.max(minWidth, props.config.totalDuration * pixelsPerSecond)}px`;
});

// 获取时间段样式
function getSegmentStyle(segment) {
  const pixelsPerSecond = 80;
  const left = segment.start * pixelsPerSecond;
  const width = (segment.end - segment.start) * pixelsPerSecond;

  return {
    left: `${left}px`,
    width: `${width}px`,
  };
}

// 获取时间段类名
function getSegmentClass(pump) {
  return {
    "segment-air": pump === "air",
    "segment-water1": pump === "water1",
    "segment-water2": pump === "water2",
    "segment-off": pump === "off",
  };
}

// 获取泵图标
function getPumpIcon(pump) {
  const icons = {
    air: "💨",
    water1: "💧",
    water2: "💧",
    off: "⏹️",
  };
  return icons[pump] || "⏹️";
}

// 获取泵名称
function getPumpName(pump) {
  const names = {
    air: "气泵",
    water1: "液泵1",
    water2: "液泵2",
    off: "停止",
  };
  return names[pump] || "未知";
}

// 处理单击
function handleClick(event, segment) {
  // 计算鼠标从按下到抬起的移动距离
  const moveDistance = Math.abs(event.clientX - mouseDownX.value);

  // 如果移动距离超过5像素，认为是拖拽操作，不打开编辑器
  if (moveDistance > 5) {
    return;
  }

  // 否则打开编辑器
  emit("segment-click", { channel: props.channel, segment });
}

// 添加新段
function addSegment() {
  // 找到第一个空闲时间段
  const segments = props.segments || [];
  let startTime = 0;

  // 按开始时间排序
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

  // 找到第一个空闲位置
  for (const seg of sortedSegments) {
    if (startTime < seg.start) {
      // 找到空闲位置
      break;
    }
    startTime = seg.end + 0.5; // 留0.5秒间隙
  }

  // 如果超出总时长，提示用户
  if (startTime >= props.config.totalDuration) {
    ElMessage.warning("时间轴已满，请先删除一些时间段");
    return;
  }

  const endTime = Math.min(startTime + 1, props.config.totalDuration);

  const newSegment = {
    start: Math.round(startTime * 10) / 10,
    end: Math.round(endTime * 10) / 10,
    pump: "off",
    pwm: 0,
  };

  emit("segment-update", { channel: props.channel, segment: newSegment });
}

// 开始调整大小
function handleResizeStart(event, segment, type) {
  event.preventDefault();
  isDragging.value = true;
  dragType.value = type;
  dragSegment.value = segment;
  dragStartX.value = event.clientX;
  dragStart.value = segment.start;
  dragEnd.value = segment.end;

  // 初始化临时值
  tempStart.value = segment.start;
  tempEnd.value = segment.end;

  // 保存原始状态
  originalSegment.value = { ...segment };

  // 添加全局事件监听
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

// 开始移动
function handleMouseDown(event, segment) {
  // 只在点击内容区域时触发移动，不是在手柄上
  if (event.target.classList.contains("resize-handle")) {
    return;
  }

  // 记录鼠标按下的初始位置和时间
  mouseDownX.value = event.clientX;
  mouseDownTime.value = Date.now();

  event.preventDefault();
  isDragging.value = true;
  dragType.value = "move";
  dragSegment.value = segment;
  dragStartX.value = event.clientX;
  dragStart.value = segment.start;
  dragEnd.value = segment.end;

  // 初始化临时值
  tempStart.value = segment.start;
  tempEnd.value = segment.end;

  // 保存原始状态
  originalSegment.value = { ...segment };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

// 鼠标移动
function handleMouseMove(event) {
  if (!isDragging.value) return;

  const pixelsPerSecond = 80;
  const deltaX = event.clientX - dragStartX.value;
  const deltaTime = deltaX / pixelsPerSecond;

  if (dragType.value === "left") {
    // 调整左边界（开始时间）
    const newStart = Math.max(0, dragStart.value + deltaTime);
    const minEnd = newStart + 0.1;

    tempStart.value = Math.round(newStart * 10) / 10;
    tempEnd.value = Math.max(
      Math.round(dragEnd.value * 10) / 10,
      Math.round(minEnd * 10) / 10
    );
  } else if (dragType.value === "right") {
    // 调整右边界（结束时间）
    const newEnd = Math.min(
      props.config.totalDuration,
      dragEnd.value + deltaTime
    );

    tempStart.value = Math.round(dragStart.value * 10) / 10;
    tempEnd.value = Math.max(
      Math.round(newEnd * 10) / 10,
      Math.round((dragStart.value + 0.1) * 10) / 10
    );
  } else if (dragType.value === "move") {
    // 移动整个时间段
    const duration = dragEnd.value - dragStart.value;
    let newStart = dragStart.value + deltaTime;
    let newEnd = dragEnd.value + deltaTime;

    // 边界检查
    if (newStart < 0) {
      newStart = 0;
      newEnd = duration;
    }
    if (newEnd > props.config.totalDuration) {
      newEnd = props.config.totalDuration;
      newStart = newEnd - duration;
    }

    tempStart.value = Math.round(newStart * 10) / 10;
    tempEnd.value = Math.round(newEnd * 10) / 10;
  }
}

// 鼠标松开
function handleMouseUp() {
  if (!isDragging.value) return;

  // 鼠标松开时才真正更新到 store（检查重叠）
  if (dragSegment.value && originalSegment.value) {
    // 检查位置是否真的改变了
    if (
      tempStart.value !== originalSegment.value.start ||
      tempEnd.value !== originalSegment.value.end
    ) {
      // 尝试更新到新位置
      const result = timelineStore.updateSegment(
        props.channel,
        originalSegment.value.id,
        {
          start: tempStart.value,
          end: tempEnd.value,
          pump: originalSegment.value.pump,
          pwm: originalSegment.value.pwm,
        }
      );

      // 如果更新失败（重叠），自动吸附
      if (!result.success) {
        // 获取所有时间段（不包括自己）
        const allSegments = props.segments.filter(
          (s) => s.id !== originalSegment.value.id
        );

        // 计算吸附位置
        const snappedPosition = calculateSnapPosition(
          {
            id: originalSegment.value.id,
            start: tempStart.value,
            end: tempEnd.value,
          },
          allSegments
        );

        // 应用吸附后的位置
        timelineStore.updateSegment(props.channel, originalSegment.value.id, {
          start: snappedPosition.start,
          end: snappedPosition.end,
          pump: originalSegment.value.pump,
          pwm: originalSegment.value.pwm,
        });

        ElMessage.success("已自动吸附到相邻时间段");
      }
    }
  }

  // 延迟重置拖拽状态，防止误触发单击
  setTimeout(() => {
    isDragging.value = false;
  }, 200);

  dragType.value = "";
  dragSegment.value = null;
  dragStartX.value = 0;
  dragStart.value = 0;
  dragEnd.value = 0;
  originalSegment.value = null;
  tempStart.value = 0;
  tempEnd.value = 0;

  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}

// 计算吸附位置
function calculateSnapPosition(segment, otherSegments) {
  const segmentDuration = segment.end - segment.start;
  let bestPosition = null;
  let minDistance = Infinity;

  // 检查每个其他时间段的左侧和右侧间隙
  for (const other of otherSegments) {
    // 检查左侧间隙（放在其他时间段左边）
    const leftGapEnd = other.start;
    const leftGapStart = Math.max(0, leftGapEnd - segmentDuration);

    if (leftGapEnd - leftGapStart >= segmentDuration) {
      // 可以放在左边
      const distance = Math.abs(segment.end - leftGapEnd);
      if (distance < minDistance) {
        minDistance = distance;
        bestPosition = {
          start: Math.round((leftGapEnd - segmentDuration) * 10) / 10,
          end: Math.round(leftGapEnd * 10) / 10,
        };
      }
    }

    // 检查右侧间隙（放在其他时间段右边）
    const rightGapStart = other.end;
    const rightGapEnd = Math.min(
      props.config.totalDuration,
      rightGapStart + segmentDuration
    );

    if (rightGapEnd - rightGapStart >= segmentDuration) {
      // 可以放在右边
      const distance = Math.abs(segment.start - rightGapStart);
      if (distance < minDistance) {
        minDistance = distance;
        bestPosition = {
          start: Math.round(rightGapStart * 10) / 10,
          end: Math.round((rightGapStart + segmentDuration) * 10) / 10,
        };
      }
    }
  }

  // 如果没有找到合适的位置，保持原位（但这种情况不应该发生）
  if (!bestPosition) {
    return {
      start: segment.start,
      end: segment.end,
    };
  }

  return bestPosition;
}
</script>

<style scoped>
.channel-timeline {
  margin-bottom: 20px;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.channel-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.timeline-container {
  overflow-x: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  background: #f5f7fa;
}

.timeline-track {
  position: relative;
  min-height: 60px;
  background: white;
  border-radius: 4px;
}

.time-segment {
  position: absolute;
  top: 5px;
  bottom: 5px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  user-select: none;
}

.time-segment:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.time-segment:hover .resize-handle {
  opacity: 1;
}

/* 拖拽手柄 */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  background: rgba(255, 255, 255, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
  cursor: col-resize;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.6);
}

.resize-handle-left {
  left: 0;
  border-radius: 4px 0 0 4px;
}

.resize-handle-right {
  right: 0;
  border-radius: 0 4px 4px 0;
}

/* 不同泵的样式 */
.segment-air {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.segment-water1 {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.segment-water2 {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  color: white;
}

.segment-off {
  background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
  color: white;
}

.segment-content {
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
}

.segment-icon {
  font-size: 18px;
  display: block;
}

.segment-info {
  display: block;
  font-size: 11px;
  opacity: 0.9;
}

.empty-track {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  cursor: pointer;
}

.empty-track:hover {
  color: #409eff;
}
</style>
