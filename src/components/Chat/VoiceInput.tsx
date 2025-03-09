import React, { useState, useRef, useEffect } from 'react';
import { Button, message, Tooltip } from 'antd';
import { AudioOutlined, LoadingOutlined, PauseOutlined } from '@ant-design/icons';
import { speechToText } from '../../utils/messageUtils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理函数
  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    audioChunksRef.current = [];
    setRecordingTime(0);
  };

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, []);

  // 开始录音
  const startRecording = async () => {
    try {
      cleanup();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          setIsProcessing(true);
          
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const transcript = await speechToText(audioBlob);
            
            if (transcript.trim()) {
              onTranscript(transcript);
            } else {
              message.info('未能识别语音内容');
            }
          } catch (error) {
            console.error('语音识别错误:', error);
            message.error('语音识别失败');
          } finally {
            setIsProcessing(false);
            audioChunksRef.current = [];
          }
        }
      };
      
      // 开始录音
      mediaRecorder.start();
      setIsRecording(true);
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('启动录音失败:', error);
      message.error('无法访问麦克风');
      cleanup();
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
    }
  };

  // 格式化录音时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {isRecording ? (
        <Tooltip title="点击停止录音">
          <Button
            type="primary"
            danger
            icon={<PauseOutlined />}
            onClick={stopRecording}
            loading={isProcessing}
          >
            {isProcessing ? '处理中...' : `录音中 ${formatTime(recordingTime)}`}
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="点击开始录音">
          <Button
            type="default"
            icon={isProcessing ? <LoadingOutlined /> : <AudioOutlined />}
            onClick={startRecording}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? '处理中...' : '语音输入'}
          </Button>
        </Tooltip>
      )}
    </div>
  );
};

export default VoiceInput; 