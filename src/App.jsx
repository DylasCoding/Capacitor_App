import React, { useState, useRef } from "react";
import { Camera, CameraSource, CameraResultType } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import "./App.css";

function App() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [filter, setFilter] = useState("none");
    const [frame, setFrame] = useState("none");
    const canvasRef = useRef(null);

    // chọn ảnh từ thư viện
    const pickImage = async () => {
        const photo = await Camera.getPhoto({
            source: CameraSource.Photos,
            resultType: CameraResultType.Uri,
            quality: 100,
        });
        setImage(photo.webPath);

        // Gọi drawMeme ngay sau khi cập nhật hình ảnh
        setTimeout(drawMeme, 0);
    };

    // vẽ meme với filter + frame
    const drawMeme = () => {
        if (!image) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = image;
        img.onload = () => {
            // set size
            canvas.width = img.width;
            canvas.height = img.height;

            // áp dụng filter
            ctx.filter = filter;
            ctx.drawImage(img, 0, 0);

            // reset filter để vẽ chữ
            ctx.filter = "none";

            // vẽ khung preset
            if (frame === "square") {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 20;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            } else if (frame === "circle") {
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 20;
                ctx.beginPath();
                ctx.arc(
                    canvas.width / 2,
                    canvas.height / 2,
                    Math.min(canvas.width, canvas.height) / 2 - 20,
                    0,
                    2 * Math.PI
                );
                ctx.stroke();
            }

            // vẽ chữ
            ctx.font = "50px Impact";
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 4;
            ctx.textAlign = "center";
            ctx.fillText(text, canvas.width / 2, canvas.height - 80);
            ctx.strokeText(text, canvas.width / 2, canvas.height - 80);
        };
    };

    // lưu và chia sẻ
    const saveAndShare = async () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];

        const fileName = `meme-${Date.now()}.png`;

        await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache,
        });

        const uriResult = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache,
        });

        await Share.share({
            title: "My Meme",
            text: "Check out this meme!",
            url: uriResult.uri,
            dialogTitle: "Share Meme",
        });
    };

    return (
        <div className="app-container">
            <h1 className="title">🎉 Meme Generator 🎉</h1>
            <button className="btn" onClick={pickImage}>
                📸 Pick Image
            </button>

            {image && (
                <>
                    <canvas ref={canvasRef} className="meme-canvas"></canvas>

                    <div className="controls">
                        <input
                            type="text"
                            placeholder="Enter meme text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="text-input"
                        />

                        <div className="options">
                            <label>Filter:</label>
                            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                                <option value="none">None</option>
                                <option value="grayscale(100%)">Grayscale</option>
                                <option value="sepia(100%)">Sepia</option>
                                <option value="brightness(1.5)">Brightness</option>
                            </select>

                            <label>Frame:</label>
                            <select value={frame} onChange={(e) => setFrame(e.target.value)}>
                                <option value="none">None</option>
                                <option value="square">Square Frame</option>
                                <option value="circle">Circle Frame</option>
                            </select>
                        </div>

                        <div className="btn-group">
                            <button className="btn draw" onClick={drawMeme}>
                                🖌️ Draw Meme
                            </button>
                            <button className="btn save" onClick={saveAndShare}>
                                💾 Save & Share
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
