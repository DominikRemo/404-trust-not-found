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

const { hands, gameState } = useGameEngine()
const { dispatchAction } = useNetwork()
const { t } = useI18n()
const baseUrl = import.meta.env.BASE_URL

// ── Cards for this player node ────────────────────────────────────────────────
const cardList = computed(() => hands.value[props.player.id] ?? [])

// ── Opponent card positioning — above the avatar node ────────────────────────
const opponentCardsStyle = computed(() => {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'translate(-50%, calc(-100% - 28px))',
  }
})

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
        :class="isMyTurn && !isActiveReviewer && gameState === 'playing' ? 'cursor-pointer' : 'cursor-default'"
        :style="{ '--card-index': cardIndex }"
        @click.stop="onOpponentCardClick(cardIndex)"
      >
        <img
          :src="`${baseUrl}cards/back.png`"
          alt="card back"
          class="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
        />
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
  width: clamp(40px, 5vmin, 64px);
  aspect-ratio: 3 / 4;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.opponent-card:hover {
  transform: translateY(-3px);
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
