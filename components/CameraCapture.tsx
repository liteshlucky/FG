'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
    onCancel: () => void;
    title?: string;
}

export default function CameraCapture({ onCapture, onCancel, title = "Take a Selfie" }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Use a ref for the stream — NOT state — so cleanup always has the current value
    // (state closures captured in useEffect/callbacks go stale; refs don't)
    const streamRef = useRef<MediaStream | null>(null);

    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Stops the camera stream and clears the video srcObject
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        // Stop any existing stream before starting a new one (handles retake case)
        stopCamera();
        setLoading(true);
        setError('');
        setCapturedImage(null);

        // getUserMedia only works on HTTPS or localhost on mobile browsers
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setError('Camera not supported. Make sure you are on HTTPS and using Safari or Chrome.');
            setLoading(false);
            return;
        }

        let mediaStream: MediaStream;
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',    // front-facing camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
        } catch (err: any) {
            console.error('getUserMedia error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Camera permission denied. Go to Settings → Safari → Camera and allow access, then try again.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('No camera found on this device.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError('Camera is already in use by another app. Close other apps and try again.');
            } else if (err.name === 'OverconstrainedError') {
                // Retry without width/height constraints — some iPhones reject ideal constraints
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'user' },
                        audio: false,
                    });
                } catch (retryErr: any) {
                    setError('Unable to access camera. Please try again.');
                    setLoading(false);
                    return;
                }
            } else {
                setError('Unable to access camera. Please grant camera permissions and try again.');
                setLoading(false);
                return;
            }
        }

        // Store stream in ref so cleanup always has the latest reference
        streamRef.current = mediaStream!;

        const video = videoRef.current;
        if (!video) {
            // Component unmounted before stream was ready — clean up and exit
            mediaStream!.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            return;
        }

        // Attach stream to the video element.
        // IMPORTANT: On iOS Safari, do NOT call video.load() on a live stream —
        // it aborts the stream. Just assign srcObject; the browser handles buffering.
        video.srcObject = mediaStream!;

        // iOS Safari & some Android browsers need an explicit play() call.
        // We call it as soon as the video is ready to play (canplay event).
        // The video element stays in the DOM at all times (not conditionally rendered)
        // so srcObject is always assigned to a real DOM node.
        const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.play()
                .then(() => setLoading(false))
                .catch((playErr) => {
                    console.error('video.play() failed:', playErr);
                    // On iOS, play() can fail if called without a user gesture.
                    // Showing a fallback "Tap to start" would be needed here,
                    // but since this component is opened via a user tap, it should succeed.
                    setError('Camera loaded but could not start. Please tap the screen and try again.');
                    setLoading(false);
                });
        };

        video.addEventListener('canplay', handleCanPlay);

        // Safety: if 'canplay' never fires (edge case on very old WebViews), show the stream anyway
        video.onerror = () => {
            video.removeEventListener('canplay', handleCanPlay);
            setError('Video stream error. Please try again.');
            setLoading(false);
        };

    }, [stopCamera]);

    // Start camera on mount; stop it on unmount
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        // Use the actual video dimensions for the captured image
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Un-mirror for the final capture so the image is not flipped
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(imageData);

        // Stop camera immediately after capture to free the camera resource
        stopCamera();
    };

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const confirm = () => {
        if (capturedImage) onCapture(capturedImage);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            <div className="relative w-full max-w-lg mx-4">

                {/* Header */}
                <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="mt-1 text-sm text-gray-300">
                        {capturedImage ? 'Review your photo' : 'Position your face in the center'}
                    </p>
                </div>

                {/* Camera / Preview Area */}
                <div className="relative overflow-hidden rounded-lg bg-gray-900 min-h-[200px] flex items-center justify-center">

                    {/* Error state */}
                    {error && (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <X className="h-16 w-16 text-red-500 mb-4" />
                            <p className="text-white mb-4">{error}</p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={startCamera}
                                    className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading overlay — shown on top of video, not instead of it */}
                    {!error && loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-3" />
                            <div className="text-white text-sm">Starting camera...</div>
                        </div>
                    )}

                    {/* Captured image preview */}
                    {capturedImage && (
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-auto"
                        />
                    )}

                    {/*
                        The video element is ALWAYS in the DOM, even during loading.
                        This is critical: if we conditionally render the video, the DOM node
                        gets destroyed and recreated, meaning srcObject was set on the OLD node
                        and the new one shows nothing. Keeping it mounted solves the black screen.
                        We hide it via CSS when not needed.
                    */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline   // Required on iOS: prevents fullscreen takeover
                        muted         // Required for autoplay policy on mobile
                        className={[
                            'w-full h-auto transform scale-x-[-1]', // Mirror for natural selfie feel
                            capturedImage || error ? 'hidden' : '',  // Hide when captured/error
                        ].join(' ')}
                    />

                    {/* Hidden canvas used for photo capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                {!error && !loading && (
                    <div className="mt-6 flex justify-center space-x-4">
                        {capturedImage ? (
                            <>
                                <button
                                    onClick={retake}
                                    className="flex items-center rounded-lg bg-gray-600 px-6 py-3 text-white hover:bg-gray-700"
                                >
                                    <RotateCcw className="mr-2 h-5 w-5" />
                                    Retake
                                </button>
                                <button
                                    onClick={confirm}
                                    className="flex items-center rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
                                >
                                    <Check className="mr-2 h-5 w-5" />
                                    Confirm
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onCancel}
                                    className="flex items-center rounded-lg bg-gray-600 px-6 py-3 text-white hover:bg-gray-700"
                                >
                                    <X className="mr-2 h-5 w-5" />
                                    Cancel
                                </button>
                                <button
                                    onClick={capturePhoto}
                                    className="flex items-center rounded-lg bg-blue-600 px-8 py-3 text-lg font-bold text-white hover:bg-blue-700"
                                >
                                    <Camera className="mr-2 h-6 w-6" />
                                    Capture
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
