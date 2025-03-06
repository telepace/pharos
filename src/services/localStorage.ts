import { Scene, Prompt, Conversation } from '../types';

// 场景存储
export const getScenes = (): Scene[] => {
  const scenes = localStorage.getItem('scenes');
  return scenes ? JSON.parse(scenes) : [];
};

export const saveScenes = (scenes: Scene[]): void => {
  localStorage.setItem('scenes', JSON.stringify(scenes));
};

export const addScene = (scene: Scene): void => {
  const scenes = getScenes();
  saveScenes([...scenes, scene]);
};

export const updateScene = (updatedScene: Scene): void => {
  const scenes = getScenes();
  const updatedScenes = scenes.map(scene => 
    scene.id === updatedScene.id ? updatedScene : scene
  );
  saveScenes(updatedScenes);
};

export const deleteScene = (sceneId: string): void => {
  const scenes = getScenes();
  saveScenes(scenes.filter(scene => scene.id !== sceneId));
  
  // 删除场景时，同时删除该场景下的所有提示
  const prompts = getPrompts();
  savePrompts(prompts.filter(prompt => prompt.sceneId !== sceneId));
};

// 提示存储
export const getPrompts = (): Prompt[] => {
  const prompts = localStorage.getItem('prompts');
  return prompts ? JSON.parse(prompts) : [];
};

export const savePrompts = (prompts: Prompt[]): void => {
  localStorage.setItem('prompts', JSON.stringify(prompts));
};

export const addPrompt = (prompt: Prompt): void => {
  const prompts = getPrompts();
  savePrompts([...prompts, prompt]);
};

export const updatePrompt = (updatedPrompt: Prompt): void => {
  const prompts = getPrompts();
  const updatedPrompts = prompts.map(prompt => 
    prompt.id === updatedPrompt.id ? updatedPrompt : prompt
  );
  savePrompts(updatedPrompts);
};

export const deletePrompt = (promptId: string): void => {
  const prompts = getPrompts();
  savePrompts(prompts.filter(prompt => prompt.id !== promptId));
};

export const getPromptsBySceneId = (sceneId: string): Prompt[] => {
  const prompts = getPrompts();
  return prompts.filter(prompt => prompt.sceneId === sceneId);
};

// 对话存储
export const getConversations = (): Conversation[] => {
  const conversations = localStorage.getItem('conversations');
  return conversations ? JSON.parse(conversations) : [];
};

export const saveConversations = (conversations: Conversation[]): void => {
  localStorage.setItem('conversations', JSON.stringify(conversations));
};

export const getCurrentConversation = (): Conversation | null => {
  const currentConversationId = localStorage.getItem('currentConversationId');
  if (!currentConversationId) return null;
  
  const conversations = getConversations();
  return conversations.find(conv => conv.id === currentConversationId) || null;
};

export const saveCurrentConversation = (conversation: Conversation): void => {
  localStorage.setItem('currentConversationId', conversation.id);
  
  const conversations = getConversations();
  const existingIndex = conversations.findIndex(conv => conv.id === conversation.id);
  
  if (existingIndex >= 0) {
    conversations[existingIndex] = conversation;
  } else {
    conversations.push(conversation);
  }
  
  saveConversations(conversations);
}; 