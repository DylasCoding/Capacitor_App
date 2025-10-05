import React, { useState, useRef, useEffect } from "react";
import { Camera, CameraSource, CameraResultType } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Browser } from "@capacitor/browser";
import { Share } from "@capacitor/share";
import "./App.css";

function MemeMaker() {
    const [image, setImage] = useState(null);
    const [texts, setTexts] = useState([]);
    const [filter, setFilter] = useState("none");
    const [frame, setFrame] = useState("none");
    const [selectedId, setSelectedId] = useState(null);
    const [history, setHistory] = useState([]);

    const canvasRef = useRef(null);
    const touchStartY = useRef(null);
    const touchTextId = useRef(null);
    const touchField = useRef(null);

    // Pick image
    const pickImage = async () => {
        const photo = await Camera.getPhoto({
            source: CameraSource.Photos,
            resultType: CameraResultType.Uri,
            quality: 100,
        });
        setImage(photo.webPath);
    };

    // Save to history
    const saveHistory = (newTexts) => {
        setHistory([...history, JSON.parse(JSON.stringify(texts))]);
        setTexts(newTexts);
    };

    // Go back
    const goBack = () => {
        if (history.length > 0) {
            const previousState = history[history.length - 1];
            setTexts(previousState);
            setHistory(history.slice(0, -1));
            setSelectedId(null);
        }
    };

    // Add new text
    const addText = () => {
        const canvas = canvasRef.current;
        let x = null, y = null;
        if (canvas && canvas.width && canvas.height) {
            x = canvas.width / 2;
            y = canvas.height / 2;
        }
        const newText = {
            id: Date.now(),
            value: "New Text",
            x,
            y,
            color: "#ffffff",
            size: 40,
            isPositioning: false, // new property
        };
        saveHistory([...texts, newText]);
        setSelectedId(newText.id);
    };


    // Delete text
    const deleteText = (id) => {
        saveHistory(texts.filter((t) => t.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    // Draw canvas
    const drawMeme = () => {
        if (!image) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = image;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            if(frame === "circle") {
                // Circle frame clipping
                ctx.beginPath();
                ctx.arc(
                    canvas.width / 2,
                    canvas.height / 2,
                    Math.min(canvas.width, canvas.height) / 2,
                    0,
                    2 * Math.PI
                );
                ctx.clip();
            }

            // Filter + image
            ctx.filter = filter;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.filter = "none";

            // Frame
            if (frame === "square") {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 20;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            } else if (frame === "circle") {
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
            }

            // Draw texts
            texts.forEach((t) => {
                if (t.x === null || t.y === null) return;

                ctx.font = `${t.size}px Impact`;
                ctx.fillStyle = t.color;
                ctx.strokeStyle = "black";
                ctx.lineWidth = 3;
                ctx.textAlign = "center";
                ctx.fillText(t.value, t.x, t.y);
                ctx.strokeText(t.value, t.x, t.y);

                // Nếu đang chọn text thì vẽ khung bao quanh
                if (t.id === selectedId) {
                    const metrics = ctx.measureText(t.value);
                    const w = metrics.width;
                    const h = t.size;
                    ctx.strokeStyle = "yellow";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(t.x - w / 2 - 5, t.y - h, w + 10, h + 10);
                }
            });
        };
    };

    // Save & share
// Add these two functions
    const saveImage = async () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const fileName = `meme-${Date.now()}.png`;

        try {
            await Filesystem.writeFile({
                path: fileName,
                data: base64,
                directory: Directory.Documents, // Use Documents or External for Android
            });
            alert("Image saved to Documents!");
        } catch (err) {
            alert("Failed to save image: " + err.message);
        }
    };

    const shareImage = async () => {
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

    const handleTouchStart = (e, id, field) => {
        touchStartY.current = e.touches[0].clientY;
        touchTextId.current = id;
        touchField.current = field;
    };

    const handleTouchMove = (e) => {
        if (touchStartY.current !== null && touchTextId.current !== null && touchField.current) {
            e.preventDefault();
            const deltaY = touchStartY.current - e.touches[0].clientY;
            if (Math.abs(deltaY) > 5) { // threshold
                setTexts((prev) =>
                    prev.map((t) =>
                        t.id === touchTextId.current
                            ? {
                                ...t,
                                [touchField.current]: Math.max(0, (t[touchField.current] || 0) + (deltaY > 0 ? 1 : -1))
                            }
                            : t
                    )
                );
                touchStartY.current = e.touches[0].clientY;
            }
        }
    };

    const handleTouchEnd = () => {
        touchStartY.current = null;
        touchTextId.current = null;
        touchField.current = null;
    };

    // Redraw when state changes
    useEffect(() => {
        console.log("Texts updated:", texts);
        if (image) drawMeme();
    }, [image, texts, filter, frame]);

    return (
        <div className="app-container">
            <header>🎉 Meme Maker 🎉</header>
            <div className="container">
                <button onClick={pickImage}>📸 Pick Image</button>
                {image && (
                    <>
                        <canvas
                            ref={canvasRef}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{cursor: texts.some(t => t.isPositioning) ? 'crosshair' : 'default'}}
                        />
                        <div className="controls">
                            <button onClick={addText}>➕ Add Text</button>
                            <button onClick={goBack} disabled={history.length === 0}>
                                ↩️ Go Back
                            </button>

                            {texts.map((text) => (
                                <div key={text.id} className="text-item">
                                    <div className="text-controls">
                                        <input
                                            type="text"
                                            placeholder="Enter text"
                                            value={text.value}
                                            onChange={(e) =>
                                                setTexts((prev) =>
                                                    prev.map((t) =>
                                                        t.id === text.id ? {...t, value: e.target.value} : t
                                                    )
                                                )
                                            }
                                            onFocus={() => setSelectedId(text.id)}
                                        />
                                        <input
                                            type="color"
                                            value={text.color}
                                            onChange={(e) =>
                                                setTexts((prev) =>
                                                    prev.map((t) =>
                                                        t.id === text.id ? {...t, color: e.target.value} : t
                                                    )
                                                )
                                            }
                                            style={{backgroundColor: text.color}}
                                        />

                                        <input
                                            type="number"
                                            min="10"
                                            max="100"
                                            value={text.size}
                                            placeholder="Size"
                                            onChange={(e) =>
                                                setTexts((prev) =>
                                                    prev.map((t) =>
                                                        t.id === text.id
                                                            ? {
                                                                ...t,
                                                                size: e.target.value === "" ? "" : parseInt(e.target.value)
                                                            }
                                                            : t
                                                    )
                                                )
                                            }
                                        />

                                        <input
                                            type="number"
                                            className="xy-input"
                                            placeholder="X"
                                            value={text.x ?? ""}
                                            onChange={(e) =>
                                                setTexts((prev) =>
                                                    prev.map((t) =>
                                                        t.id === text.id ? {...t, x: parseInt(e.target.value) || 0} : t
                                                    )
                                                )
                                            }
                                            style={{width: 60}}
                                            onTouchStart={(e) => handleTouchStart(e, text.id, "x")}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                        />
                                        <input
                                            type="number"
                                            className="xy-input"
                                            placeholder="Y"
                                            value={text.y ?? ""}
                                            onChange={(e) =>
                                                setTexts((prev) =>
                                                    prev.map((t) =>
                                                        t.id === text.id ? {...t, y: parseInt(e.target.value) || 0} : t
                                                    )
                                                )
                                            }
                                            style={{width: 60}}
                                            onTouchStart={(e) => handleTouchStart(e, text.id, "y")}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                        />

                                        <button onClick={() => deleteText(text.id)}>🗑</button>
                                    </div>

                                    {text.x === null && text.y === null && text.id === selectedId && (
                                        <div className="instruction">👆 Click on image to place text</div>
                                    )}
                                </div>
                            ))}
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
                            <button onClick={saveImage}>💾 Save</button>
                            <button onClick={shareImage}>📤 Share</button>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MemeMaker;