# LevChat

A desktop chat application for Local LLM inferencing with optional RAG (Retrieval-Augmented Generation) capabilities.

## Description

LevChat is a lightweight desktop application that allows you to interact with Large Language Models locally on your machine. It supports both standard chat functionality and RAG mode for context-aware conversations using your PDF documents.

## Prerequisites

You need to install `llama.cpp` before using LevChat. Choose one of the following installation methods:

### Windows Users
- Follow the installation guide in this [YouTube tutorial](https://www.youtube.com/watch?v=r-05yuXTEPE)

### Linux and Mac Users
```bash
brew install llama.cpp
```

For detailed installation instructions, refer to the official llama.cpp documentation:
- [Build Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/build.md)
- [Docker Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/docker.md)
- [Installation Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/install.md)

## Setup

1. Run the provided `setup_levchat.sh` script to set up your environment:
```bash
chmod +x setup_levchat.sh
./setup_levchat.sh
```

The script will:
- Create necessary directories in `~/Documents/LevChat`
- Download the required model (Llama-3.2-3B-Instruct-Q6_K.gguf)
- Set up the data directory for RAG functionality

Directory structure after setup:
```
~/Documents/LevChat/
├── data/
└── model/
    └── Llama-3.2-3B-Instruct-Q6_K.gguf
```

## Usage

### Standard Chat Mode
1. Open the LevChat application
2. Start typing your prompts
3. Press the send button to get responses

### RAG Mode
1. Place your context PDF documents in the `data` folder
2. Start your prompt with "RAG-" to activate RAG mode
3. Your prompts will now consider the content of your PDF documents

### Additional Features
- **Stop Generation**: Use the stop button next to the send button to interrupt model generation, particularly useful during generation loops common with llama.cpp

## License

MIT License

## Author

Edward Lampoh

