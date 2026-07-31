import React, { useRef, useEffect, useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, Maximize2, Minimize2, 
  Sparkles, Wifi, WifiOff, Copy, Check 
} from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

export const VideoGrid: React.FC = () => {
  const {
    localStream,
    remoteStreams,
    isConnected,
    isConnecting,
    peerDisconnected,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    isBackgroundBlurred,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleBackgroundBlur,
    roomId
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);



  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const handleCopyLink = () => {
    const roomUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div 
      ref={videoContainerRef}
      className={`relative w-full flex flex-col gap-4 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 p-4 shadow-xl select-none ${
        isFullscreen ? 'h-screen p-6' : 'aspect-video md:aspect-[2.2/1] min-h-[300px]'
      }`}
    >
      {/* Video Streams Container */}
      <div className={`flex-1 w-full grid gap-4 min-h-[220px] ${
        Object.keys(remoteStreams).length <= 1 
          ? 'grid-cols-1 md:grid-cols-2' 
          : Object.keys(remoteStreams).length === 2 
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {/* LOCAL VIDEO STREAM */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 transition-all ${
              isBackgroundBlurred ? 'blur-md brightness-[0.7]' : ''
            }`}
          />
          
          {/* Audio/Video Indicators */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/70 border border-white/10 backdrop-blur-md text-white">
              You (Local)
            </span>
            {isAudioMuted && (
              <span className="p-1 rounded-full bg-red-500/80 border border-red-500 text-white" title="Microphone Muted">
                <MicOff size={12} />
              </span>
            )}
            {isVideoMuted && (
              <span className="p-1 rounded-full bg-red-500/80 border border-red-500 text-white" title="Camera Stopped">
                <VideoOff size={12} />
              </span>
            )}
          </div>

          {/* Video Placeholder (Muted Camera Screen) */}
          {isVideoMuted && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-2 border border-white/5">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-purple-400">
                <VideoOff size={28} />
              </div>
              <span className="text-sm font-semibold">Your camera is off</span>
            </div>
          )}

          {/* Screen Share Overlay Tag */}
          {isScreenSharing && (
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/80 border border-purple-500 text-white backdrop-blur-md flex items-center gap-1.5 animate-pulse">
              <Monitor size={12} />
              Screen Sharing Active
            </div>
          )}
        </div>

        {/* REMOTE VIDEO STREAMS */}
        {Object.keys(remoteStreams).length > 0 ? (
          Object.entries(remoteStreams).map(([peerId, stream]) => (
            <RemoteVideoTile key={peerId} peerId={peerId} stream={stream} />
          ))
        ) : (
          /* Lobby Wait Panel / Disconnect Screen */
          <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-purple-950/20 flex flex-col items-center justify-center text-slate-100 gap-4 p-6 text-center">
              {isConnecting ? (
                <>
                  <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin" />
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-bold font-display">Calling Peer...</span>
                    <span className="text-xs text-slate-400">Waiting for WebRTC handshake to complete</span>
                  </div>
                </>
              ) : peerDisconnected ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2">
                    <WifiOff size={28} />
                  </div>
                  <div className="flex flex-col gap-1 max-w-xs">
                    <span className="text-base font-bold text-red-400">Friend Disconnected</span>
                    <span className="text-xs text-slate-400 leading-normal">The other user left or their connection timed out. Waiting to auto-reconnect...</span>
                  </div>
                </>
              ) : (
                /* Invitation Link Box */
                <div className="max-w-md w-full p-6 rounded-xl glass-panel-light flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-bold font-display text-white">Invite your Bestie!</span>
                    <span className="text-xs text-slate-400 leading-relaxed">
                      Copy the room code or URL link below and send it to your friend to join the real-time celebration room.
                    </span>
                  </div>

                  {/* Room code display */}
                  <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-lg p-2 w-full mt-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider pl-2 select-all">Code:</span>
                    <span className="font-mono text-sm font-bold text-purple-300 tracking-widest flex-1">{roomId}</span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Join Link"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Controller Toolbar */}
      <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 mt-1">
        <div className="flex items-center gap-2">
          {/* Mute Mic */}
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-xl cursor-pointer transition-all border ${
              isAudioMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'glass-panel-light hover:bg-white/10 text-white'
            }`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-xl cursor-pointer transition-all border ${
              isVideoMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'glass-panel-light hover:bg-white/10 text-white'
            }`}
            title={isVideoMuted ? 'Start Camera' : 'Stop Camera'}
          >
            {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            disabled={!isConnected}
            className={`p-3 rounded-xl cursor-pointer transition-all border ${
              isScreenSharing
                ? 'bg-purple-600/80 border-purple-500 text-white'
                : 'glass-panel-light hover:bg-white/10 text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor size={18} />
          </button>

          {/* Background Blur */}
          <button
            onClick={toggleBackgroundBlur}
            className={`p-3 rounded-xl cursor-pointer transition-all border ${
              isBackgroundBlurred
                ? 'bg-purple-600/80 border-purple-500 text-white'
                : 'glass-panel-light hover:bg-white/10 text-white'
            }`}
            title={isBackgroundBlurred ? 'Disable Background Blur' : 'Enable Background Blur'}
          >
            <Sparkles size={18} />
          </button>
        </div>

        {/* Right tools (Fullscreen) */}
        <div>
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-xl glass-panel-light hover:bg-white/10 border border-white/10 text-white cursor-pointer transition-all"
            title="Toggle Fullscreen Video"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const RemoteVideoTile: React.FC<{ peerId: string; stream: MediaStream }> = ({ peerId, stream }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/70 border border-white/10 backdrop-blur-md text-white">
          Friend ({peerId.substring(0, 4)})
        </span>
        
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 border border-green-500/30 text-green-300 backdrop-blur-md flex items-center gap-1">
          <Wifi size={10} className="text-green-400" />
          Excellent Connection
        </span>
      </div>
    </div>
  );
};

export default VideoGrid;
