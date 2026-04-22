<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameEngine } from '../composables/useGameEngine.js'
import { useNetwork } from '../composables/useNetwork.js'

const props = defineProps({
  player: { type: Object, required: true },
  isActiveReviewer: { type: Boolean, default: false },
  isMyTurn: { type: Boolean, default: false },
  cx: { type: Number, default: 0.5 },
  cy: { type: Number, default: 0.38 },
})

const { hands, gameState, activeReviewer } = useGameEngine()
const { peerId, players, cardHoverStates, dispatchAction, sendCardHover, sendClearHover } = useNetwork()
const { t } = useI18n()

// ── Cards for this player node ────────────────────────────────────────────────
const cardList = computed(() => hands.value[props.player.id] ?? [])

// ── Hover state computation ───────────────────────────────────────────────────
const cardHoverData = computed(() => {
  const map = {}
  for (const state of cardHoverStates.value) {
    if (state.id === peerId.value) continue
    if (!map[state.cardId]) map[state.cardId] = []
    const p = players.value.find(pl => pl.id === state.id)
    if (p) map[state.cardId].push(p)
  }
  return map
})

function cardHoverers(cardId) {
  return cardHoverData.value[cardId] ?? []
}

function cardGlowClass(cardId) {
  const hoverers = cardHoverers(cardId)
  if (!hoverers.length) return ''
  // Blue glow if the active reviewer is among the hoverers, yellow otherwise
  return hoverers.some(p => p.id === activeReviewer.value) ? 'card-glow-blue' : 'card-glow-yellow'
}

function cardThinkingPlayer(cardId) {
  // Show the thinking tooltip for whoever is the active reviewer hovering this card
  return cardHoverers(cardId).find(p => p.id === activeReviewer.value) ?? null
}

// ── Opponent card positioning — above the avatar node ────────────────────────
const opponentCardsStyle = computed(() => {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'translate(-50%, calc(-100% - 28px))',
  }
})

// ── Interactions ──────────────────────────────────────────────────────────────
function onCardHoverEnter(cardId) {
  sendCardHover(cardId)
}

function onCardHoverLeave() {
  sendClearHover()
}

function onOpponentCardClick(cardIndex) {
  if (!props.isMyTurn || gameState.value !== 'playing') return
  dispatchAction({ type: 'MERGE_PR', targetId: props.player.id, cardIndex })
}
</script>

<template>
  <!-- Opponent cards: pushed toward the hub -->
  <div v-if="!player.isLocal" class="absolute flex gap-1.5" :style="opponentCardsStyle">
    <TransitionGroup name="merge" tag="div" class="flex gap-1.5">
      <div
        v-for="(card, cardIndex) in cardList"
        :key="card.id"
        class="opponent-card relative rounded-lg shadow-md"
        :class="[
          cardGlowClass(card.id),
          isMyTurn && !isActiveReviewer && gameState === 'playing' ? 'cursor-pointer' : 'cursor-default',
        ]"
        :style="{ '--card-index': cardIndex }"
        @mouseenter="onCardHoverEnter(card.id)"
        @mouseleave="onCardHoverLeave()"
        @click.stop="onOpponentCardClick(cardIndex)"
      >
        <div
          v-if="cardThinkingPlayer(card.id)"
          class="thinking-tooltip absolute -top-9 left-1/2 -translate-x-1/2 bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink whitespace-nowrap shadow-lg pointer-events-none"
          style="z-index:35"
        >
          {{ t('board.thinkingAbout', { name: cardThinkingPlayer(card.id).name }) }}
        </div>
        <span class="card-watermark absolute inset-0 flex items-center justify-center font-black font-mono select-none pointer-events-none">404</span>
        <div v-if="cardHoverers(card.id).length" class="absolute -top-2 -right-1 flex" style="z-index:10">
          <div
            v-for="(hoverer, idx) in cardHoverers(card.id)"
            :key="hoverer.id"
            class="w-4 h-4 rounded-full bg-blue-700 text-white text-[8px] font-bold flex items-center justify-center border border-white shadow-sm"
            :style="{ marginLeft: idx > 0 ? '-5px' : '0', zIndex: idx }"
            :title="hoverer.name"
          >
            {{ hoverer.name.charAt(0).toUpperCase() }}
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>

  <!-- Avatar — absolutely centered on the anchor point -->
  <div
    class="absolute w-11 h-11 rounded-full font-bold text-base flex items-center justify-center shadow-sm bg-chip-bg text-chip-text transition-all duration-200"
    :class="player.isLocal
      ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-[var(--page-bg)]'
      : isActiveReviewer
        ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[var(--page-bg)] shadow-[0_0_12px_rgba(245,158,11,0.5)]'
        : 'ring-1 ring-border'"
    style="top:0; left:0; transform: translate(-50%, -50%);"
  >
    {{ player.name.charAt(0).toUpperCase() }}
  </div>

  <!-- Name + YOU/REVIEWER badge -->
  <div
    class="absolute flex items-center gap-1 whitespace-nowrap"
    style="top:0; left:0; transform: translate(-50%, calc(22px + 8px));"
  >
    <span class="text-xs font-semibold text-ink leading-none">{{ player.name }}</span>
    <span
      v-if="player.isLocal"
      class="text-[9px] font-bold uppercase tracking-wide text-chip-text bg-chip-bg px-1.5 py-0.5 rounded shrink-0 leading-none"
    >
      {{ t('lobby.you') }}
    </span>
    <span
      v-if="isActiveReviewer"
      class="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0 leading-none"
    >
      {{ t('board.reviewing') }}
    </span>
  </div>
</template>

<style scoped>
/* ── Opponent cards ───────────────────────────────────────────────────────── */
.opponent-card {
  width: 38px;
  height: 54px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid rgba(148, 163, 184, 0.45);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  overflow: visible;
}

.opponent-card:hover {
  transform: translateY(-3px);
}

/* ── Card watermark ───────────────────────────────────────────────────────── */
.card-watermark {
  font-size: 10px;
  color: rgba(148, 163, 184, 0.55);
  user-select: none;
}

/* ── Thinking tooltip caret ──────────────────────────────────────────────── */
.thinking-tooltip::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px 5px 0;
  border-style: solid;
  border-color: var(--border-color, #e2e8f0) transparent transparent;
}

/* ── Deal animation (cards flying in at sprint start) ────────────────────── */
.merge-enter-active {
  animation: card-deal 0.4s ease-out both;
  animation-delay: calc(var(--card-index, 0) * 60ms);
}

@keyframes card-deal {
  from { opacity: 0; transform: scale(0) translateY(-30px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Merge-out animation (card removed from opponent hand) ───────────────── */
.merge-leave-active {
  animation: card-merge-out 0.35s ease-in both;
  position: absolute;
}

@keyframes card-merge-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(1.3) translateY(-20px); }
}
</style>
