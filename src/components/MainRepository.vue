<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameEngine } from '../composables/useGameEngine.js'

const { mainRepo, currentSprint } = useGameEngine()
const { t } = useI18n()

const currentSprintCards = computed(() =>
  mainRepo.value.filter(c => c.sprint === currentSprint.value)
)

const previousSprintGroups = computed(() => {
  const groups = {}
  for (const card of mainRepo.value) {
    if (card.sprint < currentSprint.value) {
      if (!groups[card.sprint]) groups[card.sprint] = []
      groups[card.sprint].push(card)
    }
  }
  return Object.entries(groups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([sprint, cards]) => ({ round: Number(sprint), cards }))
})

function cardTypeClass(type) {
  return { feature: 'merged-card-commit', bug: 'merged-card-error', chore: 'merged-card-panic' }[type] ?? 'merged-card-commit'
}

function cardTypeLabel(type) {
  return { feature: 'FEATURE', bug: 'BUG', chore: 'CHORE' }[type] ?? type.toUpperCase()
}
</script>

<template>
  <div class="main-repo-hub">
    <!-- Title bar -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-white/20">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse shrink-0" />
        <span class="text-white/90 text-[10px] font-black tracking-widest font-mono uppercase leading-none">
          {{ t('board.mainRepo') }}
        </span>
      </div>
      <span class="text-white/40 text-[9px] font-mono leading-none">// ACTIVE</span>
    </div>

    <!-- Current Sprint / Merged Commits -->
    <div class="px-3 pt-2.5 pb-2">
      <div class="text-white/50 text-[9px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-green-400/70 shrink-0" />
        Sprint {{ currentSprint }} · Merged PRs
      </div>
      <TransitionGroup name="hub-enter" tag="div" class="flex gap-2 flex-wrap min-h-[64px] items-center">
        <div
          v-if="!currentSprintCards.length"
          key="empty"
          class="text-white/30 text-[10px] font-mono italic"
        >
          {{ t('board.noCommitsYet') }}
        </div>
        <div
          v-for="card in currentSprintCards"
          :key="card.id"
          class="merged-card"
          :class="cardTypeClass(card.type)"
        >
          <div class="card-type-tag">{{ cardTypeLabel(card.type) }}</div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Previous Sprints (history) -->
    <div v-if="previousSprintGroups.length" class="px-3 pt-2 pb-2.5 border-t border-white/10">
      <div class="text-white/35 text-[9px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-white/25 shrink-0" />
        {{ t('board.previousSprints') }}
      </div>
      <div
        v-for="sprint in previousSprintGroups"
        :key="sprint.round"
        class="flex items-center gap-2 mb-1.5 last:mb-0"
      >
        <span class="text-white/30 text-[9px] font-mono w-12 shrink-0">
          {{ t('board.roundLabel', { n: sprint.round }) }}
        </span>
        <div class="flex gap-1 items-center">
          <div
            v-for="card in sprint.cards"
            :key="card.id"
            class="history-chip"
            :class="cardTypeClass(card.type)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-repo-hub {
  min-width: 260px;
  max-width: 320px;
  background: linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(29, 78, 216, 0.45),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: hub-pulse 3s ease-in-out infinite;
}

@keyframes hub-pulse {
  0%, 100% { box-shadow: 0 8px 32px rgba(29, 78, 216, 0.4), 0 2px 8px rgba(0,0,0,0.2); }
  50%       { box-shadow: 0 8px 48px rgba(29, 78, 216, 0.65), 0 2px 8px rgba(0,0,0,0.2); }
}

.merged-card {
  width: 48px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.card-type-tag {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.history-chip {
  width: 10px;
  height: 14px;
  border-radius: 3px;
  opacity: 0.65;
  flex-shrink: 0;
}

.history-chip.merged-card-commit { background: #4ade80; }
.history-chip.merged-card-error  { background: #f87171; }
.history-chip.merged-card-panic  { background: #94a3b8; }

/* Hub card enter animation */
.hub-enter-enter-active {
  animation: card-hub-in 0.3s ease-out both;
}

@keyframes card-hub-in {
  0%   { opacity: 0; transform: scale(0); }
  70%  { transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
</style>
