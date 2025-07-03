# Humanoid Chatbot

## Project Overview

Project "Humanoid" introduces an innovative web-based audio-visual chatbot designed to revolutionize user interaction by providing a more immersive and engaging conversational experience. Unlike traditional text-based chatbots, Humanoid integrates live video streaming of an animated agent character, bridging the gap between conventional digital interactions and the richness of human communication. Supporting both English and Arabic languages, this multimodal system significantly enhances user engagement and represents a significant step towards the future of human-computer interaction, where conversations feel more personal, natural, and responsive.

## Features

-   **Audio-Visual Interaction:** Seamless integration of voice input and real-time animated video responses.
-   **Multilingual Support:** Operates effectively in both English and Arabic.
-   **Intelligent Conversational AI:** Powered by advanced Large Language Models (LLM) for generating coherent and contextually relevant responses.
-   **High-Fidelity Speech:** Utilizes state-of-the-art Text-to-Speech (TTS) for natural-sounding voice output.
-   **Accurate Voice Recognition:** Employs robust Automatic Speech Recognition (ASR) for precise conversion of spoken input to text.
-   **Realistic Facial Animation:** Features synchronized lip movements, facial expressions, and head movements driven by audio input.
-   **Real-time Performance:** Optimized for minimal response delay, ensuring fluid and responsive interactions.

## Video Demonstration

This video demonstrates the Humanoid chatbot in action:

[//]: # (Local video path for project demonstration)
![Humanoid Chatbot Demo](/public/Chat/images/Demo%20(1).mp4)
*Note: During the demonstration, you might observe occasional lag in the video stream. This occurs because the display speed of frames to the user can sometimes outpace the real-time generation of frames by the Frame Generator, causing the website to momentarily wait for new frames to be produced and sent to the client.*

## Technical Overview

The Humanoid chatbot's architecture integrates a suite of off-the-shelf AI models (ASR, TTS, LLM) with a custom-developed frame generator. The core of the visual animation relies on the second version of the **TalkingGaussian** research project, an audio-driven, deformation-based framework for talking head synthesis. This framework leverages **Gaussian Splatting** for 3D representation, offering significant speed advantages over conventional 3D point cloud techniques like ER-NeRF, crucial for real-time performance. TalkingGaussian's ability to decompose the deformation model into separate branches for the face and inside-mouth areas further ensures accurate motion and structure reconstruction.

### APIs Technologies Used

-   **TTS API:** ElevenLabs
-   **ASR API:** AssemblyAI
-   **LLM API:** GPT-4o Turbo

### Available Characters

Our project features three distinct characters to enhance user interaction and multilingual support:

-   **Obama Character:** For English conversations.
-   **May Character:** For English conversations.
-   **Faisal Character:** For Arabic conversations.

## Important Setup Notes

This project will not function correctly if cloned directly without additional setup, as the core Frame Generator component is not included in this repository. The Frame Generator, which is essential for producing the animated character video, must be installed/cloned separately.

You can install/clone the Frame Generator from its official repository: [https://github.com/Fictionarry/TalkingGaussian](https://github.com/Fictionarry/TalkingGaussian)

## Performance and Results

Our experiments involved training the TalkingGaussian framework with various datasets, including those for Barack Obama, Theresa May, and Faisal. The performance was evaluated using key metrics: LMD (Lower is better), PSNR (Higher is better), and LPIPS (Lower is better). The results are summarized in the table below:

| Metric | GTv1 | GTv2 | Obama | May | Faisal |
|---|---|---|---|---|---|
| LMD (↓) | 2.711 | 2.928 | 2.550 | 2.709 | **1.955** |
| PSNR (↑) | 32.269 | 32.423 | 35.151 | 30.971 | **36.051** |
| LPIPS (↓) | 0.016 | 0.018 | 0.019 | 0.040 | **0.009** |

As indicated by the results, the **Faisal character** consistently demonstrates superior performance across all metrics, achieving the lowest LMD and LPIPS scores and the highest PSNR. This highlights the framework's strong capability in generating high-quality, realistic animations for this specific character. The **Obama character** also shows robust performance, particularly in PSNR, surpassing both GTv1 and GTv2. Conversely, the **May character** generally exhibits lower performance, especially in PSNR and LPIPS, suggesting that learning the features and motion style of individuals with long hair or certain facial characteristics might be more challenging for the current framework. These findings validate the project's robust technical approach and provide clear directions for future enhancements to improve adaptability across diverse facial features.

## Future Work

Future enhancements for the Humanoid project could focus on improving the framework's adaptability to a wider range of diverse facial characteristics and hair types, further refining the realism and versatility of the animated agent. Exploration into more complex emotional expressions and interactive behaviors could also enrich the user experience.

## Getting Started

To set up and run the project locally, follow these steps:

1.  **Clone and Install Frame Generator:**
    Clone the TalkingGaussian V2 repository and install its requirements as per their documentation:
    `git clone https://github.com/Fictionarry/TalkingGaussian.git`
    *(Follow the installation instructions provided in the TalkingGaussian repository.)*

2.  **Clone this Project:**
    `git clone [YOUR_PROJECT_REPOSITORY_URL]`

3.  **Install Dependencies:**
    Navigate to the project directory and install the necessary Node.js dependencies:
    `npm install`

4.  **Run the Application:**
    Start the application and open your web browser to the running port (e.g., `http://localhost:3000`).

5.  **Start Chatting:**
    Sign up for a new account or log in, and begin interacting with the Humanoid chatbot.

## Contributing

We welcome contributions to the Humanoid project! Our core development team includes:

-   Abdelaziz Ihab Mohamed Ali
-   Ahmed Mohammed Ramadan Mohammed Eid
-   Ahmed Mostafa Ayman Aboalesaad
-   Nouran Magdy Abdallah Elsabahy
-   Youssef Faisal Abdelkader Nassef

## Contact

For any inquiries or further information, please feel free to reach out:

-   **Email:** yousseffaisal20@gmail.com
-   **LinkedIn (Yousef Faisal):** [https://www.linkedin.com/in/yousef-faisal/](https://www.linkedin.com/in/yousef-faisal/)
-   **LinkedIn (Ahmed Aboalesaad):** [https://www.linkedin.com/in/ahmed-aboalesaad/](https://www.linkedin.com/in/ahmed-aboalesaad/)
