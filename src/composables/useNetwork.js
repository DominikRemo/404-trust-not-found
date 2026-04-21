import { ref, markRaw } from 'vue'
import Peer from 'peerjs'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(len = 6) {
  return Array.from({ length: len }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

function sanitizeName(name) {
  return typeof name === 'string' ? name.trim().slice(0, 24) || 'Unknown' : 'Unknown'
}

export function useNetwork() {
  const peer = ref(null)
  const peerId = ref('')
  const localName = ref('')
  const isHost = ref(false)
  const isReady = ref(false)
  const players = ref([])   // { id, name }[]
  const openConns = ref([]) // host: active DataConnections
  const hostConn = ref(null)
  const error = ref('')
  const gameStarted = ref(false)
  const sessionEnded = ref(false)

  // host-side name registry: peerId -> name
  const nameRegistry = {}

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
      }
    })

    function removeConn() {
      openConns.value = openConns.value.filter(c => c.peer !== remotePeer)
      delete nameRegistry[remotePeer]
      broadcastPlayerList()
    }

    conn.on('close', removeConn)
    conn.on('error', removeConn)
  }

  function tryInitHost(code, attempt = 0) {
    if (attempt > 5) {
      error.value = 'Could not generate a unique room code. Please try again.'
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
      conn.on('open', () => registerConn(conn))
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
    if (!isHost.value) return
    openConns.value.forEach(c => c.send({ type: 'GAME_STARTED' }))
    gameStarted.value = true
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
    Object.keys(nameRegistry).forEach(k => delete nameRegistry[k])
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
    initHost,
    joinGame,
    changeName,
    startGame,
    leaveSession,
    reset,
  }
}
