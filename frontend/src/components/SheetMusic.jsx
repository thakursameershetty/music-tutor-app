import React, { useEffect, useRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

const SheetMusic = ({ xmlData }) => {
  const containerRef = useRef(null);
  const osmdRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !xmlData) return;

    // Initialize OSMD if not already done
    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: "svg",
        drawingParameters: "compacttight",
        drawTitle: true,
        drawPartNames: false,
      });
    }

    // Load and Render
    const loadScore = async () => {
      try {
        await osmdRef.current.load(xmlData);
        osmdRef.current.render();
      } catch (e) {
        console.error("OSMD Rendering Error:", e);
      }
    };

    loadScore();

    // Cleanup on unmount (optional but good practice)
    return () => {
      // OSMD doesn't have a strict destroy method, but we can clear the ref if needed
    };

  }, [xmlData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white overflow-hidden"
    />
  );
};

export default SheetMusic;