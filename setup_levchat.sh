#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}Setting up LevChat Environment${NC}"
echo -e "${BLUE}=================================${NC}"

DOCS_DIR="$HOME/Documents"
LEVCHAT_DIR="$DOCS_DIR/LevChat"
DATA_DIR="$LEVCHAT_DIR/data"
MODEL_DIR="$LEVCHAT_DIR/model"
MODEL_URL="https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q6_K.gguf"
MODEL_FILENAME="Llama-3.2-3B-Instruct-Q6_K.gguf"

echo -e "\n${GREEN}Creating directories...${NC}"
mkdir -p "$DATA_DIR"
mkdir -p "$MODEL_DIR"

if [ -d "$DATA_DIR" ] && [ -d "$MODEL_DIR" ]; then
    echo -e "✓ Directories created successfully"
else
    echo "Error: Failed to create directories"
    exit 1
fi

echo -e "\n${GREEN}Downloading model...${NC}"
echo "This may take a while depending on your internet connection..."

if curl -L --progress-bar "$MODEL_URL" -o "$MODEL_DIR/$MODEL_FILENAME"; then
    echo -e "✓ Model downloaded successfully"
else
    echo "Error: Failed to download the model"
    exit 1
fi

echo -e "\n${GREEN}Setup Complete!${NC}"
echo "Directory structure:"
echo -e "${BLUE}$LEVCHAT_DIR"
echo "├── data/"
echo "└── model/"
echo "    └── $MODEL_FILENAME${NC}"

echo -e "\n${GREEN}You can find your LevChat setup in:${NC}"
echo "$LEVCHAT_DIR"