import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
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
  const connectionRef = useRef<Peer.DataConnection | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
    // Scroll to bottom of logs
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  useEffect(() => {
    // Initialize PeerJS with debug logging
    const peer = new Peer({
      debug: 3 // 0 = no logging, 1 = errors only, 2 = errors + warnings, 3 = all logs
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
      })
    })

    // Handle peer errors
    peer.on('error', (err) => {
      addLog(`Peer error: ${err}`, 'error')
    })

    return () => {
      addLog('Cleaning up peer')
      peer.destroy()
    }
  }, [])

  const connectToPeer = () => {
    if (!peerRef.current || !remotePeerId) return

    addLog(`Attempting to connect to: ${remotePeerId}`)
    const conn = peerRef.current.connect(remotePeerId)
    connectionRef.current = conn

    conn.on('open', () => {
      addLog('Connection opened', 'success')
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
      <p>Your ID: {peerId}</p>
      
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
