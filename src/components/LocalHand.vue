<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameEngine } from '../composables/useGameEngine.js'
import { useNetwork } from '../composables/useNetwork.js'

const { hands, gameState, readyPlayers, players, activeReviewer } = useGameEngine()
const { peerId, players: networkPlayers, dispatchAction } = useNetwork()

const localPlayer = computed(() => networkPlayers.value.find(p => p.id === peerId.value))
const isReviewing = computed(() => peerId.value === activeReviewer.value)
const { t } = useI18n()

// ── Local player cards ────────────────────────────────────────────────────────
const localCards = computed(() => hands.value[peerId.value] ?? [])

// Cards are visible during the viewing phase so players can memorise them
const cardsAreVisible = computed(() => gameState.value === 'viewing')

// ── Ready state ───────────────────────────────────────────────────────────────
const hasMarkedReady = computed(() => readyPlayers.value.includes(peerId.value))

function onPutDownCards() {
  dispatchAction({ type: 'PLAYER_READY' })
}

function cardImage(type) {
  return `${import.meta.env.BASE_URL}cards/${type}.png`
}

// ── Shuffle animation — fires when host transitions viewing → playing ──────────
const isShuffling = ref(false)

watch(gameState, (newVal, oldVal) => {
  if (oldVal === 'viewing' && newVal === 'playing') {
    isShuffling.value = true
    setTimeout(() => { isShuffling.value = false }, 500)
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Card fan -->
    <TransitionGroup
      name="deal"
      tag="div"
      class="flex gap-3"
      :class="{ shuffling: isShuffling }"
    >
      <div
        v-for="(card, i) in localCards"
        :key="card.id"
        class="card-fan-slot"
        :style="{
          transform: `rotate(${(i - (localCards.length - 1) / 2) * 7}deg)`,
          transformOrigin: 'bottom center',
          '--card-index': i,
        }"
      >
        <div class="local-card relative rounded-lg shadow-xl overflow-hidden">
          <img
            v-if="cardsAreVisible"
            :src="cardImage(card.type)"
            :alt="card.type"
            class="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <img
            v-else
            :src="cardImage('back')"
            alt="card back"
            class="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        </div>
      </div>
    </TransitionGroup>

    <!-- Viewing phase controls -->
    <div v-if="gameState === 'viewing'" class="flex flex-col items-center gap-2 mt-1">
      <button
        v-if="!hasMarkedReady"
        class="px-5 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-blue-600 active:bg-blue-800 transition-colors cursor-pointer"
        @click.stop="onPutDownCards"
      >
        {{ t('board.putDownCards') }}
      </button>
      <span v-else class="text-xs text-ink-faint italic">
        {{ t('board.waitingForOthers') }}
      </span>
      <span class="text-[10px] font-semibold text-ink-faint uppercase tracking-widest">
        {{ t('board.readyCount', { ready: readyPlayers.length, total: players.length }) }}
      </span>
    </div>

    <!-- Local player avatar -->
    <div v-if="localPlayer" class="flex items-center gap-1.5 mt-1">
      <div
        class="w-9 h-9 rounded-full bg-chip-bg text-chip-text text-sm font-bold flex items-center justify-center ring-2 ring-blue-600 ring-offset-2 ring-offset-[var(--page-bg)]"
        :class="isReviewing ? 'ring-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'ring-blue-600'"
      >
        {{ localPlayer.name.charAt(0).toUpperCase() }}
      </div>
      <span class="text-xs font-semibold text-ink">{{ localPlayer.name }}</span>
      <span class="text-[9px] font-bold uppercase tracking-wide text-chip-text bg-chip-bg px-1.5 py-0.5 rounded leading-none">
        {{ t('lobby.you') }}
      </span>
      <span
        v-if="isReviewing"
        class="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded leading-none"
      >
        {{ t('board.reviewing') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* ── Local player cards ───────────────────────────────────────────────────── */
.local-card {
  width: clamp(88px, 11vmin, 140px);
  aspect-ratio: 3 / 4;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.local-card:hover {
  transform: translateY(-10px);
}

/* ── Deal animation (staggered card-in at sprint start) ──────────────────── */
.deal-enter-active {
  animation: card-deal 0.4s ease-out both;
  animation-delay: calc(var(--card-index, 0) * 60ms);
}

@keyframes card-deal {
  from { opacity: 0; transform: scale(0) translateY(-30px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Shuffle animation (viewing → playing transition) ────────────────────── */
.shuffling .local-card {
  animation: card-shuffle 0.5s ease-in-out;
}

@keyframes card-shuffle {
  0%,  100% { transform: rotate(0deg); }
  20%        { transform: rotate(-8deg) translateX(-4px); }
  40%        { transform: rotate(8deg) translateX(4px); }
  60%        { transform: rotate(-5deg) translateX(-2px); }
  80%        { transform: rotate(5deg) translateX(2px); }
}
</style>
