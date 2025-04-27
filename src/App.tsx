import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
import './App.css'

interface Message {
  text: string
  isMine: boolean
}

function App() {
  const [peerId, setPeerId] = useState<string>('')
  const [remotePeerId, setRemotePeerId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const peerRef = useRef<Peer | null>(null)
  const connectionRef = useRef<Peer.DataConnection | null>(null)

  useEffect(() => {
    // Initialize PeerJS
    const peer = new Peer()
    peerRef.current = peer

    // When the peer is open, set the peer ID
    peer.on('open', (id) => {
      setPeerId(id)
    })

    // Handle incoming connections
    peer.on('connection', (conn) => {
      connectionRef.current = conn
      setRemotePeerId(conn.peer) // Set the remote peer ID when someone connects to us
      setIsConnected(true)

      // Handle incoming messages
      conn.on('data', (data) => {
        setMessages(prev => [...prev, { text: data as string, isMine: false }])
      })

      // Handle connection close
      conn.on('close', () => {
        setIsConnected(false)
        connectionRef.current = null
        setRemotePeerId('')
      })
    })

    return () => {
      peer.destroy()
    }
  }, [])

  const connectToPeer = () => {
    if (!peerRef.current || !remotePeerId) return

    const conn = peerRef.current.connect(remotePeerId)
    connectionRef.current = conn

    conn.on('open', () => {
      setIsConnected(true)
    })

    conn.on('data', (data) => {
      setMessages(prev => [...prev, { text: data as string, isMine: false }])
    })

    conn.on('close', () => {
      setIsConnected(false)
      connectionRef.current = null
      setRemotePeerId('')
    })
  }

  const sendMessage = () => {
    if (!connectionRef.current || !message.trim()) return

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
    </div>
  )
}

export default App
