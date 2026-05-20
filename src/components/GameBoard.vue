<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useNetwork } from '../composables/useNetwork.js'
import { useGameEngine } from '../composables/useGameEngine.js'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'
import MainRepository from './MainRepository.vue'
import PlayerNode from './PlayerNode.vue'
import LocalHand from './LocalHand.vue'
import GameInfoCard from './GameInfoCard.vue'

const {
  players, peerId, isHost,
  leaveSession, startNewGame,
} = useNetwork()

const copied = ref(false)
async function copyCode() {
  await navigator.clipboard.writeText(peerId.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const { activeReviewer, gameState, roles, readyPlayers, mainRepo } = useGameEngine()

const lastMergedCard = computed(() =>
  mainRepo.value.length ? mainRepo.value[mainRepo.value.length - 1] : null
)
const { theme, cycleTheme } = useTheme()
const { locale, setLocale, SUPPORTED } = useLocale()
const { t } = useI18n()
const baseUrl = import.meta.env.BASE_URL

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

</script>

<template>
  <div class="min-h-screen bg-page flex flex-col transition-colors duration-200">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="flex items-center justify-between px-6 py-3 bg-surface border-b border-border shadow-sm">
      <div class="flex items-center gap-3">
        <span class="bg-ink text-page text-xs font-bold tracking-widest px-2.5 py-1 rounded">404</span>
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

        <!-- GitHub link -->
        <a
          href="https://github.com/DominikRemo/404-trust-not-found"
          target="_blank"
          rel="noopener noreferrer"
          class="w-10 h-10 rounded-xl bg-surface border border-border text-ink-dim shadow-sm hover:bg-raised transition-colors flex items-center justify-center"
          :title="t('header.githubTitle')"
        >
          <i class="pi pi-github text-base" />
        </a>

      </div>
    </header>

    <!-- ── Network Topology Board ──────────────────────────────────────────── -->
    <main class="topology-board relative flex-1 select-none">
      <div class="topology-bg absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" />

      <p class="absolute top-4 left-6 text-xs font-semibold uppercase tracking-widest text-ink-faint m-0 pointer-events-none" style="z-index:30">
        {{ t('board.nodesConnected', { count: players.length }) }}
      </p>

      <!-- ── Game info card (top-right) ────────────────────────────────────── -->
      <div
        v-if="gameState === 'playing' || gameState === 'viewing'"
        class="absolute top-4 right-4 pointer-events-none"
        style="z-index:30"
      >
        <GameInfoCard />
      </div>

      <!-- ── Turn status banner ─────────────────────────────────────────── -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none" style="z-index:30">
        <div
          v-if="gameState === 'viewing'"
          class="flex items-center gap-2 bg-ink text-page text-xs font-bold px-4 py-1.5 rounded-full shadow-md"
        >
          <span class="uppercase tracking-widest">{{ t('board.viewingPhase') }}</span>
          <span class="bg-page/20 rounded-full px-2 py-0.5 font-mono tabular-nums">
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

      <!-- ── Role card ──────────────────────────────────────────────────── -->
      <div
        v-if="myRole"
        class="role-card absolute bottom-4 right-6 pointer-events-none rounded-lg overflow-hidden"
        style="z-index:30; width: clamp(120px, 16vmin, 200px); aspect-ratio: 3 / 4;"
      >
        <img
          :src="`${baseUrl}cards/${myRole}.png`"
          :alt="myRole === 'goodDev' ? t('board.roleGoodDev') : t('board.roleBadDev')"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <span class="bracket bracket-tl" aria-hidden="true" />
        <span class="bracket bracket-tr" aria-hidden="true" />
        <span class="bracket bracket-bl" aria-hidden="true" />
        <span class="bracket bracket-br" aria-hidden="true" />
      </div>

      <!-- ── Game over overlay ──────────────────────────────────────────── -->
      <div
        v-if="isGameOver"
        class="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
        style="z-index:50; background: color-mix(in srgb, var(--ink) 45%, transparent);"
        @click.stop
      >
        <div class="game-over-card relative bg-surface rounded-2xl p-8 flex flex-col items-center gap-6 w-[440px] max-w-[90vw] text-center">
          <span class="bracket bracket-tl" aria-hidden="true" />
          <span class="bracket bracket-tr" aria-hidden="true" />
          <span class="bracket bracket-bl" aria-hidden="true" />
          <span class="bracket bracket-br" aria-hidden="true" />

          <!-- Last revealed card -->
          <div v-if="lastMergedCard" class="w-full flex flex-col items-center gap-1">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-dim">
              {{ t('board.gameOver.lastRevealedCard') }}
            </div>
            <div
              class="role-card relative overflow-hidden rounded-lg"
              style="width: clamp(112px, 18vmin, 160px); aspect-ratio: 3 / 4;"
            >
              <img
                :src="`${baseUrl}cards/${lastMergedCard.type}.png`"
                :alt="lastMergedCard.type"
                class="absolute inset-0 w-full h-full object-cover"
              />
              <span class="bracket bracket-tl" aria-hidden="true" />
              <span class="bracket bracket-tr" aria-hidden="true" />
              <span class="bracket bracket-bl" aria-hidden="true" />
              <span class="bracket bracket-br" aria-hidden="true" />
            </div>
          </div>

          <!-- Winner declaration -->
          <div
            class="winner-banner relative w-full rounded-xl py-4 px-6"
            :class="gameState === 'goodDevsWin' ? 'winner-good' : 'winner-bad'"
          >
            <span class="bracket bracket-tl" aria-hidden="true" />
            <span class="bracket bracket-tr" aria-hidden="true" />
            <span class="bracket bracket-bl" aria-hidden="true" />
            <span class="bracket bracket-br" aria-hidden="true" />
            <div class="text-4xl mb-2">
              {{ gameState === 'goodDevsWin' ? '🎉' : gameState === 'deadlineMissed' ? '⏰' : '🐛' }}
            </div>
            <div
              class="text-xs font-bold uppercase tracking-widest mb-1"
              :class="gameState === 'goodDevsWin' ? 'text-emerald-700' : 'text-rose-700'"
            >
              {{ gameState === 'goodDevsWin' ? t('board.gameOver.winnerGoodDevs') : t('board.gameOver.winnerBadDevs') }}
            </div>
            <h2 class="text-xl font-black text-ink m-0">
              {{ gameState === 'goodDevsWin'    ? t('board.gameOver.headlineAllFeaturesShipped')
               : gameState === 'deadlineMissed' ? t('board.gameOver.headlineDeadlineMissed')
               : t('board.gameOver.headlineProductionDown') }}
            </h2>
            <p class="text-xs text-ink-dim mt-1 mb-0">
              {{ gameState === 'goodDevsWin'    ? t('board.gameOver.descAllFeaturesShipped')
               : gameState === 'deadlineMissed' ? t('board.gameOver.descDeadlineMissed')
               : t('board.gameOver.descProductionDown') }}
            </p>
          </div>

          <!-- Player role reveal -->
          <div class="w-full">
            <div class="text-[10px] font-bold uppercase tracking-widest text-ink-dim mb-3">
              {{ t('board.gameOver.roleReveal') }}
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="player in players"
                :key="player.id"
                class="role-row flex items-center justify-between px-3 py-2 rounded-lg"
                :class="roles[player.id] === 'goodDev' ? 'role-good' : 'role-bad'"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                    :class="roles[player.id] === 'goodDev'
                      ? 'bg-emerald-700/15 text-emerald-800'
                      : 'bg-rose-700/15 text-rose-800'"
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
                  :class="roles[player.id] === 'goodDev' ? 'text-emerald-800' : 'text-rose-800'"
                >
                  {{ roles[player.id] === 'goodDev' ? t('board.roleGoodDev') : t('board.roleBadDev') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Host: room code so dropped/new players can rejoin between games -->
          <div v-if="isHost" class="w-full flex flex-col gap-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{{ t('lobby.roomCode') }}</span>
            <div class="flex items-center gap-3">
              <code class="flex-1 font-mono text-xl font-semibold tracking-[0.25em] bg-raised border border-border rounded-lg px-4 py-2 text-ink">
                {{ peerId }}
              </code>
              <Button
                :label="copied ? t('lobby.copied') : t('lobby.copy')"
                :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
                severity="secondary"
                size="small"
                @click="copyCode"
              />
            </div>
            <p class="text-xs text-ink-faint m-0">{{ t('lobby.shareHint') }}</p>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-2 w-full">
            <Button
              v-if="isHost"
              :label="t('board.gameOver.startNewGame')"
              icon="pi pi-refresh"
              @click="startNewGame"
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
          class="topology-line"
          :x1="CX * 100"
          :y1="CY * 100"
          :x2="visualPos(player).x * 100"
          :y2="visualPos(player).y * 100"
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
  background-image: radial-gradient(circle, color-mix(in srgb, var(--ink) 18%, transparent) 1px, transparent 1px);
  background-size: 22px 22px;
}

.topology-line {
  stroke: color-mix(in srgb, var(--ink) 32%, transparent);
}

/* Role card paper frame — brackets always navy because the card artwork is always light */
.role-card {
  border: 1px solid rgba(28, 39, 71, 0.45);
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--ink) 18%, transparent),
    0 1px 2px color-mix(in srgb, var(--ink) 8%, transparent);
}
.role-card .bracket {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: rgba(28, 39, 71, 0.85);
  border-style: solid;
  border-width: 0;
  pointer-events: none;
}
.role-card .bracket-tl { top: 6px;    left: 6px;    border-top-width: 2px;    border-left-width: 2px;    border-top-left-radius: 4px; }
.role-card .bracket-tr { top: 6px;    right: 6px;   border-top-width: 2px;    border-right-width: 2px;   border-top-right-radius: 4px; }
.role-card .bracket-bl { bottom: 6px; left: 6px;    border-bottom-width: 2px; border-left-width: 2px;    border-bottom-left-radius: 4px; }
.role-card .bracket-br { bottom: 6px; right: 6px;   border-bottom-width: 2px; border-right-width: 2px;   border-bottom-right-radius: 4px; }

/* Game-over modal — paper card */
.game-over-card {
  border: 1px solid color-mix(in srgb, var(--ink) 45%, transparent);
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--ink) 35%, transparent),
    0 4px 8px color-mix(in srgb, var(--ink) 18%, transparent);
}
.game-over-card > .bracket {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: color-mix(in srgb, var(--ink) 75%, transparent);
  border-style: solid;
  border-width: 0;
  pointer-events: none;
}
.game-over-card > .bracket-tl { top: 10px;    left: 10px;    border-top-width: 2px;    border-left-width: 2px;    border-top-left-radius: 4px; }
.game-over-card > .bracket-tr { top: 10px;    right: 10px;   border-top-width: 2px;    border-right-width: 2px;   border-top-right-radius: 4px; }
.game-over-card > .bracket-bl { bottom: 10px; left: 10px;    border-bottom-width: 2px; border-left-width: 2px;    border-bottom-left-radius: 4px; }
.game-over-card > .bracket-br { bottom: 10px; right: 10px;   border-bottom-width: 2px; border-right-width: 2px;   border-bottom-right-radius: 4px; }

/* Winner banner — tinted paper */
.winner-banner {
  border: 1px solid currentColor;
}
.winner-banner.winner-good {
  background: color-mix(in srgb, #6ba287 14%, var(--surface-bg));
  color: color-mix(in srgb, #2f6b4f 60%, var(--ink));
}
.winner-banner.winner-bad {
  background: color-mix(in srgb, #c4736b 14%, var(--surface-bg));
  color: color-mix(in srgb, #8a3a36 60%, var(--ink));
}
.winner-banner > .bracket {
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: currentColor;
  border-style: solid;
  border-width: 0;
  pointer-events: none;
}
.winner-banner > .bracket-tl { top: 5px;    left: 5px;    border-top-width: 1.5px;    border-left-width: 1.5px; }
.winner-banner > .bracket-tr { top: 5px;    right: 5px;   border-top-width: 1.5px;    border-right-width: 1.5px; }
.winner-banner > .bracket-bl { bottom: 5px; left: 5px;    border-bottom-width: 1.5px; border-left-width: 1.5px; }
.winner-banner > .bracket-br { bottom: 5px; right: 5px;   border-bottom-width: 1.5px; border-right-width: 1.5px; }

/* Role reveal rows — tinted paper */
.role-row {
  border: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
}
.role-row.role-good { background: color-mix(in srgb, #6ba287 12%, var(--surface-bg)); }
.role-row.role-bad  { background: color-mix(in srgb, #c4736b 12%, var(--surface-bg)); }
</style>
