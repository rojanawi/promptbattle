import { useState, useEffect, useRef } from 'react'
import Peer, { DataConnection } from 'peerjs'
import './App.css'

interface Message {
  text: string
  senderId: string
  isMine: boolean
}

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'error' | 'success'
}

interface Connection {
  id: string
  connection: DataConnection
}

function App() {
  const [peerId, setPeerId] = useState<string>('')
  const [remotePeerId, setRemotePeerId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [connections, setConnections] = useState<Connection[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const peerRef = useRef<Peer | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const initialPeerIdRef = useRef<string | null>(null)

  // Get peerId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const initialPeerId = urlParams.get('peerId')
    if (initialPeerId) {
      initialPeerIdRef.current = initialPeerId
      setRemotePeerId(initialPeerId)
      addLog(`Found peer ID in URL: ${initialPeerId}`)
    }
  }, [])

  // Auto-connect only when coming from URL
  useEffect(() => {
    if (peerId && initialPeerIdRef.current && !connections.length) {
      addLog('Auto-connecting to peer from URL...')
      connectToPeer()
    }
  }, [peerId, connections.length])

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
      
      // Add new connection to list
      setConnections(prev => [...prev, { id: conn.peer, connection: conn }])

      conn.on('data', (data) => {
        addLog(`Received message from ${conn.peer}: ${data}`)
        setMessages(prev => [...prev, { 
          text: data as string, 
          senderId: conn.peer,
          isMine: false 
        }])
      })

      conn.on('close', () => {
        addLog(`Connection closed with ${conn.peer}`)
        setConnections(prev => prev.filter(c => c.id !== conn.peer))
      })

      conn.on('error', (err) => {
        addLog(`Connection error with ${conn.peer}: ${err}`, 'error')
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

    setIsConnecting(true)
    addLog(`Attempting to connect to: ${remotePeerId}`)
    const conn = peerRef.current.connect(remotePeerId, {
      metadata: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    })

    conn.on('open', () => {
      addLog('Connection opened', 'success')
      addLog(`Connection metadata: ${JSON.stringify(conn.metadata)}`)
      setConnections(prev => [...prev, { id: conn.peer, connection: conn }])
      setIsConnecting(false)
    })

    conn.on('data', (data) => {
      addLog(`Received message from ${conn.peer}: ${data}`)
      setMessages(prev => [...prev, { 
        text: data as string, 
        senderId: conn.peer,
        isMine: false 
      }])
    })

    conn.on('close', () => {
      addLog(`Connection closed with ${conn.peer}`)
      setConnections(prev => prev.filter(c => c.id !== conn.peer))
      setIsConnecting(false)
    })

    conn.on('error', (err) => {
      addLog(`Connection error with ${conn.peer}: ${err}`, 'error')
      setIsConnecting(false)
    })
  }

  const sendMessage = () => {
    if (!message.trim()) return

    // Send message to all connected peers
    connections.forEach(({ connection }) => {
      addLog(`Sending message to ${connection.peer}: ${message}`)
      connection.send(message)
      setMessages(prev => [...prev, { 
        text: message, 
        senderId: peerId,
        isMine: true 
      }])
    })
    setMessage('')
  }

  return (
    <div className="chat-container">
      <h1>PeerJS Chat</h1>
      <div className="peer-id-container">
        <p>Your ID: {peerId}</p>
        {peerId && (
          <>
            <button 
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(peerId)
                addLog('ID copied to clipboard', 'success')
              }}
            >
              Copy ID
            </button>
            <button 
              className="copy-button"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?peerId=${peerId}`
                navigator.clipboard.writeText(url)
                addLog('Share link copied to clipboard', 'success')
              }}
            >
              Copy Link
            </button>
          </>
        )}
      </div>
      
      <div className="connections-list">
        <h3>Connected Peers ({connections.length})</h3>
        {connections.map(({ id }) => (
          <div key={id} className="connection-item">
            {id}
          </div>
        ))}
      </div>

      {!connections.length ? (
        <div className="input-group">
          <input
            type="text"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter peer ID to connect"
            disabled={isConnecting}
          />
          <button 
            onClick={connectToPeer}
            disabled={isConnecting || !remotePeerId}
            className={isConnecting ? 'connecting' : ''}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      ) : (
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.isMine ? 'my-message' : ''}`}>
              <div className="message-sender">
                {msg.isMine ? 'You' : `Peer ${msg.senderId.slice(0, 6)}...`}
              </div>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}
        </div>
      )}

      {connections.length > 0 && (
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
