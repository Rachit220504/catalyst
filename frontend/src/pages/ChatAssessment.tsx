import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Send, Bot, User, Loader2 } from 'lucide-react';

// Changed to strictly match LandingPage.tsx
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
type Message = { role: 'ai' | 'user'; content: string };

export default function ChatAssessment() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { sessionId: string; jobDescription: string } | null;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content:
        "Hello! I've reviewed your resume and the job description. I'll be assessing 3 specific skills. Let's dive in — are you ready for the first question?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!state?.sessionId) return <Navigate to="/" />;

  if (generatingPlan) {
    return (
      <div className="generating-overlay fade-in">
        <div className="spinner-ring" />
        <p className="generating-text">Analyzing Your Assessment</p>
        <p className="generating-sub">Crafting your personalized learning plan…</p>
      </div>
    );
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          userMessage: userMsg,
          jobDescription: state.jobDescription
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.details || `Server returned ${res.status}`);
      }

      const aiResponse = data.response as string;

      if (aiResponse.includes('[EVALUATION_COMPLETE]')) {
        setGeneratingPlan(true);
        const planRes = await fetch(`${API_URL}/api/generate-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: state.sessionId })
        });
        
        if (!planRes.ok) {
           const planErr = await planRes.json();
           throw new Error(planErr.error || 'Failed to generate plan');
        }

        const planData = await planRes.json();
        navigate('/dashboard', { state: { plan: planData } });
      } else {
        setMessages((prev) => [...prev, { role: 'ai', content: aiResponse }]);
        setQuestionNum((n) => Math.min(n + 1, 3));
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Connection error: ${err.message}. Please check the backend is running.` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-wrap fade-in">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-avatar">
            <Bot size={22} />
          </div>
          <div className="chat-header-info">
            <h2>AI Technical Assessor</h2>
            <div className="online-badge">
              <span className="online-dot" /> Online
            </div>
          </div>
          <div className="chat-progress">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`progress-step ${i < questionNum ? 'done' : ''}`}
                title={`Question ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-area">
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
              <div className={`msg-icon ${m.role}`}>
                {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className={`msg-bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="msg-row ai">
              <div className="msg-icon ai">
                <Bot size={15} />
              </div>
              <div className="msg-bubble ai">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chat-input-area" onSubmit={sendMessage}>
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            disabled={loading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}