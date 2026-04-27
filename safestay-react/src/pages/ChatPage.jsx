import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { validateRequired } from '../utils/validation.js';
import { useSafeStay } from '../context/SafeStayContext.jsx';

/* Short replies to simulate a host (student) or a renter (owner) after you send a line. */
const REPLY_AS_OWNER = [
  'Thanks for your message. I can share more details or book a viewing when it suits you.',
  'I am still receiving enquiries — the place is open for September. I will reply with photos shortly.',
  'Appreciate you getting in touch. I am around most weekday evenings to chat or show the room.',
];
const REPLY_AS_STUDENT = [
  'Thanks — I am still looking and I will get back to you with questions.',
  'Sounds good. I can do a call later this week if you have time.',
  'I will read the full listing again and follow up. Cheers.',
];

const pickReply = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * VIEW: Messages. Sent lines appear for you; the other person’s reply is simulated for this build.
 */
export const ChatPage = () => {
  const { user } = useSafeStay();
  const location = useLocation();
  const fromListing = location.state?.listingTitle;
  const [messages, setMessages] = useState(() => {
    if (user?.role === 'owner') {
      return [
        { id: 'g1', me: false, text: 'A student has asked about one of your listings. Reply to keep the thread going.' },
      ];
    }
    return [
      {
        id: 'g1',
        me: false,
        text: 'Write to a host about a property. You will see their answer below your message when you are signed in.',
      },
    ];
  });
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const timeoutRef = useRef(null);
  const bottomRef = useRef(null);

  const prefillOnce = useRef(false);
  // If you open chat from a listing, prefill the first line once.
  useEffect(() => {
    if (!fromListing || prefillOnce.current) return;
    setText(`I am interested in “${fromListing}”. `);
    prefillOnce.current = true;
  }, [fromListing]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const onSend = (e) => {
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
    const outId = `u-${Date.now()}`;
    setMessages((m) => [...m, { id: outId, me: true, text: v.value }]);
    setText('');

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const isOwner = user.role === 'owner';
      const back = pickReply(isOwner ? REPLY_AS_STUDENT : REPLY_AS_OWNER);
      setMessages((m) => [
        ...m,
        { id: `r-${Date.now()}`, me: false, text: back },
      ]);
    }, 900);
  };

  return (
    <div className="page chat-page">
      <h1>Messages</h1>
      {fromListing && (
        <p className="lede" role="status">
          <strong>Regarding:</strong> {fromListing}
        </p>
      )}
      <p className="lede">
        Message the other party about a listing. Your messages appear on the right; the reply appears
        on the left after a short moment.
      </p>
      <div className="chat-window" role="log" aria-relevant="additions">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble${m.me ? ' bubble--me' : ' bubble--them'}`}
          >
            {m.text}
          </div>
        ))}
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
            name="message"
            placeholder="Type a message to send"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="button button--primary">
            Send
          </button>
        </label>
      </form>
    </div>
  );
};
