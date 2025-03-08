# Pharos - Prompt Management and AI Conversation Tool

Pharos is a tool focused on prompt management, long text structuring, and AI scenario-based applications. It provides an intuitive interface for users to easily create, manage, and use AI prompts in various scenarios.

## Features

- **Two-column design**: Chat window on the left, prompt management panel on the right
- **Scenario management**: Create and switch between different scenarios (e.g., writing assistant, code debugging, Q&A, etc.)
- **Prompt presets**: Create and manage multiple prompt presets under each scenario
- **Model selection**: Choose different LLM models for each prompt
- **Instant application**: Selected prompts are automatically appended to chat messages
- **Local storage**: Use localStorage to save scenarios, prompts, and chat history
- **AI Monitoring**: Integrated with Langfuse for comprehensive AI monitoring and analytics

## Tech Stack

- React + TypeScript
- Ant Design UI component library
- React Context API for state management
- localStorage for local data storage

## Getting Started

### Prerequisites

- Node.js (version >= 14)
- npm (version >= 6)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/pharos.git
```

2. Navigate to the project directory:

```bash
cd pharos
```

3. Install dependencies:

```bash
npm install
```

### Development

To start the development server, run:

```bash
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

### Building for Production

To build the project for production, run:

```bash
npm run build
```

The optimized production build will be generated in the `_output` directory.

### Running in Production

To start the application in production mode, run:

```bash
npm start
```

### Docker Deployment

To build and run the application using Docker:

1. Build the Docker image:

```bash
make docker-build
```

2. Run the Docker container:

```bash
make docker-run
```

The application will be accessible at `http://localhost:3000`.

To stop the Docker container, run:

```bash
make docker-stop
```

## Usage Guide

1. **Create a scenario**: Click the "Add Scenario" button in the top-right corner to create a new scenario
2. **Add prompts**: Under the scenario, click the "Add Prompt" button, fill in the prompt name, content, and select the LLM model
3. **Select a prompt**: Click on any prompt card to set it as active
4. **Send messages**: Type and send messages in the left chat window, the system will automatically append the selected prompt

## Project Structure

```
pharos/
├── src/
│   ├── components/       # UI components
│   │   ├── Chat/         # Chat-related components
│   │   ├── Prompt/       # Prompt management components
│   │   └── Layout/       # Layout components
│   ├── contexts/         # React contexts
│   ├── services/         # Service layer
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Application entry point
│   └── index.tsx         # Rendering entry point
└── public/               # Static assets
```

## Future Plans

- Add online search functionality
- Implement long text structuring
- Support importing/exporting prompt configurations
- Add support for more AI models
- Implement cloud storage and synchronization

## Contributing

Issues and feature requests are welcome! If you want to contribute code, please create an issue first to discuss the changes you'd like to make.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## AI Monitoring with Langfuse

Pharos integrates with [Langfuse](https://langfuse.com) to provide comprehensive monitoring and analytics for your AI interactions:

### Monitoring Features

- **Request Tracking**: Monitor all AI requests and responses
- **Token Usage**: Track token consumption across different models
- **User Feedback**: Collect and analyze user feedback on AI responses
- **Error Monitoring**: Identify and troubleshoot issues in real-time
- **Performance Analytics**: Analyze response times and model performance

### Setup Langfuse

1. Sign up for a free account at [Langfuse](https://cloud.langfuse.com)
2. Get your API keys from the Langfuse dashboard
3. Add your Langfuse credentials to the `.env` file:

```
# Langfuse 监控配置
REACT_APP_LANGFUSE_SECRET_KEY='your-secret-key'
REACT_APP_LANGFUSE_PUBLIC_KEY='your-public-key'
REACT_APP_LANGFUSE_HOST='https://cloud.langfuse.com'
```

4. Access the monitoring dashboard from the Settings page in Pharos

### User Feedback Collection

Pharos automatically adds feedback buttons to AI responses, allowing users to:

- Provide thumbs up/down feedback on responses
- Add detailed comments about response quality
- Help improve AI performance over time