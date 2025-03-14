const axios = require("axios");
const fs = require("fs").promises; // Promises-based FS for reading the file as Blob

// Set your Speechmatics API key
const API_KEY = process.env.ASR_API_KEY;

// Function to upload the file and get the transcription result
exports.ASR = async function transcribeFile(filePath, lang = "en") {
  try {
    const fileBlob = await fs.readFile(filePath);

    const formData = new FormData();
    formData.append("data_file", fileBlob, filePath.split("/").pop());
    formData.append(
      "config",
      JSON.stringify({
        type: "transcription",
        transcription_config: {
          language: lang,
          operating_point: "enhanced",
        },
      })
    );

    const uploadResponse = await axios.post(
      "https://asr.api.speechmatics.com/v2/jobs/",
      formData,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    const jobId = uploadResponse.data.id;

    let jobStatus;
    do {
      const statusResponse = await axios.get(
        `https://asr.api.speechmatics.com/v2/jobs/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      jobStatus = statusResponse.data.job.status;
      if (
        jobStatus === "processing" ||
        jobStatus === "queued" ||
        jobStatus === "running"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } while (
      jobStatus === "processing" ||
      jobStatus === "queued" ||
      jobStatus === "running"
    );

    if (jobStatus === "done") {
      const transcriptResponse = await axios.get(
        `https://asr.api.speechmatics.com/v2/jobs/${jobId}/transcript?format=json-v2`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      const transcription = transcriptResponse.data.results
        .map((r) => r.alternatives[0]?.content || "")
        .join(" ");

      return transcription;
    } else {
      throw new Error("Transcription failed.");
    }
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};
