# Barreessaa: The Intelligent Oromo Writing Assistant

[**🌐 Live Demo**](https://oro-spel-v3-danoo-mikes-projects.vercel.app/)

Barreessaa (meaning "writer" in Oromo) is a smart, context-aware writing assistant designed to solve a unique challenge in the Oromo language: the correct usage of vowel and consonant duplications. This application helps users write accurately and confidently by providing real-time feedback and contextual examples from a large sentence corpus.

Whether you're a native speaker looking to perfect your formal writing or a learner trying to master the nuances of the language, Barreessaa is your personal guide.

### ✨ Core Features

  * **Contextual Writing Assistance**: Get real-time analysis of your sentences. Words are color-coded to indicate if their usage is correct, a potential variant, or unknown.
  * **Dual Writing Modes**:
      * **Freestyle Editor**: A full-featured text area that provides line-by-line analysis as you write.
      * **Guided Writer**: A focused, sentence-by-sentence editor for deep analysis and correction.
  * **Personal Corpus**: Add your own correct sentences to a personal dictionary, which the assistant will use to provide even more tailored suggestions in the future.
  * **Interactive Quiz Game**: Test and improve your skills with a fun quiz game that challenges you to fix vowel duplications in randomly selected sentences.
  * **Analytics Dashboard**: Track your progress with detailed analytics, including writing streaks, sentence completion rates, and project performance.
  * **Project Management**: Organize your work into distinct projects, track their completion status, and manage your writing workflow.

-----

### 🚀 Tech Stack

  * **Framework**: Next.js (App Router)
  * **Language**: TypeScript
  * **Database**: MongoDB with Prisma ORM
  * **Styling**: Tailwind CSS with shadcn/ui components
  * **Authentication**: JWTs with http-only cookies
  * **Analytics & Charts**: Recharts

-----

### 🛠️ Getting Started

To get a local copy up and running, follow these simple steps.

#### Prerequisites

  * Node.js (v18 or later)
  * npm or yarn
  * A MongoDB database instance (local or cloud-hosted on MongoDB Atlas)

#### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/your-username/barreessaa.git
    cd barreessaa
    ```
2.  **Install NPM packages**
    ```sh
    npm install
    ```
3.  **Set up environment variables**
    Create a `.env.local` file in the root directory and add your database connection string and a JWT secret:
    ```sh
    DATABASE_URL="your_mongodb_connection_string"
    JWT_SECRET="your_super_secret_jwt_key"
    ```
4.  **Push the schema to your database**
    ```sh
    npx prisma db push
    ```
5.  **Pre-process the Corpus**
    The application relies on pre-indexed JSON files for fast lookups. Add your large `.txt` file of Oromo sentences to the root directory as `sentence_corpus.txt` and run the pre-processing script:
    ```sh
    node pre-process-corpus.mjs
    ```
    This will generate the necessary data files in the `/public/data` directory.
6.  **Run the development server**
    ```sh
    npm run dev
    ```
    Open `http://localhost:3000` to view it in your browser.

-----

### 🧠 How It Works

The core of Barreessaa's intelligence comes from its indexing system.

  * **BaseWord Generation**: Every word from the corpus is normalized into a "base" form by removing all duplicate consecutive letters (e.g., "gabba" -\> "gaba", "hoorraa" -\> "hora").
  * **Indexing**: The application creates a massive index that maps each `baseWord` to a list of all sentence IDs where its variants appear. This index is split into alphabetical chunks for performance.
  * **Real-time Analysis**: When you write a sentence, each word is converted to its `baseWord` form. The app then looks up this `baseWord` in the index to find relevant example sentences from both the global corpus and your personal corpus, providing you with instant, context-rich feedback.

-----

### 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

Please see the `TODO.md` file for a full list of desired features and improvements we'd love help with\!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

-----

### 📝 Project Roadmap & TODO List

This document outlines the planned features and improvements for the Barreessaa Writing Assistant. We welcome contributions from the community\! If you're interested in working on any of these items, please open an issue to discuss your approach.

#### 🌱 Short-Term Goals (Core Improvements)

These are features that enhance the current functionality and user experience.

  * [ ] **Improve Typo Suggestions**: Implement the Wagner-Fischer algorithm to suggest corrections for misspelled words (unknown status) based on the closest `baseWord` match.
  * [ ] **Analytics Dashboard V2**: Add more insightful charts to the analytics page, such as words written over time, most common errors, and accuracy trends.
  * [ ] **Corpus Manager Pagination**: Add pagination to the personal corpus manager to handle users with a large number of custom sentences.
  * [ ] **UI/UX Polish**: Refine component transitions, loading states, and overall visual consistency across the application.
  * [ ] **Sentence Export Options**: In the project editor, allow exporting the text of a single sentence.

#### 🚀 Medium-Term Goals (New Features)

These are larger, new features that will add significant value to the application.

  * [ ] **Collaborative Projects**: Allow a user to invite others to view or edit a project, enabling teamwork for translations or transcription tasks.
  * [ ] **Document Import/Export**: Add functionality to import text from `.txt` or `.docx` files into a project and export completed projects as `.docx` or `.pdf`.
  * [ ] **Quiz Difficulty Levels**: Introduce difficulty settings for the quiz game (e.g., Easy, Medium, Hard) that could vary the complexity or obscurity of the sentences.
  * [ ] **Text-to-Speech (TTS)**: Integrate a TTS service to allow users to hear the correct pronunciation of words in the example sentences, helping them distinguish between subtle vowel sounds.
  * [ ] **Themed Writing Modes**: Add a "dark mode" and other potential themes for user customization.

#### 🔭 Long-Term Goals (The Vision)

This is the long-term vision for where Barreessaa could go.

  * [ ] **Browser Extension**: Develop a Chrome/Firefox extension that brings the Barreessaa writing assistant to any text field on the web (Gmail, social media, etc.).
  * [ ] **Mobile Application**: Create a cross-platform mobile app using React Native to provide the same great experience on iOS and Android.
  * [ ] **AI-Powered Suggestions**: Integrate a fine-tuned language model (LLM) that can provide more advanced stylistic and grammatical suggestions, moving beyond simple word-variant matching.
  * [ ] **Community Corpus**: Create a system where users can submit new, high-quality sentences to be reviewed and potentially added to the global corpus for everyone's benefit.

#### How to Contribute

1.  Fork the repository.
2.  Create a new branch for your feature or bugfix (`git checkout -b feature/my-new-feature` or `bugfix/issue-name`).
3.  Make your changes.
4.  Commit your changes with a clear and descriptive commit message.
5.  Push to your branch (`git push origin feature/my-new-new-feature`).
6.  Open a Pull Request against the main branch of the original repository.

Thank you for your interest in improving Barreessaa\!