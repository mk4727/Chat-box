import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, FileText } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const { sendMessage, sendPDF, sendImage } = useChatStore(); // Added sendImage

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result); // Show preview locally
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePDFChange = (e) => {
    const file = e.target.files[0];
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    setPdfFile(file);
  };

  const removePDF = () => {
    setPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !pdfFile) return;

    try {
      // Send PDF if present
      if (pdfFile) {
        await sendPDF(pdfFile);
        setPdfFile(null);
        if (pdfInputRef.current) pdfInputRef.current.value = "";
      }

      // Send image if present
      if (imagePreview) {
        const file = fileInputRef.current.files[0];
        await sendImage(file); // Use sendImage instead of sendMessage for images
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      // Send text if present (and no image, since image is handled separately)
      if (text.trim() && !imagePreview) {
        await sendMessage({ text: text.trim() });
        setText("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {pdfFile && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <span className="text-sm">{pdfFile.name}</span>
            <button
              onClick={removePDF}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={pdfInputRef}
            onChange={handlePDFChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${
              imagePreview ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${
              pdfFile ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => pdfInputRef.current?.click()}
          >
            <FileText size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !pdfFile}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;