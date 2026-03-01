import React, { useState } from 'react';
import { Feature, AnalyzedPrompts, HistoryItem } from './types';
import ImageEdit from './components/ImageEdit';
import ImageGeneration from './components/ImageGeneration';
import ImageAnalysis from './components/ImageAnalysis';
import VirtualTryOn from './components/VirtualTryOn';
import VideoGeneration from './components/VideoGeneration';
import History from './components/History';
import { useHistory } from './hooks/useHistory';

// --- Icon Components for Navigation ---
const CreateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);
const TryOnIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const AnalyzeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const VideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);


const navItems = [
    { feature: Feature.ImageGeneration, label: "Create Image", shortLabel: "Create", Icon: CreateIcon },
    { feature: Feature.ImageEdit, label: "Edit Image", shortLabel: "Edit", Icon: EditIcon },
    { feature: Feature.VirtualTryOn, label: "Virtual Try-On", shortLabel: "Try-On", Icon: TryOnIcon },
    { feature: Feature.ImageAnalysis, label: "Analyze Image", shortLabel: "Analyze", Icon: AnalyzeIcon },
    { feature: Feature.VideoGeneration, label: "Generate Video", shortLabel: "Video", Icon: VideoIcon },
];

const App: React.FC = () => {
    const [activeFeature, setActiveFeature] = useState<Feature>(Feature.ImageGeneration);
    const { history, addToHistory, clearHistory } = useHistory();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // State for ImageGeneration
    const [generationPrompt, setGenerationPrompt] = useState<string>('');
    
    // State for ImageEdit
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
    const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);

    // State for ImageAnalysis
    const [analysisPrompt, setAnalysisPrompt] = useState<string>('Example: What is the prompt for this image? or something you want to ask about image you uploaded');
    const [analysisImageFile, setAnalysisImageFile] = useState<File | null>(null);
    const [analysisImagePreview, setAnalysisImagePreview] = useState<string | null>(null);
    const [analysisResults, setAnalysisResults] = useState<AnalyzedPrompts | null>(null);

    // State for VideoGeneration
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
    const [videoImageFile, setVideoImageFile] = useState<File | null>(null);
    const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null);

    const handlePromptAction = (promptText: string) => {
        setGenerationPrompt(promptText);
        setActiveFeature(Feature.ImageGeneration);
    };

    const getTabClass = (feature: Feature) => {
        const base = 'transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[#56FF00] rounded-lg transform disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100';
        const mobile = 'flex flex-col items-center justify-center flex-1 p-2 text-xs font-medium';
        const desktop = 'md:flex-row md:flex-initial md:text-sm md:px-4 md:py-2 md:gap-2';
        const active = 'bg-[#56FF00] text-black shadow-lg shadow-[#56FF00]/30 scale-105';
        const inactive = 'text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-lg hover:shadow-[#56FF00]/30 hover:scale-105';

        return `${base} ${mobile} ${desktop} ${activeFeature === feature ? active : inactive}`;
    };
    
    const renderStudio = () => (
        <>
            <nav className="md:flex md:justify-center md:mb-6">
                <div className="fixed bottom-0 left-0 right-0 z-10 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 md:relative md:bg-gray-900/50 md:p-1.5 md:rounded-lg md:border md:w-auto md:border-t-0">
                    <div className="flex justify-around items-center p-1 md:flex-wrap md:justify-center md:gap-2 md:p-0">
                        {navItems.map(({ feature, label, shortLabel, Icon }) => (
                            <button key={feature} onClick={() => setActiveFeature(feature)} className={getTabClass(feature)} disabled={isProcessing}>
                                <Icon />
                                <span className="mt-1 md:hidden">{shortLabel}</span>
                                <span className="hidden md:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <main
                className="relative max-w-6xl mx-auto rounded-2xl p-[2px]"
                style={{
                    '--angle': '0deg',
                    background: 'conic-gradient(from var(--angle), transparent 25%, #56ff00, transparent 40%)',
                    animation: 'rotate 4s linear infinite',
                } as React.CSSProperties}
            >
                <div className="bg-gray-800 rounded-[14px] pb-24 md:pb-0">
                    <div className="p-6 sm:p-8">
                        <div>
                            <div style={{ display: activeFeature === Feature.ImageGeneration ? 'block' : 'none' }}>
                                <ImageGeneration 
                                    onImageGenerated={addToHistory} 
                                    prompt={generationPrompt}
                                    setPrompt={setGenerationPrompt}
                                    isProcessing={isProcessing}
                                    setIsProcessing={setIsProcessing}
                                />
                            </div>
                            <div style={{ display: activeFeature === Feature.ImageEdit ? 'block' : 'none' }}>
                                <ImageEdit 
                                    onImageEdited={addToHistory}
                                    prompt={editPrompt}
                                    setPrompt={setEditPrompt}
                                    imageFiles={editImageFiles}
                                    setImageFiles={setEditImageFiles}
                                    imagePreviews={editImagePreviews}
                                    setImagePreviews={setEditImagePreviews}
                                    isProcessing={isProcessing}
                                    setIsProcessing={setIsProcessing}
                                />
                            </div>
                            <div style={{ display: activeFeature === Feature.VirtualTryOn ? 'block' : 'none' }}>
                                <VirtualTryOn 
                                    onHistoryAdd={addToHistory} 
                                    isProcessing={isProcessing}
                                    setIsProcessing={setIsProcessing}
                                />
                            </div>
                             <div style={{ display: activeFeature === Feature.ImageAnalysis ? 'block' : 'none' }}>
                                <ImageAnalysis
                                    prompt={analysisPrompt}
                                    setPrompt={setAnalysisPrompt}
                                    imageFile={analysisImageFile}
                                    setImageFile={setAnalysisImageFile}
                                    imagePreview={analysisImagePreview}
                                    setImagePreview={setAnalysisImagePreview}
                                    results={analysisResults}
                                    setResults={setAnalysisResults}
                                    onImageAnalyzed={addToHistory}
                                    onPromptAction={handlePromptAction}
                                    isProcessing={isProcessing}
                                    setIsProcessing={setIsProcessing}
                                />
                            </div>
                             <div style={{ display: activeFeature === Feature.VideoGeneration ? 'block' : 'none' }}>
                                <VideoGeneration
                                    prompt={videoPrompt}
                                    setPrompt={setVideoPrompt}
                                    aspectRatio={videoAspectRatio}
                                    setAspectRatio={setVideoAspectRatio}
                                    resolution={videoResolution}
                                    setResolution={setVideoResolution}
                                    imageFile={videoImageFile}
                                    setImageFile={setVideoImageFile}
                                    imagePreview={videoImagePreview}
                                    setImagePreview={setVideoImagePreview}
                                    isProcessing={isProcessing}
                                    setIsProcessing={setIsProcessing}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {history.length > 0 && <History history={history} onClearHistory={clearHistory} />}
        </>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4">
            <header className="text-center mb-6">
                 <a href="/index.html" className="inline-block">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#56FF00] to-cyan-400 text-transparent bg-clip-text pb-2">
                        AI Image Studio
                    </h1>
                </a>
                <p className="text-gray-400">Bring your visual ideas to life. Create, edit, and analyze images with the power of AI.</p>
            </header>
            
            {renderStudio()}

            <footer className="text-center mt-12 text-gray-500 text-sm">
                <div className="space-x-4">
                    <a href="/about.html" className="hover:text-[#56FF00]">About</a>
                    <span>•</span>
                    <a href="/faq.html" className="hover:text-[#56FF00]">FAQ</a>
                    <span>•</span>
                    <a href="/privacy.html" className="hover:text-[#56FF00]">Privacy Policy</a>
                </div>
                <p className="mt-2">Powered by Google Gemini</p>
            </footer>
        </div>
    );
};

export default App;
