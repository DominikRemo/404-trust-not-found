<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useNetwork } from '../composables/useNetwork.js'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'

const { players, peerId, cardHoverStates, hostPeerId, sendCardHover, sendClearHover, leaveSession } = useNetwork()
const { theme, cycleTheme } = useTheme()
const { locale, setLocale, SUPPORTED } = useLocale()
const { t } = useI18n()

const themeIcon = computed(() => ({ system: 'pi pi-desktop', light: 'pi pi-sun', dark: 'pi pi-moon' }[theme.value]))
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
const CY = 0.38
const RX = 0.37
const RY = 0.22

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

const LOCAL_Y = 0.72

function visualPos(player) {
  if (player.isLocal) return { x: 0.5, y: LOCAL_Y }
  return player.pos
}

// The anchor places the AVATAR CENTER at visualPos — no transform on the wrapper itself.
// All children use absolute positioning relative to this zero-size anchor point.
function nodeAnchorStyle(player) {
  const vp = visualPos(player)
  return {
    left: `${vp.x * 100}%`,
    top: `${vp.y * 100}%`,
    zIndex: player.isLocal ? 20 : 10,
  }
}

// Opponent cards: offset toward the Main Repository hub using the radial direction vector.
// vw/vh approximate board-percentage since the board fills the viewport.
function opponentCardsStyle(player) {
  const vp = player.pos
  const dx = CX - vp.x
  const dy = CY - vp.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = (dx / len * 5.5).toFixed(2)
  const ny = (dy / len * 5.5).toFixed(2)
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: `translate(calc(-50% + ${nx}vw), calc(-50% + ${ny}vh))`,
  }
}

// ── Active Player (Key holder) ─────────────────────────────────────────────────
const activePlayerId = computed(() => hostPeerId.value || players.value[0]?.id || '')

// ── Deterministic card IDs ────────────────────────────────────────────────────
function cardIds(playerId) {
  return [`${playerId}-card-0`, `${playerId}-card-1`]
}

const localCardIds = computed(() => cardIds(peerId.value))

// ── Hover / lock state ────────────────────────────────────────────────────────
const lockedCardId = ref(null)
const hoverCardId = ref(null)

const localHoveredCardId = computed(() => lockedCardId.value ?? hoverCardId.value)

const cardHoverData = computed(() => {
  const map = {}
  for (const state of cardHoverStates.value) {
    if (state.id === peerId.value) continue
    if (!map[state.cardId]) map[state.cardId] = []
    const player = players.value.find(p => p.id === state.id)
    if (player) map[state.cardId].push(player)
  }
  if (localHoveredCardId.value) {
    const cardId = localHoveredCardId.value
    if (!map[cardId]) map[cardId] = []
    const localPlayer = players.value.find(p => p.id === peerId.value)
    if (localPlayer) map[cardId].push(localPlayer)
  }
  return map
})

function cardHoverers(cardId) {
  return cardHoverData.value[cardId] ?? []
}

function cardGlowClass(cardId) {
  const hoverers = cardHoverers(cardId)
  if (!hoverers.length) return ''
  return hoverers.some(p => p.id === activePlayerId.value) ? 'card-glow-blue' : 'card-glow-yellow'
}

function cardThinkingPlayer(cardId) {
  return cardHoverers(cardId).find(p => p.id === activePlayerId.value) ?? null
}

function onCardHoverEnter(cardId) {
  if (lockedCardId.value) return
  hoverCardId.value = cardId
  sendCardHover(cardId)
}

function onCardHoverLeave() {
  if (lockedCardId.value) return
  hoverCardId.value = null
  sendClearHover()
}

function onCardClick(cardId) {
  if (lockedCardId.value === cardId) {
    lockedCardId.value = null
    hoverCardId.value = null
    sendClearHover()
  } else {
    lockedCardId.value = cardId
    hoverCardId.value = null
    sendCardHover(cardId)
  }
}

function onBoardClick() {
  if (lockedCardId.value) {
    lockedCardId.value = null
    sendClearHover()
  }
}

// ── Mock data: Main Repository (simulates revealed/merged cards) ──────────────
const mockCurrentSprint = ref([
  { id: 'mc1', type: 'CODE_SNIPPET', label: 'feat: auth' },
  { id: 'mc2', type: 'ERROR_404',   label: 'fix: crash' },
  { id: 'mc3', type: 'CODE_SNIPPET', label: 'refactor'  },
])

const mockPreviousSprints = ref([
  { round: 1, cards: [{ id: 'ps1', type: 'CODE_SNIPPET' }, { id: 'ps2', type: 'CODE_SNIPPET' }, { id: 'ps3', type: 'ERROR_404' }] },
  { round: 2, cards: [{ id: 'ps4', type: 'KERNEL_PANIC' }, { id: 'ps5', type: 'CODE_SNIPPET' }] },
])

function cardTypeClass(type) {
  return { CODE_SNIPPET: 'merged-card-commit', ERROR_404: 'merged-card-error', KERNEL_PANIC: 'merged-card-panic' }[type] ?? 'merged-card-commit'
}

function cardTypeLabel(type) {
  return { CODE_SNIPPET: 'COMMIT', ERROR_404: 'ERROR', KERNEL_PANIC: 'PANIC' }[type] ?? type
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
    <main
      class="topology-board relative flex-1 select-none"
      @click="onBoardClick"
    >
      <div class="topology-bg absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" />

      <p class="absolute top-4 left-6 text-xs font-semibold uppercase tracking-widest text-ink-faint m-0 pointer-events-none" style="z-index:30">
        {{ t('board.nodesConnected', { count: players.length }) }}
      </p>

      <!-- ── Connection lines — z-index 1, behind all nodes and hub ───────── -->
      <svg
        class="absolute inset-0 w-full h-full pointer-events-none"
        style="z-index:1"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <!-- Lines connect from hub center to each player's AVATAR center (visualPos = anchor point) -->
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
              {{ t('board.currentSprint') }}
            </div>
            <div class="flex gap-2 flex-wrap min-h-[64px] items-center">
              <div
                v-if="!mockCurrentSprint.length"
                class="text-white/30 text-[10px] font-mono italic"
              >
                {{ t('board.noCommitsYet') }}
              </div>
              <div
                v-for="card in mockCurrentSprint"
                :key="card.id"
                class="merged-card"
                :class="cardTypeClass(card.type)"
              >
                <div class="card-type-tag">{{ cardTypeLabel(card.type) }}</div>
                <div class="text-[7px] font-mono opacity-60 mt-1 leading-tight text-center break-all px-0.5">{{ card.label }}</div>
              </div>
            </div>
          </div>

          <!-- Previous Sprints (history) -->
          <div v-if="mockPreviousSprints.length" class="px-3 pt-2 pb-2.5 border-t border-white/10">
            <div class="text-white/35 text-[9px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span class="w-1 h-1 rounded-full bg-white/25 shrink-0" />
              {{ t('board.previousSprints') }}
            </div>
            <div
              v-for="sprint in mockPreviousSprints"
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
      </div>

      <!-- ── Player Nodes ─────────────────────────────────────────────────── -->
      <!-- Each node anchor is a zero-size absolute div positioned at the AVATAR CENTER.
           Children use absolute positioning + transform to place themselves around that point.
           SVG lines connect from hub to this exact anchor (= avatar center). -->
      <div
        v-for="player in orderedPlayers"
        :key="player.id"
        class="absolute w-0 h-0"
        :style="nodeAnchorStyle(player)"
      >
        <!-- Opponent cards: pushed toward the Main Repository hub -->
        <div
          v-if="!player.isLocal"
          class="absolute flex gap-1.5"
          :style="opponentCardsStyle(player)"
        >
          <div
            v-for="cardId in cardIds(player.id)"
            :key="cardId"
            class="opponent-card relative rounded-lg shadow-md cursor-pointer"
            :class="[cardGlowClass(cardId), { 'card-locked': lockedCardId === cardId }]"
            @mouseenter="onCardHoverEnter(cardId)"
            @mouseleave="onCardHoverLeave()"
            @click.stop="onCardClick(cardId)"
          >
            <div
              v-if="cardThinkingPlayer(cardId)"
              class="thinking-tooltip absolute -top-9 left-1/2 -translate-x-1/2 bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink whitespace-nowrap shadow-lg pointer-events-none"
              style="z-index:35"
            >
              {{ t('board.thinkingAbout', { name: cardThinkingPlayer(cardId).name }) }}
            </div>
            <span class="card-watermark absolute inset-0 flex items-center justify-center font-black font-mono select-none pointer-events-none">404</span>
            <span v-if="lockedCardId === cardId" class="lock-pin absolute top-1 left-1 rounded-full bg-blue-500 pointer-events-none" style="z-index:5" />
            <div v-if="cardHoverers(cardId).length" class="absolute -top-2 -right-1 flex" style="z-index:10">
              <div
                v-for="(hoverer, idx) in cardHoverers(cardId)"
                :key="hoverer.id"
                class="w-4 h-4 rounded-full bg-blue-700 text-white text-[8px] font-bold flex items-center justify-center border border-white shadow-sm"
                :style="{ marginLeft: idx > 0 ? '-5px' : '0', zIndex: idx }"
                :title="hoverer.name"
              >
                {{ hoverer.name.charAt(0).toUpperCase() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Avatar — absolutely centered on the anchor point (= SVG line endpoint) -->
        <div
          class="absolute w-11 h-11 rounded-full font-bold text-base flex items-center justify-center shadow-sm bg-chip-bg text-chip-text transition-all duration-200"
          :class="player.isLocal
            ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-[var(--page-bg)]'
            : 'ring-1 ring-border'"
          style="top:0; left:0; transform: translate(-50%, -50%);"
        >
          {{ player.name.charAt(0).toUpperCase() }}
        </div>

        <!-- Name + YOU badge — 8px below avatar bottom -->
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
        </div>

        <!-- Local player large cards — spaced well below name -->
        <div v-if="player.isLocal" class="absolute flex gap-3" style="top:0; left:0; transform: translate(-50%, calc(22px + 8px + 20px + 12px));">
          <div
            v-for="(cardId, i) in localCardIds"
            :key="cardId"
            class="card-fan-slot"
            :style="{ transform: `rotate(${(i - 0.5) * 7}deg)`, transformOrigin: 'bottom center' }"
          >
            <div
              class="local-card relative rounded-xl shadow-xl cursor-pointer"
              :class="[cardGlowClass(cardId), { 'card-locked': lockedCardId === cardId }]"
              @mouseenter="onCardHoverEnter(cardId)"
              @mouseleave="onCardHoverLeave()"
              @click.stop="onCardClick(cardId)"
            >
              <div
                v-if="cardThinkingPlayer(cardId)"
                class="thinking-tooltip absolute -top-9 left-1/2 -translate-x-1/2 bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink whitespace-nowrap shadow-lg pointer-events-none"
                style="z-index:35"
              >
                {{ t('board.thinkingAbout', { name: cardThinkingPlayer(cardId).name }) }}
              </div>
              <span class="card-watermark-lg absolute inset-0 flex items-center justify-center font-black font-mono select-none pointer-events-none">404</span>
              <span v-if="lockedCardId === cardId" class="lock-pin-lg absolute top-1.5 left-1.5 rounded-full bg-blue-500 pointer-events-none" style="z-index:5" />
              <div v-if="cardHoverers(cardId).length" class="absolute -top-3 -right-1.5 flex" style="z-index:10">
                <div
                  v-for="(hoverer, idx) in cardHoverers(cardId)"
                  :key="hoverer.id"
                  class="w-6 h-6 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-md"
                  :style="{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: idx }"
                  :title="hoverer.name"
                >
                  {{ hoverer.name.charAt(0).toUpperCase() }}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </main>

  </div>
</template>

<style scoped>
.topology-board {
  min-height: 500px;
}

.topology-bg {
  background-image: radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px);
  background-size: 28px 28px;
}

/* ── Main Repository Hub ──────────────────────────────────────────────────── */
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

/* ── Merged cards (face-up in hub) ────────────────────────────────────────── */
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

.merged-card-commit {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid rgba(74, 222, 128, 0.45);
  color: #166534;
}

.merged-card-error {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid rgba(252, 165, 165, 0.55);
  color: #991b1b;
}

.merged-card-panic {
  background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%);
  border: 1px solid rgba(240, 171, 252, 0.55);
  color: #86198f;
}

.card-type-tag {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

/* ── History chips ────────────────────────────────────────────────────────── */
.history-chip {
  width: 10px;
  height: 14px;
  border-radius: 3px;
  opacity: 0.65;
  flex-shrink: 0;
}

.history-chip.merged-card-commit { background: #4ade80; }
.history-chip.merged-card-error  { background: #f87171; }
.history-chip.merged-card-panic  { background: #c084fc; }

/* ── Opponent cards ───────────────────────────────────────────────────────── */
.opponent-card {
  width: 38px;
  height: 54px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid rgba(148, 163, 184, 0.45);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  overflow: visible;
}

.opponent-card:hover,
.opponent-card.card-locked {
  transform: translateY(-3px);
}

/* ── Local player cards ───────────────────────────────────────────────────── */
.local-card {
  width: 76px;
  height: 110px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1.5px solid rgba(148, 163, 184, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: visible;
}

.local-card:hover,
.local-card.card-locked {
  transform: translateY(-10px);
}

/* ── Card watermarks ─────────────────────────────────────────────────────── */
.card-watermark {
  font-size: 10px;
  color: rgba(148, 163, 184, 0.55);
  user-select: none;
}

.card-watermark-lg {
  font-size: 22px;
  color: rgba(148, 163, 184, 0.4);
  user-select: none;
}

/* ── Lock pin indicators ─────────────────────────────────────────────────── */
.lock-pin {
  width: 5px;
  height: 5px;
  box-shadow: 0 0 4px rgba(59, 130, 246, 0.9);
}

.lock-pin-lg {
  width: 7px;
  height: 7px;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.9);
}

/* ── Glow classes ────────────────────────────────────────────────────────── */
.card-glow-blue {
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.8) !important;
}

.card-glow-yellow {
  box-shadow: 0 0 15px rgba(250, 204, 21, 0.6) !important;
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
</style>
