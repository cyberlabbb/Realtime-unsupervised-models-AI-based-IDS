// contexts/CaptureContext.js
import { createContext, useContext, useState } from "react";

const CaptureContext = createContext();

export const CaptureProvider = ({ children }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const value = {
    isCapturing,
    setIsCapturing,
  };

  return (
    <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
  );
};

export const useCapture = () => {
  const context = useContext(CaptureContext);
  if (!context) {
    throw new Error("useCapture must be used within a CaptureProvider");
  }
  return context;
};
