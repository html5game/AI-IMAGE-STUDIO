
import React, { useState, useMemo } from 'react';
import { HistoryItem, Feature, ImageHistoryItem, AnalysisHistoryItem } from '../types';
import ImageModal from './common/Modal';
import AnalysisResultModal from './common/AnalysisResultModal';

interface HistoryProps {
    history: HistoryItem[];
    onClearHistory: () => void;
}

const AnalyzeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

type HistoryTab = 'create' | 'analyze';

const History: React.FC<HistoryProps> = ({ history, onClearHistory }) => {
    const [activeTab, setActiveTab] = useState<HistoryTab>('create');

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistoryItem | null>(null);

    const closeModal = () => {
        setSelectedImage(null);
        setSelectedAnalysis(null);
    };

    const { createEditHistory, analysisHistory } = useMemo(() => {
        const createEditHistory: ImageHistoryItem[] = [];
        const analysisHistory: AnalysisHistoryItem[] = [];

        history.forEach(item => {
            if (item.type === Feature.ImageAnalysis) {
                analysisHistory.push(item);
            } else {
                createEditHistory.push(item);
            }
        });
        return { createEditHistory, analysisHistory };
    }, [history]);

    const getTabClass = (tab: HistoryTab) => {
        return activeTab === tab 
            ? 'bg-gray-700 text-[#56FF00]' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700';
    };

    const visibleHistory = activeTab === 'create' ? createEditHistory : analysisHistory;

    return (
        <section className="mt-12 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#56FF00]">History</h2>
                <button 
                    onClick={onClearHistory}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                     <span>Clear History</span>
                </button>
            </div>

            <div className="mb-4 flex space-x-2 border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('create')} 
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${getTabClass('create')}`}
                >
                    Images
                </button>
                <button 
                    onClick={() => setActiveTab('analyze')} 
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${getTabClass('analyze')}`}
                >
                    Analyze
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700 min-h-[150px]">
                {visibleHistory.length === 0 && (
                    <div className="col-span-full flex items-center justify-center text-gray-500">
                        No history for this category yet.
                    </div>
                )}
                {visibleHistory.map(item => {
                    if (item.type === Feature.ImageAnalysis) {
                        return (
                             <div 
                                key={item.id} 
                                className="relative group cursor-pointer"
                                onClick={() => setSelectedAnalysis(item)}
                            >
                                <img 
                                    src={item.inputImageData} 
                                    alt={item.prompt} 
                                    className="rounded-lg w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex flex-col items-center justify-center p-2 text-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <AnalyzeIcon />
                                        <p className="text-white text-xs mt-1 line-clamp-3">
                                            {item.prompt}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    // Otherwise, it's an ImageHistoryItem
                    return (
                        <div 
                            key={item.id} 
                            className="relative group cursor-pointer"
                            onClick={() => setSelectedImage(item.imageData)}
                        >
                            <img 
                                src={item.imageData} 
                                alt={item.prompt} 
                                className="rounded-lg w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center p-2">
                                <p className="text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-4">
                                    {item.prompt}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedImage && <ImageModal isOpen={!!selectedImage} onClose={closeModal} imageSrc={selectedImage} />}
            {selectedAnalysis && <AnalysisResultModal isOpen={!!selectedAnalysis} onClose={closeModal} item={selectedAnalysis} />}
        </section>
    );
};

export default History;