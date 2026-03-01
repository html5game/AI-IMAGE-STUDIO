import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { EditMode } from '../../types';

interface CanvasEditorProps {
    imageSrc: string;
    mode: EditMode;
    isProcessing: boolean;
}

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const CanvasEditor = forwardRef(({ imageSrc, mode, isProcessing }: CanvasEditorProps, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const [brushSize, setBrushSize] = useState(40);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });
    const [outpaintAspectRatio, setOutpaintAspectRatio] = useState('1:1');

    // Load image and set initial canvas size
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        img.onload = () => {
            setImageElement(img);
            const containerWidth = containerRef.current?.offsetWidth || 512;
            const aspectRatio = img.width / img.height;
            const width = containerWidth;
            const height = containerWidth / aspectRatio;
            setCanvasSize({ width, height });
        };
    }, [imageSrc]);

    // Redraw canvases when size or image changes
    useEffect(() => {
        if (!imageElement) return;

        const draw = () => {
            const imageCtx = imageCanvasRef.current?.getContext('2d');
            if (imageCtx) {
                imageCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
                // For outpainting, center the image
                if (mode === EditMode.Outpaint) {
                     const x = (canvasSize.width - imageElement.width) / 2;
                     const y = (canvasSize.height - imageElement.height) / 2;
                     imageCtx.drawImage(imageElement, x, y);
                } else {
                     imageCtx.drawImage(imageElement, 0, 0, canvasSize.width, canvasSize.height);
                }
            }
             if (maskCanvasRef.current) {
                const maskCtx = maskCanvasRef.current.getContext('2d');
                if(maskCtx){
                    // Make sure mask is cleared if we are not preserving it across resizes
                }
            }
        };

        draw();

    }, [imageElement, canvasSize, mode]);

    const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const drawOnMask = (x: number, y: number, isNewLine: boolean = false) => {
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (!maskCtx) return;

        maskCtx.strokeStyle = 'white';
        maskCtx.fillStyle = 'white';
        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';

        if (isNewLine || !lastPos) {
             maskCtx.beginPath();
             maskCtx.moveTo(x, y);
        } else {
             maskCtx.lineTo(x, y);
             maskCtx.stroke();
        }
        
        // Draw a circle at the point to fill gaps
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();


        setLastPos({ x, y });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== EditMode.Inpaint || isProcessing) return;
        setIsDrawing(true);
        const pos = getMousePos(maskCanvasRef.current!, e);
        drawOnMask(pos.x, pos.y, true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || mode !== EditMode.Inpaint || isProcessing) return;
        const pos = getMousePos(maskCanvasRef.current!, e);
        drawOnMask(pos.x, pos.y);
    };
    
    const handleMouseUp = () => {
        setIsDrawing(false);
        setLastPos(null);
    };

    const clearMask = () => {
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (maskCtx) {
            maskCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        }
    };
    
     const handleAspectRatioChange = (ar: string) => {
        if (!imageElement) return;
        setOutpaintAspectRatio(ar);
        
        const [w, h] = ar.split(':').map(Number);
        const newAspectRatio = w / h;

        let newWidth, newHeight;

        // Fit the original image within the new aspect ratio
        if (imageElement.width / imageElement.height > newAspectRatio) {
            // Original is wider, so width determines scale
            newWidth = imageElement.width * 1.25; // Add some padding
            newHeight = newWidth / newAspectRatio;
        } else {
            // Original is taller, so height determines scale
            newHeight = imageElement.height * 1.25; // Add some padding
            newWidth = newHeight * newAspectRatio;
        }
        
         const containerWidth = containerRef.current?.offsetWidth || 512;
         const scale = containerWidth / newWidth;

        setCanvasSize({ width: newWidth * scale, height: newHeight * scale });
    };

    useImperativeHandle(ref, () => ({
        export: async (): Promise<{ image: string; mask: string }> => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            if (!tempCtx) throw new Error("Could not create temporary canvas context");

            const exportWidth = imageElement?.width || 512;
            const exportHeight = imageElement?.height || 512;
            
            let finalImage: HTMLCanvasElement;
            let finalMask: HTMLCanvasElement;
            
            if (mode === EditMode.Outpaint) {
                 const [w, h] = outpaintAspectRatio.split(':').map(Number);
                 const ar = w / h;
                 const finalExportWidth = exportWidth * 1.5 > 1024 ? 1024 : exportWidth * 1.5;
                 const finalExportHeight = finalExportWidth / ar;

                 // Create the final image canvas (original image on larger transparent bg)
                 const imageExportCanvas = document.createElement('canvas');
                 imageExportCanvas.width = finalExportWidth;
                 imageExportCanvas.height = finalExportHeight;
                 const imageExportCtx = imageExportCanvas.getContext('2d')!;
                 imageExportCtx.drawImage(imageElement!, (finalExportWidth - exportWidth) / 2, (finalExportHeight - exportHeight) / 2);
                 finalImage = imageExportCanvas;

                 // Create the final mask canvas (white where image is not)
                 const maskExportCanvas = document.createElement('canvas');
                 maskExportCanvas.width = finalExportWidth;
                 maskExportCanvas.height = finalExportHeight;
                 const maskExportCtx = maskExportCanvas.getContext('2d')!;
                 maskExportCtx.fillStyle = 'white';
                 maskExportCtx.fillRect(0, 0, finalExportWidth, finalExportHeight);
                 maskExportCtx.clearRect((finalExportWidth - exportWidth) / 2, (finalExportHeight - exportHeight) / 2, exportWidth, exportHeight);
                 finalMask = maskExportCanvas;

            } else { // Inpaint
                finalImage = imageCanvasRef.current!;
                finalMask = maskCanvasRef.current!;
            }

            return {
                image: finalImage.toDataURL('image/png'),
                mask: finalMask.toDataURL('image/png'),
            };
        }
    }));

    return (
        <div className="space-y-4">
            <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${canvasSize.width}/${canvasSize.height}` }}>
                <canvas ref={imageCanvasRef} width={canvasSize.width} height={canvasSize.height} className="absolute top-0 left-0 w-full h-full rounded-lg" />
                <canvas
                    ref={maskCanvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className={`absolute top-0 left-0 w-full h-full rounded-lg ${mode === EditMode.Inpaint && !isProcessing ? 'cursor-crosshair' : ''} opacity-70`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>

            {mode === EditMode.Inpaint && (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-gray-900/50 rounded-lg">
                    <label htmlFor="brush-size" className="text-sm font-medium text-gray-300 whitespace-nowrap">Brush Size:</label>
                    <input
                        id="brush-size"
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        disabled={isProcessing}
                    />
                    <button
                        onClick={clearMask}
                        className="px-4 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors w-full sm:w-auto"
                        disabled={isProcessing}
                    >
                        Clear Mask
                    </button>
                </div>
            )}
             {mode === EditMode.Outpaint && (
                <div className="flex flex-col space-y-2 p-2 bg-gray-900/50 rounded-lg">
                    <label className="text-sm font-medium text-gray-300">Target Aspect Ratio:</label>
                     <div className="flex flex-wrap gap-2">
                        {aspectRatios.map(ar => (
                            <button 
                                key={ar} 
                                onClick={() => handleAspectRatioChange(ar)} 
                                disabled={isProcessing}
                                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#56FF00] ${
                                    outpaintAspectRatio === ar
                                    ? 'bg-[#56FF00] text-black' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default CanvasEditor;
