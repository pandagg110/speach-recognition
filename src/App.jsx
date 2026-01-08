import { useEffect, useRef, useState } from 'react'
import './App.css'

const describeError = (error) => {
  switch (error) {
    case 'not-allowed':
      return '浏览器未授予麦克风权限，请检查设置后重试。'
    case 'network':
      return '网络异常，语音识别暂不可用。'
    case 'no-speech':
      return '没有捕捉到声音，请靠近麦克风再试一次。'
    default:
      return '语音识别遇到问题，请稍后重试。'
  }
}

const createRecognition = () => {
  if (typeof window === 'undefined') return null
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return null

  const recognition = new SpeechRecognition()
  recognition.lang = 'cmn-Hans-CN' // 普通话 (中国大陆)
  recognition.continuous = true
  recognition.interimResults = false
  return recognition
}

function App() {
  const recognitionRef = useRef(null)
  const manualStopRef = useRef(false)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [lastTranscript, setLastTranscript] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const recognition = createRecognition()
    if (!recognition) {
      setSupported(false)
      setError('当前浏览器不支持 Web Speech API，示例将改为调用后端接口。')
      console.log('调用后端接口')
      return undefined
    }

    recognitionRef.current = recognition

    recognition.onstart = () => {
      setListening(true)
      setError('')
    }

    recognition.onend = () => {
      if (manualStopRef.current) {
        setListening(false)
        return
      }
      // 自动衔接下一段，直到用户点击“停止”
      try {
        recognition.start()
      } catch (err) {
        setListening(false)
      }
    }

    recognition.onerror = (event) => {
      setError(describeError(event.error))
      setListening(false)
    }

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1][0]
      const transcript = latest.transcript.trim()
      const confidence =
        typeof latest.confidence === 'number' ? latest.confidence : 0

      setLastTranscript(transcript)
      setHistory((prev) =>
        [{ text: transcript, confidence }, ...prev].slice(0, 8),
      )
    }

    return () => {
      recognition.stop()
    }
  }, [])

  const handleStart = () => {
    if (!recognitionRef.current) {
      console.log('调用后端接口')
      return
    }
    manualStopRef.current = false
    setError('')
    try {
      recognitionRef.current.start()
    } catch (err) {
      setError('语音识别正在运行，或浏览器暂不允许启动。请稍后再试。')
    }
  }

  const handleStop = () => {
    if (!recognitionRef.current) {
      console.log('调用后端接口')
      return
    }
    manualStopRef.current = true
    recognitionRef.current.stop()
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">语音转文字 · 实验室</p>
        <h1>一键捕捉你的想法</h1>
        <p className="lede">
          基于浏览器原生 Web Speech API，点击开始对话即可转成普通话文本。
        </p>

        <div className="status-row">
          <div className={`status-chip ${listening ? 'active' : ''}`}>
            <span className="dot" />
            {listening ? '正在聆听…' : '已就绪'}
          </div>
          <span className="meta">语言：普通话（中国大陆）</span>
          {!supported && (
            <span className="meta warn">浏览器不支持，将改为调用后端接口</span>
          )}
        </div>

        <div className="controls">
          <button
            className="btn primary"
            type="button"
            onClick={handleStart}
            disabled={!supported || listening}
          >
            🎙️ 开始录音
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={handleStop}
            disabled={!supported || !listening}
          >
            ■ 停止
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>最新识别</h2>
          <span className="hint">
            {lastTranscript ? '自动捕获最后一句话' : '点击开始后，显示第一段识别结果'}
          </span>
        </div>
        <div className={`transcript ${listening ? 'listening' : ''}`}>
          {lastTranscript || '等待输入中…'}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>历史片段</h2>
          <span className="hint">最多保留最近的 8 条转写</span>
        </div>
        {history.length ? (
          <ul className="history">
            {history.map((item, index) => (
              <li key={index} className="history-item">
                <div className="history-top">
                  <span className="badge">#{history.length - index}</span>
                  <span className="confidence">
                    置信度 {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">还没有记录，先点击“开始录音”试一试吧。</p>
        )}
      </section>

      <section className="panel tips">
        <h3>使用贴士</h3>
        <ul>
          <li>首次使用需要授予浏览器麦克风权限。</li>
          <li>
            在不支持 Web Speech API 的环境下，控制台会打印 “调用后端接口” 以提示对接服务端识别。
          </li>
          <li>语言参数已设置为普通话，可按需切换其他语种。</li>
        </ul>
      </section>
    </div>
  )
}

export default App
