import { ref } from 'vue'
import Peer from 'peerjs'

export function useNetwork() {
  const peer = ref(null)
  const peerId = ref('')
  const isHost = ref(false)
  const isReady = ref(false)
  const connectedPeers = ref([])
  const hostConn = ref(null)
  const openConns = ref([])
  const error = ref('')

  function broadcastPlayerList() {
    const list = [peerId.value, ...openConns.value.map(c => c.peer)]
    const msg = { type: 'PLAYER_LIST', peers: list }
    openConns.value.forEach(c => c.send(msg))
    connectedPeers.value = list
  }

  function registerHostConn(conn) {
    openConns.value.push(conn)
    broadcastPlayerList()

    conn.on('close', () => {
      openConns.value = openConns.value.filter(c => c !== conn)
      broadcastPlayerList()
    })
    conn.on('error', () => {
      openConns.value = openConns.value.filter(c => c !== conn)
      broadcastPlayerList()
    })
  }

  function initHost() {
    isHost.value = true
    error.value = ''
    const p = new Peer()
    peer.value = p

    p.on('open', id => {
      peerId.value = id
      connectedPeers.value = [id]
      isReady.value = true
    })

    p.on('connection', conn => {
      conn.on('open', () => registerHostConn(conn))
    })

    p.on('error', err => {
      error.value = err.message
    })
  }

  function joinGame(hostId) {
    isHost.value = false
    error.value = ''
    const p = new Peer()
    peer.value = p

    p.on('open', id => {
      peerId.value = id
      const conn = p.connect(hostId.trim())
      hostConn.value = conn

      conn.on('open', () => {
        isReady.value = true
      })

      conn.on('data', msg => {
        if (msg?.type === 'PLAYER_LIST') {
          connectedPeers.value = msg.peers
        }
      })

      conn.on('close', () => {
        isReady.value = false
        error.value = 'Disconnected from host.'
      })

      conn.on('error', err => {
        error.value = err.message
      })
    })

    p.on('error', err => {
      error.value = err.message
    })
  }

  function destroy() {
    peer.value?.destroy()
    peer.value = null
    peerId.value = ''
    isReady.value = false
    isHost.value = false
    connectedPeers.value = []
    openConns.value = []
    hostConn.value = null
    error.value = ''
  }

  return {
    peerId,
    isHost,
    isReady,
    connectedPeers,
    error,
    initHost,
    joinGame,
    destroy,
  }
}