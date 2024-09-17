import os
import pickle
import numpy as np
import cv2
import face_recognition

cap = cv2.VideoCapture(0)
cap.set(3, 1280)
cap.set(4, 720)

print("loading the encoded file...")
file = open('EncodeFile.p', 'rb')
encodeListKnownWithIds = pickle.load(file)
file.close()
encodeListKnown, studentIds = encodeListKnownWithIds
print("encoded file loaded...")

while True:
    success, img = cap.read()
    if not success:
        print("Failed to grab frame")
        break

    imgS = cv2.resize(img, (0, 0), None, 0.25, 0.25)  # Resize for faster processing
    imgS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)

    faceCurFrame = face_recognition.face_locations(imgS)
    encodeCurFrame = face_recognition.face_encodings(imgS, faceCurFrame)

    for encodeFace, faceLoc in zip(encodeCurFrame, faceCurFrame):
        matches = face_recognition.compare_faces(encodeListKnown, encodeFace)
        faceDis = face_recognition.face_distance(encodeListKnown, encodeFace)
        matchIndex = np.argmin(faceDis)  # Get index of the best match

        if matches[matchIndex]:
            studentId = studentIds[matchIndex]
            print(f"Match found: {studentId}")
        else:
            print("No match found")

    # Display the webcam feed
    cv2.imshow("Face", img)
    
    # Break loop on 'q' key press
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the capture and close any OpenCV windows
cap.release()
cv2.destroyAllWindows()
