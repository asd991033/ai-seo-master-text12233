#!/bin/bash

# 前端構建腳本
echo "Building frontend for production..."

cd frontend

# 安裝依賴
echo "Installing dependencies..."
pnpm install

# 構建生產版本
echo "Building production build..."
pnpm run build

# 複製構建文件到根目錄
echo "Copying build files..."
cp -r dist/* ../

echo "Frontend build completed!"

