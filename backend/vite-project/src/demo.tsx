import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Button from './components/Button'; // Ensure this path is correct
import { CardContent, CardHeader, CardTitle, Card } from './components/Card';

// Establish connection to Flask-SocketIO
const socket = io('http://localhost:5000'); // Update with your Flask-SocketIO backend address

const RealTimeRecognition: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState('Waiting for result...');
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Function to capture video frames and send to Flask backend
  const sendFrameToBackend = async () => {
    const video = videoRef.current;

    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const imageData = canvas.toDataURL('image/jpeg');

      socket.emit('video_frame', { image: imageData });
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setStream(mediaStream);
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing webcam: ', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop()); // Stop all video tracks
      if (videoRef.current) {
        videoRef.current.srcObject = null; // Clear video source
      }
      setStream(null);
      setIsStreaming(false);
      setResult('Waiting for result...'); // Reset result state
    }
  };

  useEffect(() => {
    socket.on('result', (data) => {
      setResult(data.message); // Update recognition result from backend
    });

    const interval = setInterval(() => {
      if (isStreaming) {
        sendFrameToBackend();
      }
    }, 500);

    return () => {
      clearInterval(interval);
      socket.off('result');
      stopCamera(); // Ensure camera stops when component unmounts
    };
  }, [isStreaming]);

  return (
    <div  className="container mx-auto p-4 cadetblue "  >
      <h1 className="text-2xl font-bold mb-4">Real-time Recognition</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Camera Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">Camera feed will appear here</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-center">
              {!isStreaming ? (
                <Button onClick={startCamera}>Start Camera</Button>
              ) : (
                <Button onClick={stopCamera} variant="destructive">Stop Camera</Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recognition Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
              {result ? (
                <p className="text-2xl font-bold">{result}</p>
              ) : (
                <p className="text-gray-500">Recognition output will appear here</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealTimeRecognition;