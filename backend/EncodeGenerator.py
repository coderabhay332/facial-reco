import cv2
import face_recognition
import pickle
import boto3
import os
import numpy as np
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Fetch credentials from environment variables
aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
region_name = os.getenv('AWS_REGION')

# Initialize S3 client with correct argument names
s3 = boto3.client(
    's3',
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key,
    region_name=region_name
)
bucket_name = 'face-reco-storage'
folder_prefix = 'Encoder-images/'  # Folder path in S3

# Function to download images from S3
def fetch_images_from_s3():
    try:
        # List all objects in the specified S3 folder
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=folder_prefix)
        
        if 'Contents' not in response:
            print("No images found in the S3 bucket.")
            return []

        img_list = []
        student_ids = []

        for obj in response['Contents']:
            # Skip the folder itself (S3 lists the folder as an object)
            if obj['Key'].endswith('/'):
                continue

            # Extract the student ID from the file name (without the extension)
            student_id = os.path.splitext(os.path.basename(obj['Key']))[0]
            student_ids.append(student_id)

            # Download the image from S3
            img_data = s3.get_object(Bucket=bucket_name, Key=obj['Key'])['Body'].read()
            img = Image.open(BytesIO(img_data))
            img = np.array(img)  # Convert the image to numpy array (for OpenCV)

            # Check if image is loaded properly
            if img is not None:
                img_list.append(img)
            else:
                print(f"Image {obj['Key']} couldn't be loaded.")
        
        return img_list, student_ids

    except Exception as e:
        print(f"Error fetching images from S3: {e}")
        return [], []

# Function to find encodings
def find_encodings(image_list):
    encode_list = []
    for img in image_list:
        # Convert the image to RGB format
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        # Get face encodings
        encodings = face_recognition.face_encodings(img_rgb)
        
        if len(encodings) > 0:
            encode_list.append(encodings[0])
        else:
            print("No face found in one of the images.")
    
    return encode_list    

# Fetch images from S3
img_list, student_ids = fetch_images_from_s3()

if img_list:
    # Find encodings for the S3 images
    encode_list_known = find_encodings(img_list)
    encode_list_known_with_id = [encode_list_known, student_ids]

    # Save the encodings and student IDs to a file using pickle
    with open('EncodeFile.p', 'wb') as file:
        pickle.dump((encode_list_known, student_ids), file)

    print('Encodings complete and saved.')
else:
    print("No images available for encoding.")
