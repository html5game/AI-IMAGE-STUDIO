
export enum Feature {
  ImageGeneration = 'ImageGeneration',
  ImageEdit = 'ImageEdit',
  ImageAnalysis = 'ImageAnalysis',
  VirtualTryOn = 'VirtualTryOn',
  VideoGeneration = 'VideoGeneration',
}

export enum EditMode {
  Inpaint = 'Inpaint',
  Outpaint = 'Outpaint',
}

export interface AnalyzedPrompts {
    simplePrompt: string;
    detailedPrompt: string;
}

export interface ImageHistoryItem {
  id: string;
  type: Feature.ImageGeneration | Feature.ImageEdit | Feature.VirtualTryOn;
  imageData: string; // data URI of the *output* image
  prompt: string;
  timestamp: number;
}

export interface AnalysisHistoryItem {
    id: string;
    type: Feature.ImageAnalysis;
    inputImageData: string; // data URI of the *input* image
    prompt: string; // The user's question about the image
    results: AnalyzedPrompts;
    timestamp: number;
}

export type HistoryItem = ImageHistoryItem | AnalysisHistoryItem;

// Fix: To resolve conflicts with other declarations of `window.aistudio`, the `AIStudio` interface
// and its attachment to the `Window` object are defined within `declare global`. This makes `AIStudio`
// a true global type, preventing TypeScript from treating declarations in different files as
// distinct types, which was causing the "subsequent property declarations must have the same type" error.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        // Fix: Made 'aistudio' optional to resolve the "All declarations of 'aistudio' must have identical modifiers" error.
        aistudio?: AIStudio;
    }
}
