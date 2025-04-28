import { useState, useEffect, useRef } from 'react'
import Peer, { DataConnection } from 'peerjs'
import './App.css'

interface Message {
  text: string
  isMine: boolean
}

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'error' | 'success'
}

function App() {
  const [peerId, setPeerId] = useState<string>('')
  const [remotePeerId, setRemotePeerId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const peerRef = useRef<Peer | null>(null)
  const connectionRef = useRef<DataConnection | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Get peerId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const initialPeerId = urlParams.get('peerId')
    if (initialPeerId) {
      setRemotePeerId(initialPeerId)
      addLog(`Found peer ID in URL: ${initialPeerId}`)
    }
  }, [])

  // Auto-connect when both peer IDs are available
  useEffect(() => {
    if (peerId && remotePeerId && !isConnected) {
      addLog('Auto-connecting to peer from URL...')
      connectToPeer()
    }
  }, [peerId, remotePeerId, isConnected])

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
    // Scroll to bottom of logs
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  useEffect(() => {
    // Initialize PeerJS with enhanced configuration for mobile networks
    const peer = new Peer({
      debug: 3,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'stun:openrelay.metered.ca:80'
          }
        ]
      }
    })
    peerRef.current = peer

    // When the peer is open, set the peer ID
    peer.on('open', (id) => {
      addLog(`Peer opened with ID: ${id}`, 'success')
      setPeerId(id)
    })

    // Handle incoming connections
    peer.on('connection', (conn) => {
      addLog(`Incoming connection from: ${conn.peer}`, 'success')
      addLog(`Connection metadata: ${JSON.stringify(conn.metadata)}`)
      connectionRef.current = conn
      setRemotePeerId(conn.peer)
      setIsConnected(true)

      // Handle incoming messages
      conn.on('data', (data) => {
        addLog(`Received message: ${data}`)
        setMessages(prev => [...prev, { text: data as string, isMine: false }])
      })

      // Handle connection close
      conn.on('close', () => {
        addLog('Connection closed')
        setIsConnected(false)
        connectionRef.current = null
        setRemotePeerId('')
      })

      // Handle connection errors
      conn.on('error', (err) => {
        addLog(`Connection error: ${err}`, 'error')
        addLog(`Connection state: ${conn.peerConnection?.connectionState}`, 'error')
        addLog(`ICE connection state: ${conn.peerConnection?.iceConnectionState}`, 'error')
      })

      // Monitor ICE connection state
      conn.peerConnection?.addEventListener('iceconnectionstatechange', () => {
        addLog(`ICE connection state changed to: ${conn.peerConnection?.iceConnectionState}`)
      })

      // Monitor connection state
      conn.peerConnection?.addEventListener('connectionstatechange', () => {
        addLog(`Connection state changed to: ${conn.peerConnection?.connectionState}`)
      })
    })

    // Handle peer errors
    peer.on('error', (err) => {
      addLog(`Peer error: ${err}`, 'error')
      if (err.type === 'peer-unavailable') {
        addLog('Peer is unavailable. They might be offline or behind a strict firewall.', 'error')
      } else if (err.type === 'disconnected') {
        addLog('Disconnected from signaling server. Attempting to reconnect...', 'error')
      }
    })

    return () => {
      addLog('Cleaning up peer')
      peer.destroy()
    }
  }, [])

  const connectToPeer = () => {
    if (!peerRef.current || !remotePeerId) return

    addLog(`Attempting to connect to: ${remotePeerId}`)
    const conn = peerRef.current.connect(remotePeerId, {
      metadata: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    })
    connectionRef.current = conn

    conn.on('open', () => {
      addLog('Connection opened', 'success')
      addLog(`Connection metadata: ${JSON.stringify(conn.metadata)}`)
      setIsConnected(true)
    })

    conn.on('data', (data) => {
      addLog(`Received message: ${data}`)
      setMessages(prev => [...prev, { text: data as string, isMine: false }])
    })

    conn.on('close', () => {
      addLog('Connection closed')
      setIsConnected(false)
      connectionRef.current = null
      setRemotePeerId('')
    })

    conn.on('error', (err) => {
      addLog(`Connection error: ${err}`, 'error')
      addLog(`Connection state: ${conn.peerConnection?.connectionState}`, 'error')
      addLog(`ICE connection state: ${conn.peerConnection?.iceConnectionState}`, 'error')
    })

    // Monitor ICE connection state
    conn.peerConnection?.addEventListener('iceconnectionstatechange', () => {
      addLog(`ICE connection state changed to: ${conn.peerConnection?.iceConnectionState}`)
    })

    // Monitor connection state
    conn.peerConnection?.addEventListener('connectionstatechange', () => {
      addLog(`Connection state changed to: ${conn.peerConnection?.connectionState}`)
    })
  }

  const sendMessage = () => {
    if (!connectionRef.current || !message.trim()) return

    addLog(`Sending message: ${message}`)
    connectionRef.current.send(message)
    setMessages(prev => [...prev, { text: message, isMine: true }])
    setMessage('')
  }

  return (
    <div className="chat-container">
      <h1>PeerJS Chat</h1>
      <div className="peer-id-container">
        <p>Your ID: {peerId}</p>
        {peerId && (
          <button 
            className="copy-button"
            onClick={() => {
              navigator.clipboard.writeText(peerId)
              addLog('ID copied to clipboard', 'success')
            }}
          >
            Copy ID
          </button>
        )}
      </div>
      
      {!isConnected ? (
        <div className="input-group">
          <input
            type="text"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter peer ID to connect"
          />
          <button onClick={connectToPeer}>Connect</button>
        </div>
      ) : (
        <p>Connected to {remotePeerId}</p>
      )}

      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.isMine ? 'my-message' : ''}`}>
            {msg.text}
          </div>
        ))}
      </div>

      {isConnected && (
        <div className="input-group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}

      <div className="logs-section">
        <button 
          className="toggle-logs"
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
        
        {showLogs && (
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type}`}>
                <span className="timestamp">[{log.timestamp}]</span>
                <span className="message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
