# LevChat

A desktop chat application for Local LLM inferencing with optional RAG (Retrieval-Augmented Generation) capabilities.

## Description

LevChat is a lightweight desktop application that allows you to interact with Large Language Models locally on your machine. It supports both standard chat functionality and RAG mode for context-aware conversations using your PDF documents.

![LevChat Demo](./levChat.gif)

## Download

Download the latest version of LevChat for your platform from the [release page](https://github.com/edielam/lev-chat/releases/tag/v0.0.2).

Available builds:
- Windows (x64)
- Linux (AMD64)
- macOS (Apple Silicon)

## Prerequisites

`llama.cpp` is required for LevChat. You can easily download and configure the appropriate `llama.cpp` executables for your system via the UI. If you prefer to do it your or the setup encounters issues, manually install/download the correct executable for your platform from the [llama.cpp releases](https://github.com/ggerganov/llama.cpp/releases) and place it in your LevChat `setup` folder.

Supported platforms include Windows, macOS, and Linux. 

For detailed installation instructions, refer to the official llama.cpp documentation:
- [Build Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/build.md)
- [Docker Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/docker.md)
- [Installation Guide](https://github.com/ggerganov/llama.cpp/blob/master/docs/install.md)

## Usage

### Standard Chat Mode
1. Open the LevChat application
2. Start typing your prompts
3. Enter/Press send button to get responses

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

