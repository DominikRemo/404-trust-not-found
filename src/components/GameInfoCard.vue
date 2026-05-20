<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameEngine } from '../composables/useGameEngine.js'

const { t } = useI18n()
const {
  badDevRange, totalFeatures, totalBugs,
  mergedFeatures, mergedBugs,
} = useGameEngine()

const badDevLabel = computed(() => {
  if (!badDevRange.value) return '—'
  const { min, max } = badDevRange.value
  return min === max ? String(min) : `${min}–${max}`
})
</script>

<template>
  <div class="info-card bg-surface border border-border rounded-xl shadow-sm px-4 py-3 flex flex-col gap-2.5 min-w-[180px]">
    <div class="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
      {{ t('infoCard.title') }}
    </div>

    <!-- Bad dev range -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-red-400 shrink-0" />
        <span class="text-xs text-ink-dim">{{ t('infoCard.badDevs') }}</span>
      </div>
      <span class="text-xs font-bold text-red-600 tabular-nums">{{ badDevLabel }}</span>
    </div>

    <!-- Features merged -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
        <span class="text-xs text-ink-dim">{{ t('infoCard.featuresMerged') }}</span>
      </div>
      <span class="text-xs font-bold text-blue-600 tabular-nums">
        {{ mergedFeatures }}
        <span class="font-normal text-ink-faint">/ {{ totalFeatures }}</span>
      </span>
    </div>

    <!-- Bugs merged -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-1.5">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="mergedBugs > 0 ? 'bg-amber-400' : 'bg-green-400'"
        />
        <span class="text-xs text-ink-dim">{{ t('infoCard.bugsMerged') }}</span>
      </div>
      <span
        class="text-xs font-bold tabular-nums"
        :class="mergedBugs > 0 ? 'text-amber-600' : 'text-green-600'"
      >
        {{ mergedBugs }}
        <span class="font-normal text-ink-faint">/ {{ totalBugs }}</span>
      </span>
    </div>
  </div>
</template>
