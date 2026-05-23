import React, { useRef, useEffect } from 'react';

const CanvasWaveform = ({ stream }) => {
  const canvasRef    = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let dataArray = [], bufferLength = 0;

    if (stream) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 2048;
      bufferLength = analyser.frequencyBinCount;
      dataArray    = new Uint8Array(bufferLength);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
    }

    const draw = () => {
      const w = rect.width;
      const h = rect.height;

      // Light background
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 2.5;

      if (stream && analyserRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Purple gradient wave
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0,   '#a78bfa');
        grad.addColorStop(0.5, '#7c3aed');
        grad.addColorStop(1,   '#f43f5e');
        ctx.strokeStyle = grad;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = 'rgba(124,58,237,0.25)';

        ctx.beginPath();
        const sliceW = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceW;
        }
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else {
        // Idle: soft sine ripple in purple
        ctx.strokeStyle = 'rgba(124,58,237,0.25)';
        ctx.beginPath();
        const t = Date.now() * 0.003;
        for (let x = 0; x < w; x++) {
          const noise = Math.sin(x * 0.04 + t) * Math.cos(x * 0.012 + t) * 3;
          x === 0 ? ctx.moveTo(x, h / 2 + noise) : ctx.lineTo(x, h / 2 + noise);
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-28 rounded-xl bg-gray-50"
      style={{ display: 'block' }}
    />
  );
};

export default CanvasWaveform;
