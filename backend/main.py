import base64
import cv2
from flask_cors import CORS
import numpy as np
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import face_recognition
import pickle
from io import BytesIO
from PIL import Image

# Initialize Flask and Flask-SocketIO with threading and CORS
app = Flask(__name__)  # Corrected this line
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")

# Load the face encodings and IDs when the app starts
print("Loading the encoded file...")
try:
    with open('EncodeFile.p', 'rb') as file:
        encodeListKnownWithIds = pickle.load(file)
    encodeListKnown, studentIds = encodeListKnownWithIds
    print("Encoded file loaded successfully.")
except Exception as e:
    print(f"Error loading encoded file: {e}")
    encodeListKnown = []
    studentIds = []

# Function to process the image frame and perform face recognition
def process_frame(image_data):
    try:
        # Decode the Base64 image
        image_data = image_data.split(",")[1]  # Skip metadata
        image = Image.open(BytesIO(base64.b64decode(image_data)))
        
        # Convert image to RGB if it has an alpha channel or is in a different mode
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Convert the image from PIL to OpenCV format
        img = np.array(image)
        
        # Check if the image is still in the wrong format
        if img.ndim != 3 or img.shape[2] != 3:
            return "Error: Unsupported image format. Image must be RGB."

        # Convert from RGB (PIL) to BGR (OpenCV)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        # Resize the image for faster processing
        imgS = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
        imgS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)

        # Perform face recognition
        faceCurFrame = face_recognition.face_locations(imgS)
        encodeCurFrame = face_recognition.face_encodings(imgS, faceCurFrame)

        # If no faces are found in the current frame
        if not encodeCurFrame:
            return "No face detected in the frame"

        # Check if known encodings are available
        if not encodeListKnown:
            return "No known faces to compare with"

        # Compare detected faces with known faces
        for encodeFace, faceLoc in zip(encodeCurFrame, faceCurFrame):
            matches = face_recognition.compare_faces(encodeListKnown, encodeFace)
            faceDis = face_recognition.face_distance(encodeListKnown, encodeFace)

            if len(faceDis) == 0:
                return "No known faces to compare with"

            matchIndex = np.argmin(faceDis)

            if matches[matchIndex]:
                studentId = studentIds[matchIndex]
                return f"Match found: {studentId}"
            else:
                return "No match found"
    except Exception as e:
        return f"Error processing frame: {e}"

# Flask-SocketIO event to handle incoming video frames
@socketio.on('video_frame')
def handle_video_frame(data):
    # Process the frame and return the result
    recognition_result = process_frame(data['image'])
    
    # Emit the recognition result back to the client
    emit('result', {'message': recognition_result})

# Route for index.html
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    socketio.run(app, debug=True)
