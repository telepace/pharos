import React, { useState, useRef, useEffect } from 'react';
import { Button, Tooltip, Slider } from 'antd';
import { 
  SoundOutlined, 
  PauseOutlined, 
  LoadingOutlined 
} from '@ant-design/icons';
import { textToSpeech } from '../../utils/messageUtils';

interface VoicePlayerProps {
  text: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      
      // 释放音频URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // 获取音频
  const fetchAudio = async () => {
    if (audioUrl) {
      playAudio();
      return;
    }
    
    try {
      setIsLoading(true);
      const url = await textToSpeech(text);
      setAudioUrl(url);
      
      // 创建音频元素
      const audio = new Audio(url);
      audioRef.current = audio;
      
      // 监听加载完成事件
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsLoading(false);
        playAudio();
      });
      
      // 监听播放结束事件
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      });
      
      // 监听错误事件
      audio.addEventListener('error', () => {
        setIsLoading(false);
        setIsPlaying(false);
        console.error('音频播放错误');
      });
      
    } catch (error) {
      console.error('获取语音失败:', error);
      setIsLoading(false);
    }
  };

  // 播放音频
  const playAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.play();
    setIsPlaying(true);
    
    // 更新进度
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    
    progressTimerRef.current = setInterval(() => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
      }
    }, 100);
  };

  // 暂停音频
  const pauseAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
    
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // 切换播放/暂停
  const togglePlay = () => {
    if (isLoading) return;
    
    if (!audioUrl) {
      fetchAudio();
    } else if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  // 设置进度
  const handleProgressChange = (value: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = value;
    setProgress(value);
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Tooltip title={isPlaying ? "暂停" : "播放语音"}>
        <Button
          type={isPlaying ? "primary" : "default"}
          shape="circle"
          icon={
            isLoading ? <LoadingOutlined /> : 
            isPlaying ? <PauseOutlined /> : 
            <SoundOutlined />
          }
          onClick={togglePlay}
          size="small"
        />
      </Tooltip>
      
      {(isPlaying || progress > 0) && (
        <>
          <Slider
            min={0}
            max={duration}
            value={progress}
            onChange={handleProgressChange}
            style={{ width: 100, margin: '0 8px' }}
            tooltip={{ formatter: (value) => formatTime(value || 0) }}
          />
          <span style={{ fontSize: 12, color: '#999' }}>
            {formatTime(progress)}/{formatTime(duration)}
          </span>
        </>
      )}
    </div>
  );
};

export default VoicePlayer; 