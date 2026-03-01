import React, { useState, useCallback } from 'react';
import { fileToBase64 } from '../utils/fileUtils';
import { editImageWithText } from '../services/geminiService';
import Spinner from './common/Spinner';
import { Feature, ImageHistoryItem } from '../types';
import ImageModal from './common/Modal';
import ResultDisplay from './common/ResultDisplay';


const MAX_FILES = 3;
const imageCounts = [1, 2, 3, 4];

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

interface ImageEditProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    imageFiles: File[];
    setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
    imagePreviews: string[];
    setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
    onImageEdited: (item: Omit<ImageHistoryItem, 'id' | 'timestamp'>) => void;
    isProcessing: boolean;
    setIsProcessing: (isProcessing: boolean) => void;
}

const ImageEdit: React.FC<ImageEditProps> = ({
    prompt,
    setPrompt,
    imageFiles,
    setImageFiles,
    imagePreviews,
    setImagePreviews,
    onImageEdited,
    isProcessing,
    setIsProcessing,
}) => {
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [numberOfImages, setNumberOfImages] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModalImage, setSelectedModalImage] = useState<string | null>(null);

    // Handler for multi-image text prompt mode
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const totalFiles = imageFiles.length + files.length;
            
            if (totalFiles > MAX_FILES) {
                setError(`You can only upload a maximum of ${MAX_FILES} images.`);
                e.target.value = ''; 
                return;
            }

            const newFiles = [...imageFiles, ...files];
            setImageFiles(newFiles);

            const newPreviews = files.map(file => URL.createObjectURL(file as Blob));
            setImagePreviews(prev => [...prev, ...newPreviews]);
            
            setResultImages([]);
            setError(null);
            e.target.value = '';
        }
    };
    
    const removeImage = (indexToRemove: number) => {
        URL.revokeObjectURL(imagePreviews[indexToRemove]);
        setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
        if (imageFiles.length === 1) { // Reset results if last image is removed
            setResultImages([]);
        }
    };


    const handleSubmit = useCallback(async () => {
        if (!prompt || imageFiles.length === 0) {
            setError("Please provide a prompt and upload at least one image.");
            return;
        }

        setIsLoading(true);
        setIsProcessing(true);
        setError(null);
        setResultImages([]);

        try {
            const imageInputs = await Promise.all(
                imageFiles.map(async (file) => ({
                    base64: await fileToBase64(file),
                    mimeType: file.type,
                }))
            );
            const editedImageBase64Array = await editImageWithText(prompt, imageInputs, numberOfImages);
            const imageUrls = editedImageBase64Array.map(base64 => `data:image/png;base64,${base64}`);
            setResultImages(imageUrls);
            
            imageUrls.forEach(imageUrl => {
                    onImageEdited({ type: Feature.ImageEdit, imageData: imageUrl, prompt });
            });
            
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setIsProcessing(false);
        }
    }, [prompt, imageFiles, onImageEdited, setIsProcessing, numberOfImages]);
    
     const handleDownload = (imageSrc: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `ai-image-studio-edit-${Date.now()}-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="space-y-6">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-200">Edit Mode</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                        <label className="font-semibold text-lg text-gray-300">1. Upload Your Image(s)</label>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="file-input-edit" className={`flex flex-col items-center justify-center w-full h-36 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800 ${(imageFiles.length < MAX_FILES && !isProcessing) ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-50'} transition-colors`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">PNG, JPG, WEBP (Max {MAX_FILES})</p>
                                </div>
                                <input id="file-input-edit" type="file" className="hidden" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={imageFiles.length >= MAX_FILES || isProcessing} />
                            </label>
                        </div>
                            {imagePreviews.length > 0 && (
                            <div className="mt-4 p-2 bg-gray-800 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Image Previews:</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative group">
                                            <img src={preview} alt={`Preview ${index + 1}`} className="rounded-md w-full h-full object-cover aspect-square" />
                                            <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Remove image ${index + 1}`} disabled={isProcessing}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col space-y-4">
                        <label htmlFor="prompt-input-edit" className="font-semibold text-lg text-gray-300">2. Describe The Edit</label>
                        <textarea id="prompt-input-edit" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Example: 'Make the sky look like a sunset.'" className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#56FF00] focus:border-[#56FF00] transition text-gray-200 resize-none" rows={6} disabled={isProcessing} />
                    </div>
                </div>
                <div className="flex flex-col space-y-4 pt-4">
                    <label className="font-semibold text-lg text-gray-300">3. Number of Images</label>
                    <div className="flex flex-wrap gap-2">
                        {imageCounts.map(n => ( <button key={n} onClick={() => setNumberOfImages(n)} disabled={isProcessing} className={`px-4 py-2 w-14 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#56FF00] ${ numberOfImages === n ? 'bg-[#56FF00] text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600' }`}>{n}</button>))}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                    <button onClick={handleSubmit} disabled={isProcessing || !prompt || imageFiles.length === 0} className="w-full md:w-1/2 px-8 py-3 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center">
                        {isLoading ? <><Spinner /> <span className="ml-2">Editing...</span></> : 'Edit Image'}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2 text-center whitespace-pre-wrap">{error}</p>}
                </div>

                 {resultImages.length > 0 && (
                    resultImages.length > 1 ? (
                        <div className="mt-8 pt-6 border-t border-gray-700">
                            <h2 className="text-2xl font-bold text-center mb-4 text-[#56FF00]">Your Results</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {resultImages.map((src, index) => (
                                    <div key={index} className="flex flex-col items-center gap-4">
                                        <div className="bg-gray-800/50 p-2 rounded-xl w-full">
                                            <img src={src} alt={`Edited result ${index + 1}`} className="rounded-lg w-full shadow-lg cursor-pointer transition-transform duration-300 hover:scale-105" onClick={() => setSelectedModalImage(src)} />
                                        </div>
                                        <button onClick={() => handleDownload(src, index)} className="inline-flex items-center gap-2 px-6 py-2 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] transition-all duration-300 transform hover:scale-105" aria-label={`Download image ${index + 1}`}>
                                            <DownloadIcon />
                                            <span>Download</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <ResultDisplay imageSrc={resultImages[0]} />
                    )
                )}
            </div>
            {selectedModalImage && <ImageModal isOpen={!!selectedModalImage} onClose={() => setSelectedModalImage(null)} imageSrc={selectedModalImage} />}
        </>
    );
};

export default ImageEdit;