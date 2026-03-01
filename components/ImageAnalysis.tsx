import React, { useState, useCallback } from 'react';
import { fileToBase64 } from '../utils/fileUtils';
import { analyzeImage } from '../services/geminiService';
import Spinner from './common/Spinner';
import { AnalyzedPrompts, AnalysisHistoryItem, Feature } from '../types';

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

interface ImageAnalysisProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    imageFile: File | null;
    setImageFile: (file: File | null) => void;
    imagePreview: string | null;
    setImagePreview: (preview: string | null) => void;
    results: AnalyzedPrompts | null;
    setResults: (results: AnalyzedPrompts | null) => void;
    onImageAnalyzed: (item: Omit<AnalysisHistoryItem, 'id' | 'timestamp'>) => void;
    onPromptAction: (prompt: string) => void;
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
}

const ImageAnalysis: React.FC<ImageAnalysisProps> = ({
    prompt,
    setPrompt,
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    results,
    setResults,
    onImageAnalyzed,
    onPromptAction,
    isProcessing,
    setIsProcessing
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<'simple' | 'detailed' | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            // Revoke previous object URL to prevent memory leaks
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
            setImagePreview(URL.createObjectURL(file));
            setResults(null);
            setError(null);
        }
    };
    
    const removeImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImageFile(null);
        setImagePreview(null);
        setResults(null);
        setError(null);
    };

    const handleSubmit = useCallback(async () => {
        if (!prompt || !imageFile) {
            setError("Please provide a prompt and upload an image.");
            return;
        }

        setIsLoading(true);
        setIsProcessing(true);
        setError(null);
        setResults(null);
        
        // Fix: Explicitly capture the user's input before any async operations
        // to ensure the correct value is saved to history.
        const userQuestion = prompt;

        try {
            const imageBase64 = await fileToBase64(imageFile);
            // Use the captured question for the API call
            const analysisResult = await analyzeImage(userQuestion, imageBase64, imageFile.type);
            setResults(analysisResult);

            const inputImageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;

            onImageAnalyzed({
                type: Feature.ImageAnalysis,
                inputImageData: inputImageDataUrl,
                // Use the captured question to save the correct prompt to history
                prompt: userQuestion,
                results: analysisResult,
            });
        } catch (err: any)
 {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setIsProcessing(false);
        }
    }, [prompt, imageFile, setResults, onImageAnalyzed, setIsProcessing]);

    const handleCopy = useCallback((textToCopy: string, key: 'simple' | 'detailed') => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        }).catch(err => {
            console.error("Failed to copy text:", err);
        });
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-4">
                    <label htmlFor="image-upload" className="font-semibold text-lg text-gray-300">1. Upload Your Image</label>
                    {imagePreview ? (
                        <div className="relative group w-full h-36">
                            <img src={imagePreview} alt="Image preview" className="rounded-lg w-full h-full object-contain bg-gray-900/50"/>
                            <button 
                                onClick={removeImage}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                aria-label="Remove image"
                                disabled={isProcessing}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="file-input" className={`flex flex-col items-center justify-center w-full h-36 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800 ${!isProcessing ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-50'} transition-colors`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                                </div>
                                <input id="file-input" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isProcessing} />
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex flex-col space-y-4">
                     <label htmlFor="prompt-input" className="font-semibold text-lg text-gray-300">2. Ask About The Image</label>
                    <textarea
                        id="prompt-input"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Or, ask something else about the image..."
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#56FF00] focus:border-[#56FF00] transition text-gray-200 resize-none h-36"
                        disabled={isProcessing}
                    />
                </div>
            </div>
             <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                 <button
                    onClick={handleSubmit}
                    disabled={isProcessing || !prompt || !imageFile}
                    className="w-full md:w-1/2 px-8 py-3 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center"
                >
                    {isLoading ? <><Spinner /> <span className="ml-2">Analyzing...</span></> : 'Analyze Image'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2 text-center whitespace-pre-wrap">{error}</p>}
            </div>

             {results && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <h2 className="text-2xl font-bold text-center mb-4 text-[#56FF00]">Analysis Result</h2>
                    <div className="space-y-6">
                        <div>
                             <h3 className="text-lg font-semibold text-gray-300 mb-2">Simple prompt</h3>
                             <div className="bg-gray-800/50 p-4 rounded-xl">
                                <div className="flex items-start justify-between gap-4">
                                    <p className="text-gray-300 whitespace-pre-wrap flex-grow">{results.simplePrompt}</p>
                                    <button
                                        onClick={() => handleCopy(results.simplePrompt, 'simple')}
                                        className="p-1.5 bg-gray-700/50 text-gray-300 rounded-md border border-gray-600 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#56FF00] flex-shrink-0"
                                        aria-label="Copy simple prompt"
                                        title={copiedKey === 'simple' ? "Copied!" : "Copy simple prompt"}
                                    >
                                        {copiedKey === 'simple' ? <CheckIcon /> : <CopyIcon />}
                                    </button>
                                </div>
                                <div className="mt-4 text-center">
                                    <button 
                                        onClick={() => onPromptAction(results.simplePrompt)}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-transparent text-[#56FF00] font-bold rounded-lg border-2 border-[#56FF00] hover:bg-[#56FF00] hover:text-black transition-all duration-300 transform hover:scale-105"
                                    >
                                        Create Image
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                             <h3 className="text-lg font-semibold text-gray-300 mb-2">Detailed prompt</h3>
                             <div className="bg-gray-800/50 p-4 rounded-xl">
                                <div className="flex items-start justify-between gap-4">
                                    <p className="text-gray-300 whitespace-pre-wrap flex-grow">{results.detailedPrompt}</p>
                                    <button
                                        onClick={() => handleCopy(results.detailedPrompt, 'detailed')}
                                        className="p-1.5 bg-gray-700/50 text-gray-300 rounded-md border border-gray-600 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#56FF00] flex-shrink-0"
                                        aria-label="Copy detailed prompt"
                                        title={copiedKey === 'detailed' ? "Copied!" : "Copy detailed prompt"}
                                    >
                                        {copiedKey === 'detailed' ? <CheckIcon /> : <CopyIcon />}
                                    </button>
                                </div>
                                <div className="mt-4 text-center">
                                    <button 
                                        onClick={() => onPromptAction(results.detailedPrompt)}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-transparent text-[#56FF00] font-bold rounded-lg border-2 border-[#56FF00] hover:bg-[#56FF00] hover:text-black transition-all duration-300 transform hover:scale-105"
                                    >
                                        Create Image
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageAnalysis;