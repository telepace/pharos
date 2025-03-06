# 定义基础变量
PROJECT_NAME := your-nextjs-app
DOCKER_IMAGE := $(PROJECT_NAME):latest
DOCKER_COMPOSE := docker-compose

# 获取项目根目录
ROOT_DIR := $(shell pwd)
OUTPUT_DIR := $(ROOT_DIR)/_output

# 定义 Docker 相关变量
DOCKER_PORT ?= 3000
DOCKER_NETWORK ?= bridge

.DEFAULT_GOAL := help

# 确保输出目录存在
$(shell mkdir -p $(OUTPUT_DIR))

## 所有主要目标
.PHONY: all
all: install build start

## 安装项目依赖
.PHONY: install
install:
	@echo "===========> Installing dependencies"
	@npm install

## 开发模式启动
.PHONY: dev
dev:
	@echo "===========> Starting development server"
	@npm run dev

## 构建项目
.PHONY: build
build:
	@echo "===========> Building project"
	@npm run build

## 生产模式启动
.PHONY: start
start:
	@echo "===========> Starting production server"
	@npm run start

## 后台启动（使用 pm2）
.PHONY: start-daemon
start-daemon:
	@echo "===========> Starting server in daemon mode"
	@npx pm2 start npm --name "$(PROJECT_NAME)" -- start

## 停止后台服务
.PHONY: stop-daemon
stop-daemon:
	@echo "===========> Stopping daemon server"
	@npx pm2 stop "$(PROJECT_NAME)"

## 重启后台服务
.PHONY: restart-daemon
restart-daemon:
	@echo "===========> Restarting daemon server"
	@npx pm2 restart "$(PROJECT_NAME)"

## 运行测试
.PHONY: test
test:
	@echo "===========> Running tests"
	@npm test

## 运行 lint 检查
.PHONY: lint
lint:
	@echo "===========> Running linter"
	@npm run lint

## 构建 Docker 镜像
.PHONY: docker-build
docker-build:
	@echo "===========> Building Docker image"
	@docker build -t $(DOCKER_IMAGE) .

## 运行 Docker 容器
.PHONY: docker-run
docker-run:
	@echo "===========> Running Docker container"
	@docker run -d -p $(DOCKER_PORT):3000 --name $(PROJECT_NAME) $(DOCKER_IMAGE)

## 停止 Docker 容器
.PHONY: docker-stop
docker-stop:
	@echo "===========> Stopping Docker container"
	@docker stop $(PROJECT_NAME)
	@docker rm $(PROJECT_NAME)

## 清理项目
.PHONY: clean
clean:
	@echo "===========> Cleaning project"
	@rm -rf node_modules
	@rm -rf .next
	@rm -rf $(OUTPUT_DIR)
	@rm -rf coverage
	@echo "===========> Cleaned successfully"

## 显示帮助信息
.PHONY: help
help:
	@echo "\033[1m您可以运行以下命令：\033[0m"
	@echo
	@awk '/^##/ { \
		helpMessage = substr($$0, 3); \
		getline; \
		if ($$0 ~ /^.PHONY/) { \
			target = substr($$0, 8); \
			printf "  \033[36m%-20s\033[0m %s\n", target, helpMessage; \
		} \
	}' $(MAKEFILE_LIST)
	@echo
	@echo "\033[1m示例用法：\033[0m"
	@echo "  make install    # 安装依赖"
	@echo "  make dev       # 开发模式启动"
	@echo "  make build     # 构建项目"
	@echo "  make start     # 生产模式启动"

## 监控状态
.PHONY: status
status:
	@echo "===========> Checking service status"
	@npx pm2 status

## 查看日志
.PHONY: logs
logs:
	@echo "===========> Showing logs"
	@npx pm2 logs $(PROJECT_NAME)

## 安装生产依赖
.PHONY: install-prod
install-prod:
	@echo "===========> Installing production dependencies"
	@npm ci --only=production