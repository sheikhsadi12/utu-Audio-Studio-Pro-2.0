import { useEffect, useRef } from 'react';
import { audioEngine } from '../lib/AudioEngine';
import { useSettingsStore } from '../store/useSettingsStore';

interface AudioVisualizerProps {
  className?: string;
  barColor?: string;
}

export default function AudioVisualizer({ className, barColor = 'var(--color-neon-cyan)' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying } = useSettingsStore();
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyser();
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      audioEngine.getFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      let resolvedColor = barColor;
      if (barColor.startsWith('var(')) {
        const varName = barColor.slice(4, -1);
        resolvedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#00f3ff';
      }

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        ctx.fillStyle = resolvedColor;
        // Add some glow
        ctx.shadowBlur = 5;
        ctx.shadowColor = resolvedColor;
        
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    if (isPlaying) {
      draw();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, barColor]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      width={300} 
      height={40} 
    />
  );
}
