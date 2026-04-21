import { ref, computed, markRaw } from 'vue'
import Peer from 'peerjs'
import { i18n } from '../i18n/index.js'

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
          gameStarted.value = true
        } else if (msg?.type === 'SESSION_CLOSED') {
          sessionEnded.value = true
        } else if (msg?.type === 'LOBBY_FULL') {
          error.value = i18n.global.t('errors.lobbyFull')
          conn.close()
          isReady.value = false
        } else if (msg?.type === 'CARD_HOVER_BROADCAST') {
          cardHoverStates.value = msg.states
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
    openConns.value.forEach(c => c.send({ type: 'GAME_STARTED' }))
    gameStarted.value = true
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
    Object.keys(nameRegistry).forEach(k => delete nameRegistry[k])
    Object.keys(cardHoverRegistry).forEach(k => delete cardHoverRegistry[k])
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
    hostPeerId,
    initHost,
    joinGame,
    changeName,
    startGame,
    sendCardHover,
    sendClearHover,
    leaveSession,
    reset,
  }
}
