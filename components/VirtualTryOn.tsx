import React, { useState, useCallback } from 'react';
import { fileToBase64 } from '../utils/fileUtils';
import { virtualTryOn } from '../services/geminiService';
import Spinner from './common/Spinner';
import ResultDisplay from './common/ResultDisplay';
import { Feature, ImageHistoryItem } from '../types';

const MAX_GARMENT_FILES = 2;

const FileUploader: React.FC<{
    id: string;
    title: string;
    file: File | null;
    preview: string | null;
    onFileChange: (file: File) => void;
    onFileRemove: () => void;
    disabled: boolean;
}> = ({ id, title, file, preview, onFileChange, onFileRemove, disabled }) => (
    <div className="flex flex-col space-y-2">
        <label className="font-semibold text-gray-300">{title}</label>
        {!preview ? (
            <label htmlFor={id} className={`flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800 ${!disabled ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-50'} transition-colors`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                    <p className="text-xs text-gray-400"><span className="font-semibold">Click to upload</span></p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                </div>
                <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => e.target.files && onFileChange(e.target.files[0])} disabled={disabled} />
            </label>
        ) : (
            <div className="relative group">
                <img src={preview} alt="Preview" className="rounded-md w-full h-48 object-contain bg-gray-900/50" />
                <button
                    onClick={onFileRemove}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                    disabled={disabled}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}
    </div>
);

interface VirtualTryOnProps {
    onHistoryAdd: (item: Omit<ImageHistoryItem, 'id' | 'timestamp'>) => void;
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
}

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onHistoryAdd, isProcessing, setIsProcessing }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [modelFile, setModelFile] = useState<File | null>(null);
    const [garmentFiles, setGarmentFiles] = useState<File[]>([]);
    const [modelPreview, setModelPreview] = useState<string | null>(null);
    const [garmentPreviews, setGarmentPreviews] = useState<string[]>([]);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleModelFileChange = (file: File) => {
        setModelFile(file);
        if (modelPreview) {
            URL.revokeObjectURL(modelPreview);
        }
        setModelPreview(URL.createObjectURL(file));
        setResultImage(null);
        setError(null);
    };

    const removeModelImage = () => {
        if (modelPreview) {
            URL.revokeObjectURL(modelPreview);
        }
        setModelFile(null);
        setModelPreview(null);
    };

    const handleGarmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const totalFiles = garmentFiles.length + files.length;
            
            if (totalFiles > MAX_GARMENT_FILES) {
                setError(`You can only upload a maximum of ${MAX_GARMENT_FILES} garment/accessory images.`);
                e.target.value = ''; 
                return;
            }

            setGarmentFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file as Blob));
            setGarmentPreviews(prev => [...prev, ...newPreviews]);
            
            setResultImage(null);
            setError(null);
            e.target.value = '';
        }
    };

    const removeGarmentImage = (indexToRemove: number) => {
        URL.revokeObjectURL(garmentPreviews[indexToRemove]);
        setGarmentFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setGarmentPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = useCallback(async () => {
        if (!modelFile || garmentFiles.length === 0) {
            setError("Please upload a model image and at least one garment image.");
            return;
        }

        setIsLoading(true);
        setIsProcessing(true);
        setError(null);
        setResultImage(null);

        try {
            const modelImageInput = {
                base64: await fileToBase64(modelFile),
                mimeType: modelFile.type,
            };
            const garmentImageInputs = await Promise.all(
                garmentFiles.map(async (file) => ({
                    base64: await fileToBase64(file),
                    mimeType: file.type,
                }))
            );
            
            const resultBase64 = await virtualTryOn(prompt, modelImageInput, garmentImageInputs);
            const imageUrl = `data:image/png;base64,${resultBase64}`;
            setResultImage(imageUrl);

            onHistoryAdd({
                type: Feature.VirtualTryOn,
                imageData: imageUrl,
                prompt: prompt || `Virtual Try-On with ${garmentFiles.length} item(s)`,
            });

        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setIsProcessing(false);
        }
    }, [prompt, modelFile, garmentFiles, onHistoryAdd, setIsProcessing]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FileUploader
                    id="model-file-input"
                    title="1. Upload Model Image"
                    file={modelFile}
                    preview={modelPreview}
                    onFileChange={handleModelFileChange}
                    onFileRemove={removeModelImage}
                    disabled={isProcessing}
                />
                 <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-gray-300">2. Upload Garment Image(s)</label>
                     <label htmlFor="garment-file-input" className={`flex flex-col items-center justify-center w-full h-12 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800 ${(garmentFiles.length < MAX_GARMENT_FILES && !isProcessing) ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-50'} transition-colors`}>
                        <p className="text-sm text-gray-400"><span className="font-semibold">Click to upload</span> (Max {MAX_GARMENT_FILES})</p>
                         <input id="garment-file-input" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" multiple onChange={handleGarmentFileChange} disabled={isProcessing || garmentFiles.length >= MAX_GARMENT_FILES} />
                    </label>
                    {garmentPreviews.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-900/50 rounded-lg">
                            <div className="grid grid-cols-3 gap-2">
                                {garmentPreviews.map((preview, index) => (
                                    <div key={index} className="relative group">
                                        <img src={preview} alt={`Garment ${index + 1}`} className="rounded-md w-full h-full object-contain aspect-square bg-gray-900/50" />
                                        <button
                                            onClick={() => removeGarmentImage(index)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label={`Remove garment ${index + 1}`}
                                            disabled={isProcessing}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

             <div className="flex flex-col space-y-4">
                <label htmlFor="prompt-input-tryon" className="font-semibold text-lg text-gray-300">3. Add Instructions (Optional)</label>
                <textarea
                    id="prompt-input-tryon"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: 'Change the t-shirt color to blue.'"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#56FF00] focus:border-[#56FF00] transition text-gray-200 resize-none"
                    rows={3}
                    disabled={isProcessing}
                />
            </div>


            <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                <button
                    onClick={handleSubmit}
                    disabled={isProcessing || !modelFile || garmentFiles.length === 0}
                    className="w-full md:w-1/2 px-8 py-3 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center"
                >
                    {isLoading ? <><Spinner /> <span className="ml-2">Processing...</span></> : 'Virtual Try-On'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2 text-center whitespace-pre-wrap">{error}</p>}
            </div>

            {resultImage && <ResultDisplay imageSrc={resultImage} />}
        </div>
    );
};

export default VirtualTryOn;