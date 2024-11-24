# LevChat

A desktop chat application for Local LLM inferencing with optional RAG (Retrieval-Augmented Generation) capabilities.

## Description

LevChat is a lightweight desktop application that allows you to interact with Large Language Models locally on your machine. It supports both standard chat functionality and RAG mode for context-aware conversations using your PDF documents.

![LevChat Demo](./levChat.gif)

> **Note**: Currently, LevChat comes configured with LLaMA 3.2 3B by default. An update that allows you to use any GGUF format model of your choice is coming soon. 
<!--Browse and download alternative models from [Hugging Face](https://huggingface.co/models?search=gguf). -->


## Prerequisites

You need to install `llama.cpp` before using LevChat. Choose one of the following installation methods:

### Windows Users
1. Follow the installation guide in this [YouTube tutorial](https://www.youtube.com/watch?v=r-05yuXTEPE)
2. For setup, see the Windows Setup section below

### Linux and Mac Users
```bash
brew install llama.cpp
```

For detailed installation instructions, refer to the official llama.cpp documentation:
- [Build Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/build.md)
- [Docker Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/docker.md)
- [Installation Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/install.md)

## Setup

### Linux and MacOS
Run the provided `setup_levchat.sh` script:
```bash
chmod +x setup_levchat.sh
./setup_levchat.sh
```

### Windows Setup
Since Windows doesn't natively support Bash scripts, follow these manual setup steps:

1. Create the following directories:
   ```
   C:\Users\YourUsername\Documents\LevChat
   C:\Users\YourUsername\Documents\LevChat\data
   C:\Users\YourUsername\Documents\LevChat\model
   ```

2. Download the model manually:
   - [Llama-3.2-3B-Instruct-GGUF](https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q6_K.gguf)
   - Save the downloaded file as `Llama-3.2-3B-Instruct-Q6_K.gguf` in the `model` folder

Alternatively, you can use Windows Subsystem for Linux (WSL) or Git Bash to run the setup script on Windows.

### Directory Structure
After setup, you should have:
```
Documents/LevChat/
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