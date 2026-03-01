import React, { useState, useEffect, useCallback } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from './common/Spinner';
import VideoResultDisplay from './common/VideoResultDisplay';
// Fix: Removed explicit type import for AIStudio to resolve global type conflicts.
// The type is globally available from `types.ts` and does not need to be imported.

interface VideoGenerationProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    aspectRatio: '16:9' | '9:16';
    setAspectRatio: (ratio: '16:9' | '9:16') => void;
    resolution: '720p' | '1080p';
    setResolution: (res: '720p' | '1080p') => void;
    imageFile: File | null;
    setImageFile: (file: File | null) => void;
    imagePreview: string | null;
    setImagePreview: (preview: string | null) => void;
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
}

const aspectRatios: ('16:9' | '9:16')[] = ['16:9', '9:16'];
const resolutions: ('720p' | '1080p')[] = ['720p', '1080p'];

// Note: Local AIStudio interface and global declaration were removed and
// are now centralized in types.ts to prevent duplicate declaration errors.

const VideoGeneration: React.FC<VideoGenerationProps> = ({
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    isProcessing,
    setIsProcessing
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<string>('');
    const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
    const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

    const checkApiKey = useCallback(async () => {
        setIsCheckingKey(true);
        try {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setIsKeySelected(true);
            } else {
                setIsKeySelected(false);
            }
        } catch (e) {
            console.error("Error checking for API key:", e);
            setIsKeySelected(false);
        } finally {
            setIsCheckingKey(false);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            setIsKeySelected(true);
        } catch (e) {
            console.error("Error opening API key selection:", e);
            setError("Could not open the API key selection dialog.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
            setImagePreview(URL.createObjectURL(file));
            setError(null);
        }
    };
    
    const removeImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImageFile(null);
        setImagePreview(null);
    };
    
    const handleSubmit = useCallback(async () => {
        if (!prompt && !imageFile) {
            setError("Please provide a prompt or an image to generate a video.");
            return;
        }

        setIsLoading(true);
        setIsProcessing(true);
        setError(null);
        setResultVideoUrl(null);

        try {
            let imageInput;
            if (imageFile) {
                imageInput = {
                    base64: await fileToBase64(imageFile),
                    mimeType: imageFile.type,
                };
            }

            const generatedVideoUrl = await generateVideo({
                prompt,
                aspectRatio,
                resolution,
                image: imageInput,
                onStatusUpdate: setLoadingStatus
            });
            setResultVideoUrl(generatedVideoUrl);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
            if (err.message.includes("Invalid API Key")) {
                setIsKeySelected(false);
            }
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
            setIsProcessing(false);
        }
    }, [prompt, imageFile, aspectRatio, resolution, setIsProcessing]);

    if (isCheckingKey) {
        return <div className="flex justify-center items-center h-48"><Spinner /></div>;
    }
    
    if (!isKeySelected) {
        return (
            <div className="text-center p-8 bg-gray-800/50 rounded-lg">
                <h2 className="text-xl font-semibold text-yellow-400 mb-4">API Key Required</h2>
                <p className="text-gray-400 mb-6">The VEO video generation model requires you to select your own API key. Your key is used directly and is not stored by this application.</p>
                <button onClick={handleSelectKey} className="px-6 py-2 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] transition-colors">Select Your API Key</button>
                <p className="text-xs text-gray-500 mt-4">For more information on billing, please visit the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">official documentation</a>.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col space-y-4">
                    <label htmlFor="image-upload-video" className="font-semibold text-lg text-gray-300">1. Add Starting Image (Optional)</label>
                    {!imagePreview ? (
                        <label htmlFor="file-input-video" className={`flex flex-col items-center justify-center w-full h-36 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800 ${!isProcessing ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-50'} transition-colors`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                <p className="text-xs text-gray-400"><span className="font-semibold">Click to upload</span></p>
                                <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                            </div>
                            <input id="file-input-video" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isProcessing} />
                        </label>
                    ) : (
                        <div className="relative group">
                            <img src={imagePreview} alt="Preview" className="rounded-md w-full h-36 object-cover" />
                            <button onClick={removeImage} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove image" disabled={isProcessing}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                </div>
                 <div className="flex flex-col space-y-4">
                    <label htmlFor="prompt-input-video" className="font-semibold text-lg text-gray-300">2. Describe The Video</label>
                    <textarea
                        id="prompt-input-video"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.g., 'A majestic lion roaring on a cliff at sunset.'"
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#56FF00] focus:border-[#56FF00] transition text-gray-200 resize-none"
                        rows={5}
                        disabled={isProcessing}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-lg text-gray-300">3. Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                        {aspectRatios.map(ar => (
                            <button key={ar} onClick={() => setAspectRatio(ar)} disabled={isProcessing} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#56FF00] ${aspectRatio === ar ? 'bg-[#56FF00] text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-lg text-gray-300">4. Resolution</label>
                    <div className="flex flex-wrap gap-2">
                        {resolutions.map(res => (
                            <button key={res} onClick={() => setResolution(res)} disabled={isProcessing} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#56FF00] ${resolution === res ? 'bg-[#56FF00] text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                {res}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                 <button
                    onClick={handleSubmit}
                    disabled={isProcessing || (!prompt && !imageFile)}
                    className="w-full md:w-1/2 px-8 py-3 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center"
                >
                    {isLoading ? <><Spinner /> <span className="ml-2">Generating...</span></> : 'Generate Video'}
                </button>
                {isLoading && <p className="text-yellow-400 text-sm animate-pulse">{loadingStatus}</p>}
                {error && <p className="text-red-400 text-sm mt-2 text-center whitespace-pre-wrap">{error}</p>}
            </div>

            {resultVideoUrl && <VideoResultDisplay videoSrc={resultVideoUrl} />}
        </div>
    );
};

export default VideoGeneration;