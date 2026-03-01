
import React, { useState } from 'react';
import ImageModal from './Modal';

interface ResultDisplayProps {
    imageSrc: string;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageSrc }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `ai-image-studio-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="mt-8 pt-6 border-t border-gray-700">
                <h2 className="text-2xl font-bold text-center mb-4 text-[#56FF00]">Your Result</h2>
                <div className="flex flex-col items-center gap-4">
                     <div className="bg-gray-800/50 p-4 rounded-xl">
                        <img 
                            src={imageSrc} 
                            alt="Generated result" 
                            className="rounded-lg max-w-full md:max-w-xl shadow-2xl cursor-pointer transition-transform duration-300 hover:scale-105"
                            onClick={() => setIsModalOpen(true)}
                        />
                    </div>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                        aria-label="Download image"
                    >
                        <DownloadIcon />
                        <span>Download Image</span>
                    </button>
                </div>
            </div>
            <ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} imageSrc={imageSrc} />
        </>
    );
};

export default ResultDisplay;