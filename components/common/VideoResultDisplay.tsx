import React from 'react';

interface VideoResultDisplayProps {
    videoSrc: string;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const VideoResultDisplay: React.FC<VideoResultDisplayProps> = ({ videoSrc }) => {
    
    const handleDownload = async () => {
        try {
            // Fetch the blob from the blob URL
            const response = await fetch(videoSrc);
            const blob = await response.blob();
            
            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `ai-video-studio-${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the temporary URL
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to download video:", error);
            // Optionally, show an error to the user
        }
    };

    return (
        <div className="mt-8 pt-6 border-t border-gray-700">
            <h2 className="text-2xl font-bold text-center mb-4 text-[#56FF00]">Your Video Result</h2>
            <div className="flex flex-col items-center gap-4">
                 <div className="bg-gray-800/50 p-2 rounded-xl w-full max-w-2xl">
                    <video
                        src={videoSrc}
                        controls
                        autoPlay
                        loop
                        className="rounded-lg w-full shadow-2xl"
                    />
                </div>
                <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-[#56FF00] text-black font-bold rounded-lg hover:bg-[#45cc00] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                    aria-label="Download video"
                >
                    <DownloadIcon />
                    <span>Download Video</span>
                </button>
            </div>
        </div>
    );
};

export default VideoResultDisplay;
