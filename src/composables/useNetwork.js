import { ref, computed, markRaw } from 'vue'
import Peer from 'peerjs'
import { i18n } from '../i18n/index.js'
import { useGameEngine } from './useGameEngine.js'

// Engine singleton — same instance everywhere
const _engine = useGameEngine()

const MIN_PLAYERS = 3
const MAX_PLAYERS = 10
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// ── Singleton state (module-scope) ──────────────────────────────────────────
const peer = ref(null)
const peerId = ref('')
const localName = ref('')
const isHost = ref(false)
const isReady = ref(false)
const players = ref([])
const openConns = ref([])
const hostConn = ref(null)
const error = ref('')
const gameStarted = ref(false)
const sessionEnded = ref(false)
const playAgainReadyIds = ref([])  // peer IDs ready for the next game

const cardHoverStates = ref([])

// Plain objects — not reactive; iterated in pure JS
const nameRegistry = {}
const cardHoverRegistry = {}

// ── Pure helpers ─────────────────────────────────────────────────────────────
function generateCode(len = 6) {
  return Array.from({ length: len }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

function sanitizeName(name) {
  return typeof name === 'string' ? name.trim().slice(0, 24) || 'Unknown' : 'Unknown'
}

// ── Player list helpers ───────────────────────────────────────────────────────
function buildPlayerList() {
  return [
    { id: peerId.value, name: localName.value },
    ...openConns.value.map(c => ({ id: c.peer, name: nameRegistry[c.peer] ?? c.peer })),
  ]
}

function broadcastPlayerList() {
  const list = buildPlayerList()
  players.value = list
  const msg = { type: 'PLAYER_LIST', players: list }
  openConns.value.forEach(c => c.send(msg))
}

// ── Game state broadcast — each client gets only their own hand unmasked ─────
function broadcastGameState() {
  openConns.value.forEach(c =>
    c.send({ type: 'GAME_STATE_UPDATE', state: _engine.serializeStateFor(c.peer) })
  )
}

// ── Play-again readiness broadcast ───────────────────────────────────────────
function broadcastPlayAgainState() {
  const msg = { type: 'PLAY_AGAIN_STATE', readyIds: playAgainReadyIds.value }
  openConns.value.forEach(c => c.send(msg))
}

// ── Trigger a new game without disconnecting anyone ───────────────────────────
function _triggerPlayAgain() {
  playAgainReadyIds.value = []
  _engine.setupGame(players.value)
  // GAME_STATE_UPDATE keeps gameStarted=true on clients; no lobby trip needed
  broadcastGameState()
}

// ── Card hover helpers ────────────────────────────────────────────────────────
function broadcastCardHoverUpdate() {
  const states = Object.entries(cardHoverRegistry).map(([id, val]) => ({ id, ...val }))
  cardHoverStates.value = states
  const msg = { type: 'CARD_HOVER_BROADCAST', states }
  openConns.value.forEach(c => c.send(msg))
}

// ── Connection management ─────────────────────────────────────────────────────
function registerConn(conn) {
  // markRaw prevents Vue from wrapping the PeerJS object in a Proxy,
  // which would break reference-equality checks inside PeerJS event handlers.
  openConns.value.push(markRaw(conn))

  const remotePeer = conn.peer

  conn.on('data', msg => {
    if (msg?.type === 'HELLO') {
      nameRegistry[remotePeer] = sanitizeName(msg.name)
      broadcastPlayerList()
    } else if (msg?.type === 'NAME_CHANGE') {
      nameRegistry[remotePeer] = sanitizeName(msg.name)
      broadcastPlayerList()
    } else if (msg?.type === 'CARD_HOVER') {
      cardHoverRegistry[remotePeer] = { name: nameRegistry[remotePeer] ?? remotePeer, cardId: msg.cardId }
      broadcastCardHoverUpdate()
    } else if (msg?.type === 'CARD_LEAVE') {
      delete cardHoverRegistry[remotePeer]
      broadcastCardHoverUpdate()
    } else if (msg?.type === 'PLAYER_ACTION') {
      const { action } = msg
      if (action?.type === 'MERGE_PR' && remotePeer === _engine.activeReviewer.value) {
        _engine.mergePR(action.targetId, action.cardIndex)
        broadcastGameState()
      } else if (action?.type === 'PLAYER_READY') {
        _engine.markReady(remotePeer)
        broadcastGameState()
      } else if (action?.type === 'PLAY_AGAIN_READY') {
        if (!playAgainReadyIds.value.includes(remotePeer)) {
          playAgainReadyIds.value = [...playAgainReadyIds.value, remotePeer]
        }
        broadcastPlayAgainState()
        // Check if all connected players (host + clients) are ready
        const allPlayerIds = players.value.map(p => p.id)
        const allReady = allPlayerIds.every(id =>
          id === peerId.value
            ? playAgainReadyIds.value.includes(peerId.value)
            : playAgainReadyIds.value.includes(id)
        )
        if (allReady) _triggerPlayAgain()
      }
    }
  })

  function removeConn() {
    openConns.value = openConns.value.filter(c => c.peer !== remotePeer)
    delete nameRegistry[remotePeer]
    delete cardHoverRegistry[remotePeer]
    broadcastPlayerList()
    broadcastCardHoverUpdate()
  }

  conn.on('close', removeConn)
  conn.on('error', removeConn)
}

function tryInitHost(code, attempt = 0) {
  if (attempt > 5) {
    error.value = i18n.global.t('errors.uniqueRoomCode')
    isHost.value = false
    return
  }

  const p = markRaw(new Peer(code))
  peer.value = p

  p.on('open', id => {
    peerId.value = id
    players.value = [{ id, name: localName.value }]
    isReady.value = true
  })

  p.on('connection', conn => {
    conn.on('open', () => {
      if (players.value.length >= MAX_PLAYERS) {
        conn.send({ type: 'LOBBY_FULL' })
        // Small delay so the message is flushed before the channel closes
        setTimeout(() => conn.close(), 200)
        return
      }
      registerConn(conn)
    })
  })

  p.on('error', err => {
    if (err.type === 'unavailable-id') {
      p.destroy()
      tryInitHost(generateCode(), attempt + 1)
    } else {
      error.value = err.message
    }
  })
}

// ── Exported composable ───────────────────────────────────────────────────────
export function useNetwork() {
  // The peer ID of whoever is hosting the current session.
  // For the host themselves this equals peerId; for guests it is the remote host's ID.
  const hostPeerId = computed(() => {
    if (isHost.value) return peerId.value
    return hostConn.value?.peer ?? ''
  })

  function initHost(name) {
    localName.value = name
    isHost.value = true
    error.value = ''
    tryInitHost(generateCode())
  }

  function joinGame(hostId, name) {
    localName.value = name
    isHost.value = false
    error.value = ''

    const p = markRaw(new Peer())
    peer.value = p

    p.on('open', id => {
      peerId.value = id
      const conn = markRaw(p.connect(hostId.trim().toUpperCase()))
      hostConn.value = conn

      conn.on('open', () => {
        conn.send({ type: 'HELLO', name: localName.value })
        isReady.value = true
      })

      conn.on('data', msg => {
        if (msg?.type === 'PLAYER_LIST') {
          players.value = msg.players
        } else if (msg?.type === 'GAME_STARTED') {
          if (msg.state) _engine.applyState(msg.state)
          gameStarted.value = true
        } else if (msg?.type === 'GAME_STATE_UPDATE') {
          _engine.applyState(msg.state)
        } else if (msg?.type === 'SESSION_CLOSED') {
          sessionEnded.value = true
        } else if (msg?.type === 'LOBBY_FULL') {
          error.value = i18n.global.t('errors.lobbyFull')
          conn.close()
          isReady.value = false
        } else if (msg?.type === 'CARD_HOVER_BROADCAST') {
          cardHoverStates.value = msg.states
        } else if (msg?.type === 'PLAY_AGAIN_STATE') {
          playAgainReadyIds.value = msg.readyIds
        }
      })

      conn.on('close', () => {
        if (!gameStarted.value && !sessionEnded.value) {
          sessionEnded.value = true
        }
      })

      conn.on('error', err => {
        error.value = err.message
      })
    })

    p.on('error', err => {
      error.value = err.message
    })
  }

  function changeName(newName) {
    localName.value = newName
    if (isHost.value) {
      broadcastPlayerList()
    } else if (hostConn.value?.open) {
      hostConn.value.send({ type: 'NAME_CHANGE', name: newName })
    }
  }

  function startGame() {
    if (!isHost.value || players.value.length < MIN_PLAYERS) return
    playAgainReadyIds.value = []
    _engine.setupGame(players.value)
    // Send each client only their own unmasked hand
    openConns.value.forEach(c =>
      c.send({ type: 'GAME_STARTED', state: _engine.serializeStateFor(c.peer) })
    )
    gameStarted.value = true
  }

  function dispatchAction(action) {
    if (isHost.value) {
      if (action.type === 'MERGE_PR') {
        _engine.mergePR(action.targetId, action.cardIndex)
        broadcastGameState()
      } else if (action.type === 'PLAYER_READY') {
        _engine.markReady(peerId.value)
        broadcastGameState()
      } else if (action.type === 'PLAY_AGAIN_READY') {
        if (!playAgainReadyIds.value.includes(peerId.value)) {
          playAgainReadyIds.value = [...playAgainReadyIds.value, peerId.value]
        }
        broadcastPlayAgainState()
        const allPlayerIds = players.value.map(p => p.id)
        const allReady = allPlayerIds.every(id => playAgainReadyIds.value.includes(id))
        if (allReady) _triggerPlayAgain()
      }
    } else if (hostConn.value?.open) {
      hostConn.value.send({ type: 'PLAYER_ACTION', action })
    }
  }

  function sendCardHover(cardId) {
    if (isHost.value) {
      cardHoverRegistry[peerId.value] = { name: localName.value, cardId }
      broadcastCardHoverUpdate()
    } else if (hostConn.value?.open) {
      hostConn.value.send({ type: 'CARD_HOVER', cardId })
    }
  }

  function sendClearHover() {
    if (isHost.value) {
      delete cardHoverRegistry[peerId.value]
      broadcastCardHoverUpdate()
    } else if (hostConn.value?.open) {
      hostConn.value.send({ type: 'CARD_LEAVE' })
    }
  }

  // Host-only: start next game with whoever is currently connected
  function forceStartNextGame() {
    if (!isHost.value) return
    _triggerPlayAgain()
  }

  function leaveSession() {
    if (isHost.value) {
      openConns.value.forEach(c => {
        try { c.send({ type: 'SESSION_CLOSED' }) } catch {}
      })
    }
    reset()
  }

  function reset() {
    peer.value?.destroy()
    peer.value = null
    peerId.value = ''
    isReady.value = false
    isHost.value = false
    players.value = []
    openConns.value = []
    hostConn.value = null
    error.value = ''
    gameStarted.value = false
    sessionEnded.value = false
    cardHoverStates.value = []
    playAgainReadyIds.value = []
    Object.keys(nameRegistry).forEach(k => delete nameRegistry[k])
    Object.keys(cardHoverRegistry).forEach(k => delete cardHoverRegistry[k])
    _engine.resetGame()
  }

  return {
    peerId,
    localName,
    isHost,
    isReady,
    players,
    error,
    gameStarted,
    sessionEnded,
    cardHoverStates,
    playAgainReadyIds,
    hostPeerId,
    initHost,
    joinGame,
    changeName,
    startGame,
    sendCardHover,
    sendClearHover,
    forceStartNextGame,
    leaveSession,
    reset,
    dispatchAction,
  }
}
