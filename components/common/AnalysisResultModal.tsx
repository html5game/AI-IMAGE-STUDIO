import React, { useState, useCallback } from 'react';
import { AnalysisHistoryItem } from '../../types';

interface AnalysisResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: AnalysisHistoryItem;
}

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

const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({ isOpen, onClose, item }) => {
    const [copiedKey, setCopiedKey] = useState<'simple' | 'detailed' | null>(null);

    const handleCopy = useCallback((textToCopy: string, key: 'simple' | 'detailed') => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        }).catch(err => {
            console.error("Failed to copy text:", err);
        });
    }, []);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full md:w-1/2 flex-shrink-0 bg-gray-900">
                    <img src={item.inputImageData} alt="Analyzed input" className="w-full h-full object-contain" />
                </div>
                <div className="w-full md:w-1/2 p-6 overflow-y-auto">
                     <h2 className="text-xl font-bold mb-1 text-[#56FF00]">Analysis Result</h2>
                     <p className="text-sm text-gray-400 mb-4 italic">Your question: "{item.prompt}"</p>
                     
                     <div className="space-y-4">
                        <div>
                             <h3 className="text-md font-semibold text-gray-300 mb-1">Simple prompt</h3>
                             <div className="bg-gray-900/50 p-3 rounded-lg flex items-start justify-between gap-2">
                                <p className="text-gray-300 text-sm whitespace-pre-wrap flex-grow">{item.results.simplePrompt}</p>
                                <button
                                    onClick={() => handleCopy(item.results.simplePrompt, 'simple')}
                                    className="p-1.5 bg-gray-700/50 text-gray-300 rounded-md border border-gray-600 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#56FF00] flex-shrink-0"
                                    aria-label="Copy simple prompt"
                                    title={copiedKey === 'simple' ? "Copied!" : "Copy simple prompt"}
                                >
                                    {copiedKey === 'simple' ? <CheckIcon /> : <CopyIcon />}
                                </button>
                            </div>
                        </div>
                        
                        <div>
                             <h3 className="text-md font-semibold text-gray-300 mb-1">Detailed prompt</h3>
                             <div className="bg-gray-900/50 p-3 rounded-lg flex items-start justify-between gap-2">
                                <p className="text-gray-300 text-sm whitespace-pre-wrap flex-grow">{item.results.detailedPrompt}</p>
                                <button
                                    onClick={() => handleCopy(item.results.detailedPrompt, 'detailed')}
                                    className="p-1.5 bg-gray-700/50 text-gray-300 rounded-md border border-gray-600 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#56FF00] flex-shrink-0"
                                    aria-label="Copy detailed prompt"
                                    title={copiedKey === 'detailed' ? "Copied!" : "Copy detailed prompt"}
                                >
                                    {copiedKey === 'detailed' ? <CheckIcon /> : <CopyIcon />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                 <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 text-white bg-gray-900 rounded-full p-2 hover:bg-gray-700 transition-colors"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default AnalysisResultModal;