import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { dreamsAPI } from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import ProcessingStamps from '../components/ProcessingStamps';
import CoffeeRing from '../components/CoffeeRing';

// Web Audio API Typewriter Click Sound Synthesizer
let typewriterCtx = null;
const playTypewriterClick = () => {
  try {
    if (!typewriterCtx) {
      typewriterCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (typewriterCtx.state === 'suspended') {
      typewriterCtx.resume();
    }

    const osc = typewriterCtx.createOscillator();
    const gain = typewriterCtx.createGain();

    osc.type = 'triangle';
    const now = typewriterCtx.currentTime;
    const pitch = 1100 + Math.random() * 400; // Slight random pitch variation
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

    gain.gain.setValueAtTime(0.02, now); // quiet click sound
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(typewriterCtx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {
    // Browser audio context blocked or not supported
  }
};

const CanvasWaveform = ({ stream }) => {
  const canvasRef    = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);

  useEffect(() => {
    if (!stream) return;
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 128;
    const src = audioCtxRef.current.createMediaStreamSource(stream);
    src.connect(analyserRef.current);

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const buf    = new Uint8Array(analyserRef.current.frequencyBinCount);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(buf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(232,220,196,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const bw = canvas.width / buf.length;
      buf.forEach((v, i) => {
        const h = (v / 255) * canvas.height * 0.8;
        ctx.fillStyle = `rgba(184, 134, 11, ${0.4 + (v / 255) * 0.6})`;
        ctx.fillRect(i * bw, canvas.height - h, bw - 1, h);
      });
    };
    draw();
    return () => {
      cancelAnimationFrame(animationRef.current);
      audioCtxRef.current?.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={60}
      role="img"
      aria-label="Live audio waveform visualization of the current recording"
      style={{ width: '100%', height: '60px', backgroundColor: 'var(--redact)' }}
    />
  );
};

const RecordPage = () => {
  const navigate = useNavigate();
  const toast    = useToast();

  const [tab,        setTab]        = useState('voice');
  const [recording,  setRecording]  = useState(false);
  const [stream,     setStream]     = useState(null);
  const [audioBlob,  setAudioBlob]  = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dreamId,    setDreamId]    = useState(null);
  const [pollStatus, setPollStatus] = useState(null);
  const [aiReady,    setAiReady]    = useState(true);

  // Subjective dreamer-supplied metadata, captured before filing the report.
  const [isLucid,     setIsLucid]     = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isNightmare, setIsNightmare] = useState(false);
  const [tagInput,    setTagInput]    = useState('');
  const [tags,        setTags]        = useState([]);

  const addTag = (raw) => {
    const next = String(raw || '').trim().toLowerCase();
    if (!next) return;
    if (tags.includes(next)) return;
    if (tags.length >= 12) return;
    setTags((t) => [...t, next]);
    setTagInput('');
  };
  const removeTag = (t) => setTags((arr) => arr.filter((x) => x !== t));

  const mediaRef    = useRef(null);
  const streamRef   = useRef(null);
  const mimeTypeRef = useRef('');
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);
  const previewUrlRef = useRef(null);

  const pickRecorderMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const audioFilenameFor = (blob) => {
    const type = (blob?.type || mimeTypeRef.current || '').toLowerCase();
    if (type.includes('mp4') || type.includes('m4a')) return 'testimony.m4a';
    if (type.includes('ogg')) return 'testimony.ogg';
    if (type.includes('wav')) return 'testimony.wav';
    if (type.includes('mpeg') || type.includes('mp3')) return 'testimony.mp3';
    return 'testimony.webm';
  };

  /* ── Timer ── */
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  /* Revoke blob preview URLs when the take changes or the page unmounts. */
  useEffect(() => {
    if (!audioBlob) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      return undefined;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(audioBlob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = null;
    };
  }, [audioBlob]);

  /* ── Subscribe to live processing events via SSE ── */
  useEffect(() => {
    if (tab !== 'voice') return undefined;
    // Use the shared api instance so the URL normalization in api.js applies.
    api.get('/health')
      .then((res) => {
        const ai = res.data?.services?.ai;
        setAiReady(ai?.status === 'ok' && ai?.whisper_loaded);
      })
      .catch(() => setAiReady(false));
    return undefined;
  }, [tab]);

  useEffect(() => {
    if (!dreamId) return;

    const token = localStorage.getItem('dream_token');
    // Derive the SSE base URL from the api instance's resolved baseURL so it
    // benefits from the same origin-normalization applied in api.js.
    const base = (api.defaults.baseURL || 'http://localhost:5001/api').replace(/\/$/, '');
    const url = `${base}/dreams/events/${dreamId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let pollFallback = null;
    let es;
    try {
      es = new EventSource(url);
    } catch {
      es = null;
    }

    const finalize = (status, errMsg) => {
      if (status === 'complete') {
        setTimeout(() => navigate(`/dreams/${dreamId}`), 600);
      } else if (status === 'failed') {
        toast.error(errMsg || 'Analysis failed. File corrupted.');
        setProcessing(false);
        setDreamId(null);
      }
    };

    if (es) {
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.stage) setPollStatus(payload.stage);
          if (payload?.processingStatus === 'complete' || payload?.processingStatus === 'failed') {
            es.close();
            finalize(payload.processingStatus, payload.processingError);
          }
        } catch {
          // ignore malformed events
        }
      };
      es.onerror = () => {
        // SSE failed — fall back to polling the existing status endpoint
        // so the page still progresses (e.g. behind a proxy that strips
        // event-stream content-type).
        es.close();
        if (pollFallback) return;
        pollFallback = setInterval(async () => {
          try {
            const res = await dreamsAPI.getDreamStatus(dreamId);
            setPollStatus(res.processingStatus);
            if (res.processingStatus === 'complete' || res.processingStatus === 'failed') {
              clearInterval(pollFallback);
              pollFallback = null;
              finalize(res.processingStatus, res.processingError);
            }
          } catch {}
        }, 2000);
      };
    } else {
      // EventSource unavailable in this environment — just poll.
      pollFallback = setInterval(async () => {
        try {
          const res = await dreamsAPI.getDreamStatus(dreamId);
          setPollStatus(res.processingStatus);
          if (res.processingStatus === 'complete' || res.processingStatus === 'failed') {
            clearInterval(pollFallback);
            pollFallback = null;
            finalize(res.processingStatus, res.processingError);
          }
        } catch {}
      }, 2000);
    }

    return () => {
      if (es) es.close();
      if (pollFallback) clearInterval(pollFallback);
    };
  }, [dreamId]);

  /* ── Recording ── */
  const startRecording = async () => {
    try {
      if (typeof MediaRecorder === 'undefined') {
        toast.error('Voice recording is not supported in this browser.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Microphone access is not available (requires HTTPS or localhost).');
        return;
      }

      // Clear any prior take before starting a new exposure.
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setAudioBlob(null);

      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      setStream(s);
      chunksRef.current = [];

      const mimeType = pickRecorderMimeType();
      mimeTypeRef.current = mimeType;
      mediaRef.current = mimeType
        ? new MediaRecorder(s, { mimeType })
        : new MediaRecorder(s);

      mediaRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRef.current.onstop = () => {
        const type = mimeTypeRef.current || mediaRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob.size > 0 ? blob : null);
        if (blob.size === 0) {
          toast.error('No audio captured. Hold record and speak for a few seconds.');
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStream(null);
      };

      mediaRef.current.onerror = () => {
        toast.error('Recording failed mid-capture.');
        setRecording(false);
      };

      // Timeslice ensures chunks arrive even on quick stops (Safari/Chrome).
      mediaRef.current.start(250);
      setElapsed(0);
      setRecording(true);
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      toast.error(denied ? 'Microphone access denied.' : 'Could not start microphone.');
    }
  };

  const stopRecording = () => {
    if (!mediaRef.current || mediaRef.current.state === 'inactive') return;
    mediaRef.current.stop();
    setRecording(false);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (tab === 'text') {
      const trimmed = transcript.trim();
      if (!trimmed) {
        toast.error('Transcription is empty. Provide testimony.');
        return;
      }
      if (trimmed.length < 50) {
        toast.error('Testimony must be at least 50 characters.');
        return;
      }
    } else if (!audioBlob) {
      toast.error('No audio recorded.');
      return;
    } else if (audioBlob.size < 1000) {
      toast.error('Recording too short or empty. Speak for at least a few seconds.');
      return;
    }

    setProcessing(true);
    try {
      if (tab === 'voice' && !aiReady) {
        toast.error('Voice transcription service is offline. Restart the AI service.');
        setProcessing(false);
        return;
      }

      const fd = new FormData();
      if (tab === 'text') {
        fd.append('inputType', 'text');
        fd.append('transcript', transcript.trim());
      } else {
        fd.append('inputType', 'audio');
        fd.append('audio', audioBlob, audioFilenameFor(audioBlob));
      }
      // Subjective metadata — backend Zod schema decodes strings + JSON.
      fd.append('isLucid', String(isLucid));
      fd.append('isRecurring', String(isRecurring));
      fd.append('isNightmare', String(isNightmare));
      fd.append('tags', JSON.stringify(tags));

      const res = await dreamsAPI.createDream(fd);
      setDreamId(res.dreamId);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to file report.';
      toast.error(msg);
      setProcessing(false);
    }
  };

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  /* ── Processing view ── */
  if (processing || dreamId) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 48px', textAlign: 'center' }}>
        <div className="case-label" style={{ marginBottom: '16px' }}>CASE BEING DEVELOPED</div>
        <h2 style={{ fontFamily: '"Special Elite", serif', fontSize: '1.8rem', marginBottom: '12px', color: 'var(--ink)' }}>
          Developing Film...
        </h2>
        <p style={{ fontFamily: '"Courier Prime", monospace', fontSize: '13px', color: 'var(--silver)', marginBottom: '48px', lineHeight: 1.9 }}>
          Your testimony is being processed. Do not leave the darkroom.
        </p>

        <div className="dossier-card" style={{ padding: '40px' }}>
          <ProcessingStamps status={pollStatus || 'pending'} />
        </div>

        <p style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', color: 'var(--silver)', marginTop: '24px', letterSpacing: '0.1em' }}>
          STATUS: {(pollStatus || 'PENDING').toUpperCase().replace('_',' ')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}>
      <CoffeeRing style={{ top: '0px', right: '40px' }} />

      {/* Page header */}
      <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: '16px', marginBottom: '40px' }}>
        <div className="case-label" style={{ marginBottom: '4px' }}>TESTIMONY INTAKE — FORM DS-02</div>
        <h1 style={{ fontFamily: '"Special Elite", serif', fontSize: '2rem', color: 'var(--ink)', margin: 0 }}>
          File New Report
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>

        {/* LEFT — Load Film */}
        <div className="dossier-card" style={{ padding: '32px' }}>
          <div className="case-label" style={{ marginBottom: '24px' }}>LOAD FILM / VOICE TESTIMONY</div>

          {tab === 'voice' && !aiReady && (
            <div
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                border: '1px dashed var(--stamp-red)',
                backgroundColor: 'rgba(139,30,30,0.06)',
                fontFamily: '"Courier Prime", monospace',
                fontSize: '12px',
                color: 'var(--stamp-red)',
                lineHeight: 1.7,
              }}
            >
              Voice transcription service is offline. Written statements still work.
              Restart with <code style={{ fontFamily: '"Share Tech Mono", monospace' }}>bash scripts/start.sh</code> and wait for the AI service health check to pass.
            </div>
          )}

          {/* Tabs — folder style */}
          <div style={{ display: 'flex', gap: '1px', marginBottom: '24px', backgroundColor: 'rgba(61,53,40,0.2)' }}>
            {[
              { key: 'voice', label: 'VOICE TESTIMONY' },
              { key: 'text',  label: 'WRITTEN STATEMENT' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.12em',
                  backgroundColor: tab === key ? 'var(--paper-dark)' : 'var(--paper-stain)',
                  color: tab === key ? 'var(--ink)' : 'var(--silver)',
                  border: 'none',
                  borderBottom: tab === key ? '2px solid var(--ink)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'voice' ? (
              <motion.div
                key="voice"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center' }}
              >
                {/* Film canister (CSS only) */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                  {/* Canister body */}
                  <div style={{
                    width: '80px',
                    height: '100px',
                    backgroundColor: 'var(--redact)',
                    borderRadius: '8px 8px 4px 4px',
                    margin: '0 auto',
                    border: '2px solid var(--fixer)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--fixer)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--fixer)' }} />
                    </div>
                    {/* Sprocket strip */}
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '50px',
                      height: '14px',
                      backgroundColor: 'var(--redact)',
                      border: '1px solid var(--fixer)',
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>

                {/* Record button */}
                <div style={{ marginBottom: '20px' }}>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={recording ? 'safelight-glow' : ''}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: recording ? 'var(--stamp-red)' : 'var(--redact)',
                      border: `3px solid var(--fixer)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s',
                      margin: '0 auto',
                    }}
                  >
                    <div style={{
                      width: recording ? '24px' : '28px',
                      height: recording ? '24px' : '28px',
                      borderRadius: recording ? '3px' : '50%',
                      backgroundColor: 'var(--fixer)',
                      transition: 'all 0.3s',
                    }} />
                  </button>
                </div>

                {/* Timer */}
                <div style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '1.6rem',
                  color: recording ? 'var(--stamp-red)' : 'var(--ink)',
                  letterSpacing: '0.1em',
                  marginBottom: '4px',
                }}>
                  {fmtTime(elapsed)}
                </div>
                <div className="case-label" style={{ marginBottom: '16px' }}>
                  {recording ? '● RECORDING EXPOSURE' : audioBlob ? '◆ TESTIMONY CAPTURED' : '○ STANDBY'}
                </div>

                {stream && <CanvasWaveform stream={stream} />}

                {audioBlob && previewUrl && !recording && (
                  <div style={{ marginTop: '16px' }}>
                    <audio controls src={previewUrl} style={{ width: '100%' }} />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <textarea
                  value={transcript}
                  onChange={e => {
                    setTranscript(e.target.value);
                    playTypewriterClick();
                  }}
                  className="lined-paper"
                  placeholder="Begin transcription. Details matter. Note persons, objects, environments, and emotional states."
                  rows={10}
                  style={{
                    width: '100%',
                    fontFamily: '"Courier Prime", monospace',
                    fontSize: '14px',
                    color: 'var(--ink)',
                    lineHeight: '28px',
                    padding: '8px 16px',
                    border: '1px solid rgba(26,21,16,0.3)',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT — Case File Form */}
        <div>
          <div className="dossier-card" style={{ padding: '32px', marginBottom: '1px' }}>
            <div className="case-label" style={{ marginBottom: '20px' }}>CASE FILE INSTRUCTIONS</div>
            <div style={{ borderLeft: '3px solid var(--fixer)', paddingLeft: '16px', marginBottom: '24px' }}>
              <p style={{ fontFamily: '"Courier Prime", monospace', fontSize: '13px', color: 'var(--ink-faded)', lineHeight: 1.9, margin: 0 }}>
                Provide as much detail as possible. The system extracts emotional signals, symbolic content, and cross-references with your previous case files.
              </p>
            </div>

            {/* Subjective case attributes — dreamer-supplied metadata */}
            <div style={{ borderTop: '1px dashed rgba(61,53,40,0.3)', paddingTop: '20px', marginBottom: '20px' }}>
              <div className="case-label" style={{ marginBottom: '12px' }}>CASE ATTRIBUTES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {[
                  { id: 'lucid',     label: 'LUCID',     value: isLucid,     set: setIsLucid,     hint: 'I was aware I was dreaming' },
                  { id: 'recurring', label: 'RECURRING', value: isRecurring, set: setIsRecurring, hint: 'I have had this dream before' },
                  { id: 'nightmare', label: 'NIGHTMARE', value: isNightmare, set: setIsNightmare, hint: 'This was distressing or terrifying' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    htmlFor={`attr-${opt.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      backgroundColor: opt.value ? 'rgba(184,134,11,0.12)' : 'transparent',
                      border: `1px solid ${opt.value ? 'var(--fixer)' : 'rgba(61,53,40,0.2)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      id={`attr-${opt.id}`}
                      type="checkbox"
                      checked={opt.value}
                      onChange={(e) => opt.set(e.target.checked)}
                      style={{ accentColor: 'var(--fixer)', cursor: 'pointer' }}
                    />
                    <span style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.6rem',
                      letterSpacing: '0.14em',
                      color: opt.value ? 'var(--ink)' : 'var(--silver)',
                      minWidth: '78px',
                    }}>
                      {opt.label}
                    </span>
                    <span style={{
                      fontFamily: '"Courier Prime", monospace',
                      fontSize: '11px',
                      fontStyle: 'italic',
                      color: 'var(--ink-faded)',
                    }}>
                      {opt.hint}
                    </span>
                  </label>
                ))}
              </div>

              <div className="case-label" style={{ marginBottom: '8px' }}>TAGS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.1em',
                      backgroundColor: 'var(--redact)',
                      color: 'var(--paper)',
                      padding: '4px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove tag ${t}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--paper)',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span style={{
                    fontFamily: '"Courier Prime", monospace',
                    fontSize: '11px',
                    fontStyle: 'italic',
                    color: 'var(--silver)',
                  }}>
                    No tags. Add up to 12.
                  </span>
                )}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                onBlur={() => addTag(tagInput)}
                placeholder="ADD TAG + ENTER"
                aria-label="Add tag"
                disabled={tags.length >= 12}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(61,53,40,0.3)',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ borderTop: '1px dashed rgba(61,53,40,0.3)', paddingTop: '20px' }}>
              <div className="case-label" style={{ marginBottom: '8px' }}>PROCESSING PROTOCOL</div>
              {[
                'Voice → Transcription via Whisper',
                'Emotional spectrum extraction (7 axes)',
                'Symbol identification & classification',
                'Gemini AI psychological interpretation',
                'Cross-reference with prior cases',
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '6px 0',
                  borderBottom: '1px dashed rgba(61,53,40,0.15)',
                  fontFamily: '"Courier Prime", monospace',
                  fontSize: '12px',
                  color: 'var(--ink-faded)',
                }}>
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', flexShrink: 0, paddingTop: '2px' }}>
                    {String(i + 1).padStart(2,'0')}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={{ padding: '24px 0' }}>
            <button
              onClick={handleSubmit}
              disabled={processing}
              className="btn-stamp btn-stamp-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}
            >
              ▶ FILE REPORT FOR ANALYSIS
            </button>
            <p style={{
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.55rem',
              color: 'var(--silver)',
              letterSpacing: '0.1em',
              marginTop: '10px',
              textAlign: 'center',
            }}>
              ONCE FILED, THIS REPORT CANNOT BE ALTERED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordPage;
