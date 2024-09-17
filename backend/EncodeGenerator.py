import cv2
import face_recognition
import pickle
import os

# Folder path where images are stored
folderPath = 'Images'
PathList = os.listdir(folderPath)
imgList = []
studentId = []

# Read images and store corresponding student IDs
for path in PathList:
    studentId.append(os.path.splitext(path)[0])
    img = cv2.imread(os.path.join(folderPath, path))
    
    # Ensure the image is valid
    if img is not None:
        imgList.append(img)
    else:
        print(f"Image {path} couldn't be loaded.")

# Function to find encodings
def findEncodings(imageList):
    encodeList = []
    for img in imageList:
        # Convert the image to RGB format
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        # Get face encodings
        encodings = face_recognition.face_encodings(img_rgb)
        
        if len(encodings) > 0:
            encodeList.append(encodings[0])
        else:
            print("No face found in one of the images.")
    
    return encodeList    

# Find encodings for the known images
encodeListKnown = findEncodings(imgList)
encodeListKnownWithId = [encodeListKnown, studentId]

# Save the encodings and student IDs to a file using pickle
with open('EncodeFile.p', 'wb') as file:
    pickle.dump((encodeListKnown, studentId), file)

print('Encodings complete and saved.')
