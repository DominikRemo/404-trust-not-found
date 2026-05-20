<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameEngine } from '../composables/useGameEngine.js'

const { mainRepo, currentSprint, gameState } = useGameEngine()
const { t } = useI18n()

// During viewing phase keep the just-completed sprint's cards visible as full cards
const visibleFromSprint = computed(() =>
  gameState.value === 'viewing' && currentSprint.value > 1
    ? currentSprint.value - 1
    : currentSprint.value
)

const currentSprintCards = computed(() =>
  mainRepo.value.filter(c => c.sprint >= visibleFromSprint.value)
)

const previousSprintGroups = computed(() => {
  const groups = {}
  for (const card of mainRepo.value) {
    if (card.sprint < visibleFromSprint.value) {
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

function cardImage(type) {
  return `${import.meta.env.BASE_URL}cards/${type}.png`
}
</script>

<template>
  <div class="main-repo-hub">
    <!-- Title bar -->
    <div class="flex items-center justify-between px-5 pt-3 pb-2 border-b border-ink/15">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.55)] animate-pulse shrink-0" />
        <span class="text-ink/85 text-[10px] font-black tracking-widest font-mono uppercase leading-none">
          {{ t('board.mainRepo') }}
        </span>
      </div>
      <span class="text-ink/65 text-[9px] font-mono leading-none">// ACTIVE</span>
    </div>

    <!-- Current Sprint / Merged Commits -->
    <div class="px-5 pt-2.5 pb-2">
      <div class="text-ink/80 text-[9px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-emerald-600/70 shrink-0" />
        Sprint {{ visibleFromSprint }} · Merged PRs
      </div>
      <TransitionGroup name="hub-enter" tag="div" class="flex gap-2 flex-wrap min-h-[64px] items-center">
        <div
          v-if="!currentSprintCards.length"
          key="empty"
          class="text-ink/60 text-[10px] font-mono italic"
        >
          {{ t('board.noCommitsYet') }}
        </div>
        <div
          v-for="card in currentSprintCards"
          :key="card.id"
          class="merged-card relative overflow-hidden"
          :class="cardTypeClass(card.type)"
        >
          <img
            :src="cardImage(card.type)"
            :alt="card.type"
            class="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </TransitionGroup>
    </div>

    <!-- Previous Sprints (history) -->
    <div v-if="previousSprintGroups.length" class="px-5 pt-2 pb-2.5 border-t border-ink/10">
      <div class="text-ink/75 text-[9px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-ink/55 shrink-0" />
        {{ t('board.previousSprints') }}
      </div>
      <div
        v-for="sprint in previousSprintGroups"
        :key="sprint.round"
        class="flex items-center gap-2 mb-1.5 last:mb-0"
      >
        <span class="text-ink/65 text-[9px] font-mono w-12 shrink-0">
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
  position: relative;
  min-width: 260px;
  max-width: 320px;
  background-color: var(--surface-bg);
  border: 1px solid color-mix(in srgb, var(--ink) 50%, transparent);
  border-radius: 14px;
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--ink) 22%, transparent),
    0 2px 4px color-mix(in srgb, var(--ink) 14%, transparent);
  animation: hub-pulse 3.2s ease-in-out infinite;
}

@keyframes hub-pulse {
  0%, 100% { box-shadow: 0 10px 28px color-mix(in srgb, var(--ink) 22%, transparent), 0 2px 4px color-mix(in srgb, var(--ink) 14%, transparent); }
  50%      { box-shadow: 0 12px 36px color-mix(in srgb, var(--ink) 34%, transparent), 0 2px 4px color-mix(in srgb, var(--ink) 14%, transparent); }
}

.merged-card {
  width: clamp(48px, 6vmin, 80px);
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.history-chip {
  width: 11px;
  height: 15px;
  border-radius: 2px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--surface-bg) 60%, transparent);
  border: 1px solid currentColor;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface-bg) 50%, transparent);
}

.history-chip.merged-card-commit { color: #6ba287; }
.history-chip.merged-card-error  { color: #c4736b; }
.history-chip.merged-card-panic  { color: #b09a78; }

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
