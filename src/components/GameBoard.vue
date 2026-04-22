<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useNetwork } from '../composables/useNetwork.js'
import { useGameEngine } from '../composables/useGameEngine.js'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'
import MainRepository from './MainRepository.vue'
import PlayerNode from './PlayerNode.vue'
import LocalHand from './LocalHand.vue'

const {
  players, peerId, isHost,
  leaveSession, dispatchAction,
  playAgainReadyIds, forceStartNextGame,
} = useNetwork()

const { activeReviewer, gameState, roles, readyPlayers } = useGameEngine()
const { theme, cycleTheme } = useTheme()
const { locale, setLocale, SUPPORTED } = useLocale()
const { t } = useI18n()

const themeIcon  = computed(() => ({ system: 'pi pi-desktop', light: 'pi pi-sun', dark: 'pi pi-moon' }[theme.value]))
const themeTitle = computed(() => ({ system: t('theme.system'), light: t('theme.light'), dark: t('theme.dark') }[theme.value]))

// ── Global Player Order ────────────────────────────────────────────────────────
const globalOrder = computed(() => [...players.value].sort((a, b) => a.id.localeCompare(b.id)))
const N = computed(() => Math.max(1, globalOrder.value.length))
const localIdx = computed(() => {
  const i = globalOrder.value.findIndex(p => p.id === peerId.value)
  return i >= 0 ? i : 0
})

// ── Ellipse parameters ────────────────────────────────────────────────────────
const CX = 0.5
const CY = 0.42
const RX = 0.37
const RY = 0.20

function playerAngle(globalIdx) {
  if (N.value === 1) return Math.PI / 2
  return Math.PI / 2 + (globalIdx - localIdx.value) * (2 * Math.PI / N.value)
}

function angleToPos(angle) {
  return { x: CX + RX * Math.cos(angle), y: CY + RY * Math.sin(angle) }
}

const orderedPlayers = computed(() =>
  globalOrder.value.map((player, idx) => ({
    ...player,
    pos: angleToPos(playerAngle(idx)),
    isLocal: player.id === peerId.value,
    globalIdx: idx,
  }))
)

const LOCAL_Y = 0.77

function visualPos(player) {
  if (player.isLocal) return { x: 0.5, y: LOCAL_Y }
  return player.pos
}

function nodeAnchorStyle(player) {
  const vp = visualPos(player)
  return {
    left: `${vp.x * 100}%`,
    top:  `${vp.y * 100}%`,
    zIndex: player.isLocal ? 20 : 10,
  }
}

// ── Derived state ──────────────────────────────────────────────────────────────
const isMyTurn   = computed(() => peerId.value === activeReviewer.value)
const isGameOver = computed(() =>
  gameState.value === 'goodDevsWin' ||
  gameState.value === 'badDevsWin'  ||
  gameState.value === 'deadlineMissed'
)
const myRole = computed(() => roles.value[peerId.value])

// ── Play-again state ───────────────────────────────────────────────────────────
const localReadyForNextGame = computed(() =>
  playAgainReadyIds.value.includes(peerId.value)
)

function onReadyForNextGame() {
  dispatchAction({ type: 'PLAY_AGAIN_READY' })
}
</script>

<template>
  <div class="min-h-screen bg-page flex flex-col transition-colors duration-200">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="flex items-center justify-between px-6 py-3 bg-surface border-b border-border shadow-sm">
      <div class="flex items-center gap-3">
        <span class="bg-blue-700 text-white text-xs font-bold tracking-widest px-2.5 py-1 rounded">404</span>
        <h1 class="text-base font-semibold text-ink m-0">Trust Not Found</h1>
        <span class="text-xs text-ink-faint font-mono hidden sm:inline">{{ t('board.mainframeLabel') }}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-xl bg-surface border border-border text-ink-dim shadow-sm hover:bg-raised transition-colors flex items-center justify-center relative">
          <span class="text-xs font-bold uppercase pointer-events-none select-none">{{ locale }}</span>
          <select
            :value="locale"
            @change="setLocale($event.target.value)"
            class="absolute inset-0 opacity-0 cursor-pointer w-full"
            aria-label="Language"
          >
            <option v-for="lang in SUPPORTED" :key="lang" :value="lang">{{ lang.toUpperCase() }}</option>
          </select>
        </div>
        <button
          @click="cycleTheme"
          class="w-10 h-10 rounded-xl bg-surface border border-border text-ink-dim shadow-sm hover:bg-raised transition-colors flex items-center justify-center cursor-pointer"
          :title="themeTitle"
        >
          <i :class="themeIcon" class="text-base" />
        </button>
        <Button
          :label="t('board.leaveGame')"
          icon="pi pi-sign-out"
          severity="danger"
          outlined
          size="small"
          @click="leaveSession"
        />
      </div>
    </header>

    <!-- ── Network Topology Board ──────────────────────────────────────────── -->
    <main class="topology-board relative flex-1 select-none">
      <div class="topology-bg absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" />

      <p class="absolute top-4 left-6 text-xs font-semibold uppercase tracking-widest text-ink-faint m-0 pointer-events-none" style="z-index:30">
        {{ t('board.nodesConnected', { count: players.length }) }}
      </p>

      <!-- ── Turn status banner ─────────────────────────────────────────── -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none" style="z-index:30">
        <div
          v-if="gameState === 'viewing'"
          class="flex items-center gap-2 bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg"
        >
          <span class="uppercase tracking-widest">{{ t('board.viewingPhase') }}</span>
          <span class="bg-white/20 rounded-full px-2 py-0.5 font-mono tabular-nums">
            {{ t('board.readyCount', { ready: readyPlayers.length, total: players.length }) }}
          </span>
        </div>
        <div
          v-else-if="isMyTurn"
          class="bg-amber-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg"
        >
          {{ t('board.yourTurn') }}
        </div>
        <div
          v-else-if="activeReviewer"
          class="bg-surface border border-border text-ink-faint text-xs font-medium px-4 py-1.5 rounded-full shadow-sm"
        >
          {{ t('board.opponentReviewing', { name: players.find(p => p.id === activeReviewer)?.name ?? '...' }) }}
        </div>
      </div>

      <!-- ── Role badge ─────────────────────────────────────────────────── -->
      <div
        v-if="myRole"
        class="absolute bottom-4 right-6 pointer-events-none"
        style="z-index:30"
      >
        <div
          class="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
          :class="myRole === 'goodDev'
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-red-50 border-red-300 text-red-700'"
        >
          {{ myRole === 'goodDev' ? t('board.roleGoodDev') : t('board.roleBadDev') }}
        </div>
      </div>

      <!-- ── Game over overlay ──────────────────────────────────────────── -->
      <div
        v-if="isGameOver"
        class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        style="z-index:50"
        @click.stop
      >
        <div class="bg-surface border border-border rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 w-[440px] max-w-[90vw] text-center">

          <!-- Winner declaration -->
          <div
            class="w-full rounded-xl py-4 px-6"
            :class="gameState === 'goodDevsWin'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'"
          >
            <div class="text-4xl mb-2">
              {{ gameState === 'goodDevsWin' ? '🎉' : gameState === 'deadlineMissed' ? '⏰' : '🐛' }}
            </div>
            <div
              class="text-xs font-bold uppercase tracking-widest mb-1"
              :class="gameState === 'goodDevsWin' ? 'text-green-600' : 'text-red-500'"
            >
              {{ gameState === 'goodDevsWin' ? t('board.gameOver.winnerGoodDevs') : t('board.gameOver.winnerBadDevs') }}
            </div>
            <h2 class="text-xl font-black text-ink m-0">
              {{ gameState === 'goodDevsWin'    ? t('board.gameOver.headlineAllFeaturesShipped')
               : gameState === 'deadlineMissed' ? t('board.gameOver.headlineDeadlineMissed')
               : t('board.gameOver.headlineProductionDown') }}
            </h2>
            <p class="text-xs text-ink-faint mt-1 mb-0">
              {{ gameState === 'goodDevsWin'    ? t('board.gameOver.descAllFeaturesShipped')
               : gameState === 'deadlineMissed' ? t('board.gameOver.descDeadlineMissed')
               : t('board.gameOver.descProductionDown') }}
            </p>
          </div>

          <!-- Player role reveal -->
          <div class="w-full">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-3">
              {{ t('board.gameOver.roleReveal') }}
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="player in players"
                :key="player.id"
                class="flex items-center justify-between px-3 py-2 rounded-lg border"
                :class="roles[player.id] === 'goodDev'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                    :class="roles[player.id] === 'goodDev'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-red-200 text-red-800'"
                  >
                    {{ player.name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm font-semibold text-ink">{{ player.name }}</span>
                  <span
                    v-if="player.id === peerId"
                    class="text-[9px] font-bold uppercase tracking-wide text-chip-text bg-chip-bg px-1.5 py-0.5 rounded leading-none"
                  >you</span>
                </div>
                <span
                  class="text-[10px] font-bold uppercase tracking-wider"
                  :class="roles[player.id] === 'goodDev' ? 'text-green-700' : 'text-red-600'"
                >
                  {{ roles[player.id] === 'goodDev' ? t('board.roleGoodDev') : t('board.roleBadDev') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Play-again readiness list -->
          <div class="w-full">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-3">
              {{ t('board.gameOver.playAgainReadyCount', { ready: playAgainReadyIds.length, total: players.length }) }}
            </div>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="player in players"
                :key="`ready-${player.id}`"
                class="flex items-center justify-between px-3 py-1.5 rounded-lg border border-border bg-raised"
              >
                <span class="text-sm text-ink">{{ player.name }}</span>
                <span
                  v-if="playAgainReadyIds.includes(player.id)"
                  class="text-[10px] font-bold uppercase tracking-wider text-green-700"
                >ready</span>
                <span v-else class="text-[10px] uppercase tracking-wider text-ink-faint">waiting</span>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-2 w-full">
            <Button
              v-if="!localReadyForNextGame"
              :label="t('board.gameOver.readyForNextGame')"
              icon="pi pi-refresh"
              @click="onReadyForNextGame"
            />
            <Button
              v-if="isHost"
              :label="t('board.gameOver.forceStart')"
              severity="secondary"
              size="small"
              @click="forceStartNextGame"
            />
            <Button
              :label="t('board.gameOver.backToLobby')"
              icon="pi pi-home"
              severity="danger"
              outlined
              size="small"
              @click="leaveSession"
            />
          </div>
        </div>
      </div>

      <!-- ── Connection lines — z-index 1, behind all nodes and hub ───────── -->
      <svg
        class="absolute inset-0 w-full h-full pointer-events-none"
        style="z-index:1"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="player in orderedPlayers"
          :key="`conn-${player.id}`"
          :x1="CX * 100"
          :y1="CY * 100"
          :x2="visualPos(player).x * 100"
          :y2="visualPos(player).y * 100"
          stroke="rgba(148,163,184,0.35)"
          stroke-width="0.28"
          stroke-dasharray="1.5 1.5"
        />
      </svg>

      <!-- ── Main Repository Hub ────────────────────────────────────────────── -->
      <div
        class="absolute pointer-events-auto"
        :style="{ left: '50%', top: `${CY * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }"
        @click.stop
      >
        <MainRepository />
      </div>

      <!-- ── Player Nodes (remote only — local player appears in LocalHand) ── -->
      <template v-for="player in orderedPlayers" :key="player.id">
        <div
          v-if="!player.isLocal"
          class="absolute w-0 h-0"
          :style="nodeAnchorStyle(player)"
        >
          <PlayerNode
            :player="player"
            :is-active-reviewer="player.id === activeReviewer"
            :is-my-turn="isMyTurn"
            :cx="CX"
            :cy="CY"
          />
        </div>
      </template>

      <!-- ── Local Hand ─────────────────────────────────────────────────────── -->
      <div
        class="absolute pointer-events-auto"
        :style="{ left: '50%', top: `${LOCAL_Y * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 20 }"
        @click.stop
      >
        <LocalHand />
      </div>

    </main>

  </div>
</template>

<style scoped>
.topology-board {
  min-height: 620px;
}

.topology-bg {
  background-image: radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px);
  background-size: 28px 28px;
}
</style>
