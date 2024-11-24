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
EMBED_MODEL_URL="https://huggingface.co/CompendiumLabs/bge-base-en-v1.5-gguf/resolve/main/bge-base-en-v1.5-f32.gguf"
MODEL_FILENAME="Llama-3.2-3B-Instruct-Q6_K.gguf"
EMBED_FILENAME="bge-base-en-v1.5-f32.gguf"

echo -e "\n${GREEN}Downloading model...${NC}"
echo "This may take a while depending on your internet connection..."

if curl -L --progress-bar "$MODEL_URL" -o "$MODEL_DIR/$MODEL_FILENAME"; then
    echo -e "✓ Model downloaded successfully"
else
    echo "Error: Failed to download the model"
    exit 1
fi

echo -e "\n${GREEN}Downloading embedding model...${NC}"
echo "This should download much quicker..."

if curl -L --progress-bar "$EMBED_MODEL_URL" -o "$MODEL_DIR/$EMBED_FILENAME"; then
    echo -e "✓ Embedding model downloaded successfully"
else
    echo "Error: Failed to download the embedding model"
    exit 1
fi

echo -e "\n${GREEN}Setup Complete!${NC}"
echo "Directory structure:"
echo -e "${BLUE}$LEVCHAT_DIR"
echo "├── data/"
echo "└── model/"
echo "    └── $MODEL_FILENAME"
echo "    └── $EMBED_FILENAME"

echo -e "\n${GREEN}You can find your LevChat setup in:${NC}"
echo "$LEVCHAT_DIR"