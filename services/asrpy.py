from flask import Flask, request, jsonify
import assemblyai as aai
import os
from flask_cors import CORS  # Import CORS support

# Set your AssemblyAI API key
aai.settings.api_key = "2932c0510296431584ab8d3750b1c7c5"

app = Flask(__name__)
CORS(app)  # Enable CORS support for all routes

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    file_path = f"./res/{file.filename}"

    try:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        file.save(file_path)

        print(f"File saved: {file_path}")  # Debug log to check if file is saved

        # Configure the transcription settings to support Arabic (or other languages)
        config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.nano,  # Specify the speech model to use
            language_detection=True  # Enable automatic language detection
        )

        # Create a transcriber object and send the file for transcription
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(file_path, config)

        if transcript.status == aai.TranscriptStatus.error:
            print(f"Transcription error: {transcript.error}")  # Debug log for error
            return jsonify({"error": transcript.error}), 500

        print(f"Transcription result: {transcript.text}")  # Log transcription result
        return jsonify({"transcription": transcript.text})

    except Exception as e:
        print(f"Error during transcription: {str(e)}")  # Log unexpected errors
        return jsonify({"error": "Error during transcription."}), 500

    finally:
        # Clean up the file after processing to avoid accumulating files on the server
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    app.run(debug=True)
