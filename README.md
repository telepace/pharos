# Pharos - Prompt管理与AI对话工具

Pharos是一个专注于Prompt管理、长文结构化处理和AI场景化应用的工具。它提供了一个直观的界面，让用户可以轻松创建、管理和使用各种场景下的AI提示。

## 功能特点

- **双栏设计**：左侧聊天窗口，右侧Prompt管理面板
- **场景管理**：创建和切换不同的场景（如写作助手、代码调试、学习问答等）
- **Prompt预设**：在每个场景下创建和管理多个Prompt预设
- **模型选择**：为每个Prompt选择不同的LLM模型
- **即时应用**：选中Prompt后，聊天消息会自动附带该Prompt信息
- **本地存储**：使用localStorage保存场景、Prompt和对话历史

## 技术栈

- React + TypeScript
- Ant Design UI组件库
- React Context API进行状态管理
- localStorage进行本地数据存储

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

应用将在 [http://localhost:3000](http://localhost:3000) 运行。

## 使用指南

1. **创建场景**：点击右上角的"添加场景"按钮，创建一个新的场景
2. **添加Prompt**：在场景下点击"添加提示"按钮，填写提示名称、内容和选择LLM模型
3. **选择Prompt**：点击任意Prompt卡片，将其设为活动状态
4. **发送消息**：在左侧聊天窗口输入消息并发送，系统会自动附带选中的Prompt

## 项目结构

```
pharos/
├── src/
│   ├── components/       # UI组件
│   │   ├── Chat/         # 聊天相关组件
│   │   ├── Prompt/       # Prompt管理相关组件
│   │   └── Layout/       # 布局组件
│   ├── contexts/         # React上下文
│   ├── services/         # 服务层
│   ├── types/            # TypeScript类型定义
│   ├── App.tsx           # 应用入口
│   └── index.tsx         # 渲染入口
└── public/               # 静态资源
```

## 未来计划

- 添加联网搜索功能
- 实现长文本结构化处理
- 支持导入/导出Prompt配置
- 添加更多AI模型支持
- 实现云端存储和同步

## 贡献指南

欢迎提交问题和功能请求！如果您想贡献代码，请先创建一个issue讨论您想要更改的内容。

## 许可证

MIT