import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const AccessibilityApp = () => {
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef(null);

  const API_URL = "https://api-inference.huggingface.co/models/facebook/detr-resnet-50";
  const API_TOKEN = "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";

  // Start speech recognition
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speakText(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      if (command.includes("open camera")) openCamera();
      else if (command.includes("start detection")) startObjectDetection();
      else speakText("Sorry, I didn't understand that command.");
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Speak text function
  const speakText = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  // Open camera
  const openCamera = () => {
    setIsCameraOpen(true);
    speakText("Camera is open. Say 'Start Detection' or press the Detect button.");
  };

  // Close camera
  const closeCamera = () => {
    setIsCameraOpen(false);
    setDetectedObjects([]);
    speakText("Camera closed.");
  };

  // Start object detection
  const startObjectDetection = async () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      const error = "Please ensure the camera is open.";
      setError(error);
      speakText(error);
      return;
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      const imageData = imageSrc.split(",")[1];

      const response = await axios.post(
        API_URL,
        { inputs: imageData },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const detectedItems = response.data.map((obj) => ({
        name: obj.label || "Unknown",
        confidence: obj.score ? (obj.score * 100).toFixed(2) : "N/A",
        distance: calculateDistance(obj.bounding_box),
      }));

      setDetectedObjects(detectedItems);

      if (detectedItems.length > 0) {
        const feedback = detectedItems
          .map(
            (item) =>
              `${item.name} (${item.confidence}%) is approximately ${item.distance} meters away`
          )
          .join(", ");
        speakText(`Detected: ${feedback}.`);
      } else {
        speakText("No objects detected.");
      }
    } catch (error) {
      setError("Object detection failed. Please try again.");
      speakText("Object detection failed.");
    }
  };

  // Calculate approximate distance
  const calculateDistance = (boundingBox) => {
    const [xMin, yMin, xMax, yMax] = boundingBox || [0, 0, 0, 0];
    const objectHeight = yMax - yMin;

    // Assuming a fixed camera field of view (FoV) and object size
    const focalLength = 700; // Example value, needs fine-tuning based on camera
    const realHeight = 1.7; // Approximate height of object in meters
    const distance = (realHeight * focalLength) / objectHeight;

    return distance.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-black text-white p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-teal-400 mb-4 text-center">Accessibility App</h1>
      <p className="text-gray-300 text-center mb-6 max-w-3xl">
        Use voice commands like <span className="text-teal-500">'Open Camera'</span> or click the buttons to perform object detection with ease.
      </p>

      {isListening && (
        <p className="text-green-400 font-semibold mb-4 animate-pulse">Listening...</p>
      )}

      <div className="flex flex-wrap justify-center space-x-4 mb-6">
        <button
          onClick={startListening}
          className="bg-teal-500 text-black px-6 py-3 rounded-lg shadow-lg hover:bg-teal-600 transition duration-300"
        >
          Start Voice Commands
        </button>
        <button
          onClick={openCamera}
          className="bg-blue-500 text-black px-6 py-3 rounded-lg shadow-lg hover:bg-blue-600 transition duration-300"
        >
          Open Camera
        </button>
        {isCameraOpen && (
          <>
            <button
              onClick={startObjectDetection}
              className="bg-purple-500 text-black px-6 py-3 rounded-lg shadow-lg hover:bg-purple-600 transition duration-300"
            >
              Detect
            </button>
            <button
              onClick={closeCamera}
              className="bg-red-500 text-black px-6 py-3 rounded-lg shadow-lg hover:bg-red-600 transition duration-300"
            >
              Close Camera
            </button>
          </>
        )}
      </div>

      {isCameraOpen && (
        <div className="w-full md:w-3/4 lg:w-1/2 mt-6 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full" />
        </div>
      )}

      {error && (
        <div className="bg-red-700 text-white px-4 py-3 rounded-lg mt-4">
          {error}
        </div>
      )}

      {detectedObjects.length > 0 && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-md w-full md:w-3/4 lg:w-1/2">
          <h2 className="text-lg font-bold text-teal-400">Detected Objects:</h2>
          <ul className="space-y-2 mt-3">
            {detectedObjects.map((obj, index) => (
              <li key={index} className="text-gray-300">
                <strong>{obj.name}</strong> ({obj.confidence}%) - Approx. {obj.distance} meters away
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccessibilityApp;

