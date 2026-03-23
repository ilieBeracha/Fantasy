import { useState, useRef, useEffect, useCallback } from "react";

async function checkAuth() {
  const res = await fetch("/auth/status", { credentials: "include" });
  return res.json();
}

async function sendMessage(messages, leagueKey, teamKey) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages, leagueKey, teamKey }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function renderText(text) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith("**") && seg.endsWith("**") ? (
        <strong key={j} style={{ color: "#c4b5fd" }}>{seg.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{seg}</span>
      )
    );
    return <div key={i} style={{ marginBottom: line === "" ? 8 : 2 }}>{parts}</div>;
  });
}

export default function App() {
  const [auth, setAuth] = useState({ checked: false, authenticated: false });
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leagueKey] = useState(null);
  const [teamKey] = useState(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkAuth().then((data) => {
      setAuth({ checked: true, authenticated: data.authenticated });
      if (data.authenticated) {
        setMessages([{
          role: "assistant",
          text: "Hey! I'm connected to your Yahoo Fantasy league. What do you want to know?",
          suggestions: ["Show me my leagues", "What are the standings?", "Who's on my roster?", "Best free agents available?"],
        }]);
      }
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") window.history.replaceState({}, "", "/");
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setIsLoading(true);

    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);

    try {
      const data = await sendMessage(newHistory, leagueKey, teamKey);
      setChatHistory((prev) => [...prev, { role: "assistant", content: data.response }]);
      setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${error.message}`, isError: true }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, chatHistory, leagueKey, teamKey]);

  if (!auth.checked) {
    return (
      <div style={styles.center}>
        <p style={{ color: "#64748b" }}>Checking connection...</p>
      </div>
    );
  }

  if (!auth.authenticated) {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏈</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Fantasy League AI</h1>
          <p style={{ color: "#94a3b8", marginBottom: 32, lineHeight: 1.6 }}>
            Connect your Yahoo account to chat with an AI that knows your league.
          </p>
          <a href="/auth/yahoo" style={styles.loginBtn}>🔐 Connect with Yahoo</a>
          <p style={{ color: "#334155", fontSize: 12, marginTop: 16 }}>Read-only access to Fantasy Sports data.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>🏈</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Fantasy League AI</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Yahoo Fantasy Sports</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 11, color: "#64748b" }}>Live</span>
        </div>
      </div>

      <div ref={chatRef} style={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.userBubble : styles.aiBubble), ...(msg.isError ? { borderColor: "#ef4444" } : {}) }}>
              {renderText(msg.text)}
            </div>
            {msg.suggestions && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {msg.suggestions.map((s, j) => (
                  <button key={j} onClick={() => handleSend(s)} style={styles.suggestion}>{s}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ ...styles.bubble, ...styles.aiBubble, alignSelf: "flex-start" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: `bounce 1.2s infinite ${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputWrap}>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask about your fantasy league..." style={styles.input} />
          <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} style={{ ...styles.sendBtn, background: input.trim() ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "#1e2330", color: input.trim() ? "#fff" : "#475569", cursor: input.trim() ? "pointer" : "default" }}>↑</button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-6px);opacity:1} }`}</style>
    </div>
  );
}

const styles = {
  center: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0c10" },
  loginBtn: { display: "inline-block", padding: "14px 32px", background: "linear-gradient(135deg,#6001d2,#6366f1)", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: 16 },
  container: { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#0a0c10" },
  header: { padding: "14px 20px", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", gap: 12, background: "#0d0f14" },
  logo: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: 18 },
  chatArea: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  bubble: { padding: "12px 16px", fontSize: 14, lineHeight: 1.6, color: "#e2e8f0" },
  userBubble: { borderRadius: "16px 16px 4px 16px", background: "linear-gradient(135deg,#4f46e5,#6366f1)" },
  aiBubble: { borderRadius: "16px 16px 16px 4px", background: "#151821", border: "1px solid #1e2330" },
  suggestion: { background: "transparent", border: "1px solid #2d3348", borderRadius: 20, padding: "6px 14px", color: "#818cf8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  inputArea: { padding: "12px 16px 16px", borderTop: "1px solid #1e2330", background: "#0d0f14" },
  inputWrap: { display: "flex", alignItems: "center", gap: 8, background: "#111318", borderRadius: 14, border: "1px solid #1e2330", padding: "4px 4px 4px 16px" },
  input: { flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit" },
  sendBtn: { width: 36, height: 36, borderRadius: 10, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all 0.2s" },
};
