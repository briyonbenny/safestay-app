import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { validateRequired } from '../utils/validation.js';
import { useSafeStay } from '../context/SafeStayContext.jsx';
import { apiFetch, isApiModeEnabled } from '../api/safeStayApi.js';

/* Mock mode: short simulated replies (no server). */
const REPLY_AS_OWNER = [
  'Thanks for your message. I can share more details or book a viewing when it suits you.',
  'I am still receiving enquiries — the place is open for September. I will reply with photos shortly.',
];
const REPLY_AS_STUDENT = [
  'Thanks — I am still looking and I will get back to you with questions.',
  'Sounds good. I can do a call later this week if you have time.',
];
const pickReply = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * True if this message was sent by the logged-in user (API returns from.id; session may only have email until /api/auth/me runs).
 */
const isMineMessage = (m, user) => {
  if (!user || !m?.from) return false;
  const fromId = m.from.id;
  if (fromId != null && user.id != null && String(fromId) === String(user.id)) return true;
  const fe = m.from.email;
  const ue = user.email;
  if (fe && ue && String(fe).toLowerCase() === String(ue).toLowerCase()) return true;
  // Mock mode uses from.id = email; API may briefly render before user.id is hydrated from /api/auth/me
  if (fromId != null && ue && String(fromId).toLowerCase() === String(ue).toLowerCase()) return true;
  return false;
};

/**
 * Messages: with VITE_USE_API, real threads via /api/messages; otherwise a short mock chat.
 */
export const ChatPage = () => {
  const { user } = useSafeStay();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const listingId = searchParams.get('listingId') || location.state?.listingId;
  const peerUserId = searchParams.get('peerUserId') || location.state?.peerUserId;
  const fromListing = location.state?.listingTitle;

  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const mockTimeoutRef = useRef(null);
  const prefillOnce = useRef(false);

  const inThread = Boolean(
    listingId && (user?.role === 'student' || (user?.role === 'owner' && peerUserId))
  );

  const loadThreads = useCallback(async () => {
    if (!isApiModeEnabled() || !user) return;
    const res = await apiFetch('/api/messages/threads');
    if (!res.ok) return;
    const data = await res.json();
    setThreads(data.threads || []);
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!isApiModeEnabled() || !user || !listingId) return;
    const params = new URLSearchParams({ listingId });
    if (user.role === 'owner' && peerUserId) {
      params.set('peerUserId', peerUserId);
    }
    const res = await apiFetch(`/api/messages?${params.toString()}`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setLoadErr(d.error || 'Could not load messages.');
      return;
    }
    setLoadErr('');
    const data = await res.json();
    setMessages(data.messages || []);
  }, [user, listingId, peerUserId]);

  useEffect(() => {
    if (!isApiModeEnabled() || !user) return;
    loadThreads();
  }, [user, loadThreads]);

  /* Refresh inbox on the thread list so new student threads appear without a full reload */
  useEffect(() => {
    if (!isApiModeEnabled() || !user || inThread) return;
    const id = setInterval(loadThreads, 8000);
    return () => clearInterval(id);
  }, [user, inThread, loadThreads]);

  /* Poll messages while a thread is open; faster when the tab is visible so both sides see replies quickly */
  useEffect(() => {
    if (!isApiModeEnabled() || !inThread) return;
    loadMessages();
    const intervalMs = () => (document.visibilityState === 'visible' ? 2200 : 12000);
    let intervalId;
    const restart = () => {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        loadMessages();
      }, intervalMs());
    };
    restart();
    const onVis = () => restart();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(intervalId);
    };
  }, [inThread, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Mock mode initial state
  useEffect(() => {
    if (isApiModeEnabled()) return;
    if (user?.role === 'owner') {
      setMessages([
        { _id: 'g1', from: { id: 'sys' }, to: { id: 'me' }, text: 'A student can message you from a listing. Open Messages from the menu to see threads when using the live API.' },
      ]);
    } else {
      setMessages([
        {
          _id: 'g1',
          from: { id: 'sys' },
          to: { id: 'me' },
          text: 'Sign in and open a listing as a student, then "Message the owner" (or enable the API for real chat).',
        },
      ]);
    }
  }, [user?.role, user]);

  useEffect(() => {
    if (!fromListing || prefillOnce.current || isApiModeEnabled()) return;
    setText((t) => (t ? t : `I am interested in “${fromListing}”. `));
    prefillOnce.current = true;
  }, [fromListing]);

  const openThread = (t) => {
    if (t.iAmOwner) {
      setSearchParams({ listingId: t.listingId, peerUserId: t.peer.id });
    } else {
      setSearchParams({ listingId: t.listingId });
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    setErr('');
    if (!user) {
      setErr('Log in to send a message.');
      return;
    }
    const v = validateRequired(text, 'a message');
    if (!v.ok) {
      setErr(v.message);
      return;
    }

    if (isApiModeEnabled()) {
      if (!listingId) {
        setErr('Open a thread from the list, or from a property page.');
        return;
      }
      if (user.role === 'owner' && !peerUserId) {
        setErr('Pick a conversation from the list (student) first.');
        return;
      }
      setSending(true);
      try {
        const body = { listingId, text: v.value };
        if (user.role === 'owner') {
          body.toUserId = peerUserId;
        }
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || 'Send failed.');
          return;
        }
        setText('');
        if (data.message) {
          setMessages((m) => [...m, data.message]);
        } else {
          loadMessages();
        }
        loadThreads();
      } finally {
        setSending(false);
      }
      return;
    }

    // Mock: echo + fake reply
    const outId = `u-${Date.now()}`;
    setMessages((m) => [...m, { _id: outId, from: { id: user.email }, to: { id: 'them' }, text: v.value }]);
    setText('');
    if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    mockTimeoutRef.current = setTimeout(() => {
      const isOwner = user.role === 'owner';
      const back = pickReply(isOwner ? REPLY_AS_STUDENT : REPLY_AS_OWNER);
      setMessages((m) => [
        ...m,
        { _id: `r-${Date.now()}`, from: { id: 'them' }, to: { id: user.email }, text: back },
      ]);
    }, 900);
  };

  if (!user) {
    return (
      <div className="page chat-page">
        <h1>Messages</h1>
        <p>
          <Link to="/auth/login">Log in</Link> to use messaging.
        </p>
      </div>
    );
  }

  if (isApiModeEnabled()) {
    return (
      <div className="page chat-page">
        <h1>Messages</h1>
        <p className="chat-page__hint" style={{ marginTop: '-0.25rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#555' }}>
          Live chat via your server: student and host each sign in on their own device; messages sync every couple of seconds while this tab is open.
        </p>
        {!inThread && (
          <>
            <p className="lede">Your conversations. Click one to read and reply.</p>
            <ul className="thread-list" style={{ listStyle: 'none', padding: 0, maxWidth: 640 }}>
              {threads.map((t) => (
                <li key={t.listingId + t.peer.id} style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className="button"
                    style={{ textAlign: 'left', width: '100%' }}
                    onClick={() => openThread(t)}
                  >
                    <strong>{t.listingTitle}</strong>
                    <br />
                    <span style={{ fontSize: '0.9em', color: '#444' }}>
                      {t.iAmOwner ? 'Student' : 'Host'}: {t.peer.name}
                    </span>
                    {t.lastMessage && (
                      <span style={{ display: 'block', marginTop: 4, fontSize: '0.85em' }}>{t.lastMessage.text?.slice(0, 80)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {threads.length === 0 && <p className="empty">No messages yet. Students: open a property and use &quot;Message the owner&quot;.</p>}
          </>
        )}

        {inThread && (
          <>
            <p className="lede">
              <Link to="/chat">← All threads</Link>
            </p>
            {loadErr && <p className="form-error">{loadErr}</p>}
            <div className="chat-window" role="log">
              {messages.map((m) => {
                const mine = isMineMessage(m, user);
                return (
                  <div key={m._id} className={`bubble${mine ? ' bubble--me' : ' bubble--them'}`}>
                    {m.text}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form className="chat-composer" onSubmit={onSend}>
              {err && (
                <p className="form-error" role="alert">
                  {err}
                </p>
              )}
              <label className="field field--row">
                <span className="visually-hidden">Message</span>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className="button button--primary" disabled={sending}>
                  {sending ? '…' : 'Send'}
                </button>
              </label>
            </form>
          </>
        )}

        {!inThread && user.role === 'student' && (
          <p className="form-page__foot" style={{ marginTop: 16 }}>
            To start a thread, go to a <Link to="/listings">listing</Link> and click <strong>Message the owner</strong>.
          </p>
        )}
      </div>
    );
  }

  // --- Mock (non-API) simple UI ---
  return (
    <div className="page chat-page">
      <h1>Messages (demo mode)</h1>
      {fromListing && (
        <p className="lede" role="status">
          <strong>Regarding:</strong> {fromListing}
        </p>
      )}
      <p className="lede">Enable the API in .env to use real messaging between students and owners.</p>
      <div className="chat-window" role="log">
        {messages.map((m) => {
          const mine = isMineMessage(m, user);
          return (
            <div key={m._id} className={`bubble${mine ? ' bubble--me' : ' bubble--them'}`}>
              {m.text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="chat-composer" onSubmit={onSend}>
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
        <label className="field field--row">
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <button type="submit" className="button button--primary">Send</button>
        </label>
      </form>
    </div>
  );
};
