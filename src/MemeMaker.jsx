import React, { useState, useRef, useEffect } from "react";
import { Camera, CameraSource, CameraResultType } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import "./App.css";

function MemeMaker() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [filter, setFilter] = useState("none");
    const [frame, setFrame] = useState("none");
    const canvasRef = useRef(null);

    // Pick an image from the library
    const pickImage = async () => {
        const photo = await Camera.getPhoto({
            source: CameraSource.Photos,
            resultType: CameraResultType.Uri,
            quality: 100,
        });
        setImage(photo.webPath);
    };

    // Draw the meme on the canvas
    const drawMeme = () => {
        if (!image) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = image;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            if (frame === "circle") {
                // Tạo clipping path hình tròn
                ctx.beginPath();
                ctx.arc(
                    canvas.width / 2,
                    canvas.height / 2,
                    Math.min(canvas.width, canvas.height) / 2,
                    0,
                    2 * Math.PI
                );
                ctx.clip(); // Cắt ảnh theo clipping path
            }

            // Apply filter and draw the image
            ctx.filter = filter;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.filter = "none";

            // Draw the frame
            if (frame === "circle") {
                ctx.beginPath();
                ctx.arc(
                    canvas.width / 2,
                    canvas.height / 2,
                    Math.min(canvas.width, canvas.height) / 2 - 10,
                    0,
                    2 * Math.PI
                );
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 20;
                ctx.stroke();
            } else if (frame === "square") {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 20;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }

            // Draw the text
            ctx.font = "50px Impact";
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 4;
            ctx.textAlign = "center";
            ctx.fillText(text, canvas.width / 2, canvas.height - 80);
            ctx.strokeText(text, canvas.width / 2, canvas.height - 80);
        };
    };

    // Save and share the meme
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

    // Automatically redraw the meme when the image changes
    useEffect(() => {
        if (image) {
            drawMeme();
        }
    }, [image, filter, frame, text]);

    return (
        <div className="app-container">
            <header>🎉 Meme Maker 🎉</header>
            <div className="container">
                <button onClick={pickImage}>📸 Pick Image</button>
                {image && (
                    <>
                        <canvas ref={canvasRef}></canvas>
                        <div className="controls">
                            <input
                                type="text"
                                placeholder="Enter meme text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                            <div className="filters">
                                <label>Filter:</label>
                                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                                    <option value="none">None</option>
                                    <option value="grayscale(100%)">Grayscale</option>
                                    <option value="sepia(100%)">Sepia</option>
                                    <option value="brightness(1.5)">Brightness</option>
                                </select>
                            </div>
                            <div className="frames">
                                <label>Frame:</label>
                                <select value={frame} onChange={(e) => setFrame(e.target.value)}>
                                    <option value="none">None</option>
                                    <option value="square">Square</option>
                                    <option value="circle">Circle</option>
                                </select>
                            </div>
                            <button onClick={saveAndShare}>💾 Save & Share</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MemeMaker;