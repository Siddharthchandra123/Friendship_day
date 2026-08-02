import React, { useState, useRef } from 'react';
import { Award, Download, Heart, FileCheck, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const CertificateGenerator: React.FC = () => {
  const [friendName1, setFriendName1] = useState('');
  const [friendName2, setFriendName2] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement | null>(null);

  const handleDownloadPDF = async () => {
    const certEl = certificateRef.current;
    if (!certEl) return;

    try {
      setIsGenerating(true);
      
      // Let html2canvas capture the element. Enable CORS and use scale 2 for HD quality.
      const canvas = await html2canvas(certEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a' // bg-slate-900 baseline color
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create landscape PDF matching canvas aspect ratio
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('friendverse-friendship-certificate.pdf');
      
      setIsGenerating(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setIsGenerating(false);
      alert('Could not download PDF. Make sure your browser permissions allow canvas exports.');
    }
  };

  const currentDate = new Date().toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          Friendship Certificate Creator 📜
        </h2>
        <p className="text-slate-400 text-sm">
          Design and download an official Certificate of Friendship to celebrate and archive your bond.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* INPUT FORM (Left Column) */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5">
            <h3 className="text-lg font-bold font-display text-white border-b border-white/5 pb-2">
              Certificate Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={friendName1}
                  onChange={(e) => setFriendName1(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 text-sm"
                  maxLength={25}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Bestie's Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Watson"
                  value={friendName2}
                  onChange={(e) => setFriendName2(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 text-sm"
                  maxLength={25}
                />
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating || !friendName1.trim() || !friendName2.trim()}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-40 disabled:hover:bg-purple-600 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* CERTIFICATE PREVIEW (Right 2 Columns) */}
        <div className="lg:col-span-2 flex flex-col justify-start">
          
          {/* Wrapper to handle scaling and scroll constraints in mobile responsive view */}
          <div className="w-full overflow-x-auto pb-4">
            
            {/* Target Element to print */}
            <div
              ref={certificateRef}
              className="w-[680px] h-[480px] p-8 bg-slate-900 rounded-2xl border-8 border-double border-amber-500/40 relative flex flex-col items-center justify-between text-center shadow-2xl shrink-0 overflow-hidden"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Premium Glow Background Blobs inside Certificate */}
              <div className="absolute top-[-100px] left-[-100px] w-64 h-64 rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 rounded-full bg-pink-500/10 blur-[80px] pointer-events-none" />

              {/* Decorative Corner Borders */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-500/30" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-500/30" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-500/30" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-500/30" />

              {/* Top Seal Badge */}
              <div className="flex flex-col items-center gap-1.5 mt-2 z-10">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Award size={28} />
                </div>
                <span className="text-[10px] font-bold text-amber-500/70 tracking-widest uppercase font-display">
                  Official Document
                </span>
              </div>

              {/* Core Text Content */}
              <div className="space-y-4 max-w-lg z-10">
                <h1 className="text-4xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 tracking-tight leading-none">
                  Certificate of Friendship
                </h1>
                
                <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                  This honor is proudly conferred upon
                </p>

                {/* Friends Names */}
                <div className="py-2.5 border-b border-slate-700/60 max-w-md mx-auto">
                  <h3 className="text-2xl font-black text-white italic font-display tracking-wide px-4 truncate min-h-[32px]">
                    {friendName1.trim() && friendName2.trim() 
                      ? `${friendName1.trim()} & ${friendName2.trim()}`
                      : "Alex Mercer & John Watson"}
                  </h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-sm mx-auto px-4 italic">
                  "For standing strong together across seasons, showing unwavering support, sharing endless inside jokes, and demonstrating that true friendship knows no distance."
                </p>
              </div>

              {/* Footer and Date */}
              <div className="w-full flex justify-between items-end px-12 border-t border-slate-800/80 pt-6 mb-2 z-10">
                {/* Date */}
                <div className="text-left flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</span>
                  <span className="text-xs text-slate-300 font-semibold">{currentDate}</span>
                </div>

                {/* Love Signature Seal */}
                <div className="flex items-center gap-1">
                  <Heart size={14} className="text-pink-500 fill-pink-500 animate-pulse" />
                  <span className="font-display text-xs text-slate-300 font-bold tracking-wider">FriendVerse</span>
                </div>

                {/* Verification Stamp */}
                <div className="text-right flex flex-col items-end gap-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                    <FileCheck size={12} /> Verified Besties
                  </span>
                </div>
              </div>

            </div>
          </div>

          <span className="text-[10px] text-slate-500 text-center mt-2 leading-relaxed">
            * Complete the details on the left, check the preview, and download your high-quality PDF copy.
          </span>
        </div>

      </div>
    </div>
  );
};
export default CertificateGenerator;



