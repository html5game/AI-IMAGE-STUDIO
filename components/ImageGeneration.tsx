import React, { useState, useCallback } from 'react';
import { generateImageFromText } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Feature, ImageHistoryItem } from '../types';
import ImageModal from './common/Modal';

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const imageCounts = [1, 2, 3, 4];

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

interface ImageGenerationProps {
    onImageGenerated: (item: Omit<ImageHistoryItem, 'id' | 'timestamp'>) => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
}

const ImageGeneration: React.FC<ImageGenerationProps> = ({ onImageGenerated, prompt, setPrompt, isProcessing, setIsProcessing }) => {
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [numberOfImages, setNumberOfImages] = useState<number>(1);
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModalImage, setSelectedModalImage] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!prompt) {
            setError("Please provide a prompt to create an image.");
            return;
        }

        setIsLoading(true);
        setIsProcessing(true);
        setError(null);
        setResultImages([]);

        try {
            const generatedImageBase64Array = await generateImageFromText(prompt, aspectRatio, numberOfImages);
            const imageUrls = generatedImageBase64Array.map(base64 => `data:image/png;base64,${base64}`);
            setResultImages(imageUrls);

            imageUrls.forEach(imageUrl => {
                onImageGenerated({
                    type: Feature.ImageGeneration,
                    imageData: imageUrl,
                    prompt,
                });
            });
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setIsProcessing(false);
        }
    }, [prompt, aspectRatio, numberOfImages, onImageGenerated, setIsProcessing]);
    
    const handleDownload = (imageSrc: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `ai-image-studio-${Date.now()}-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                    <label htmlFor="prompt-input" className="font-semibold text-lg text-gray-300">1. Describe The Image You Want</label>
                    <textarea
                        id="prompt-input"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Example: 'A minimalist coffee bottle mockup on a modern work desk, next to a laptop with soft morning light. Style: hyper-realistic.'"
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#56FF00] focus:border-[#56FF00] transition text-gray-200 resize-none"
                        rows={5}
                        disabled={isProcessing}
                    />
                </div>

                <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-lg text-gray-300">2. Select Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                        {aspectRatios.map(ar => (
                            <button 
                                key={ar} 
                                onClick={() => setAspectRatio(ar)} 
                                disabled={isProcessing}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#56FF00] ${
                                    aspectRatio === ar 
                                    ? 'bg-[#56FF00] text-black' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-lg text-gray-300">3. Number of Images</label>
                    <div className="flex flex-wrap gap-2">
                        {imageCounts.map(n => (
                            <button 
                                key={n} 
                                onClick={() => setNumberOfImages(n)} 
                                disabled={isProcessing}
                                className={`px-4 py-2 w-14 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#56FF00] ${
                                    numberOfImages === n 
                                    ? 'bg-[#56FF00] text-black' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !prompt}
                        className="w-full md:w-1/2 px-8 py-3 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center"
                    >
                        {isLoading ? <><Spinner /> <span className="ml-2">Creating...</span></> : 'Create Image'}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2 text-center whitespace-pre-wrap">{error}</p>}
                </div>

                {resultImages.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-700">
                        <h2 className="text-2xl font-bold text-center mb-4 text-[#56FF00]">Your Results</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {resultImages.map((src, index) => (
                                <div key={index} className="flex flex-col items-center gap-4">
                                    <div className="bg-gray-800/50 p-2 rounded-xl w-full">
                                        <img 
                                            src={src} 
                                            alt={`Generated result ${index + 1}`} 
                                            className="rounded-lg w-full shadow-lg cursor-pointer transition-transform duration-300 hover:scale-105"
                                            onClick={() => setSelectedModalImage(src)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleDownload(src, index)}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] transition-all duration-300 transform hover:scale-105"
                                        aria-label={`Download image ${index + 1}`}
                                    >
                                        <DownloadIcon />
                                        <span>Download</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {selectedModalImage && <ImageModal isOpen={!!selectedModalImage} onClose={() => setSelectedModalImage(null)} imageSrc={selectedModalImage} />}
        </>
    );
};

export default ImageGeneration;